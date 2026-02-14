import { prisma } from "./db";
import type { User, QuestionAnswer } from "@/generated/prisma/client";

interface UserWithAnswers extends User {
  answers: QuestionAnswer[];
}

/**
 * Blackout Matching Algorithm (Hybrid)
 *
 * 1. Filters eligible users by status, gender preference, and exclusions
 * 2. Scores compatibility based on questionnaire answers
 * 3. Applies history penalty (avoid repeat pairings)
 * 4. Applies freshness bonus (new users get slight priority)
 * 5. Greedy pairing: highest-scoring pairs matched first
 */

// Calculate compatibility score between two users based on questionnaire answers
function calculateCompatibility(
  userA: UserWithAnswers,
  userB: UserWithAnswers,
  weeklySetId: string
): number {
  const answersA = userA.answers.filter((a) => a.weeklySetId === weeklySetId);
  const answersB = userB.answers.filter((a) => a.weeklySetId === weeklySetId);

  if (answersA.length === 0 || answersB.length === 0) return 0;

  let totalScore = 0;
  let questionCount = 0;

  for (const ansA of answersA) {
    const ansB = answersB.find((b) => b.questionId === ansA.questionId);
    if (!ansB) continue;

    const valA = ansA.answer as { value: unknown; type: string };
    const valB = ansB.answer as { value: unknown; type: string };

    questionCount++;

    if (valA.type === "scale" && valB.type === "scale") {
      // Scale (1-5): lower absolute difference = higher score
      const diff = Math.abs(
        Number(valA.value) - Number(valB.value)
      );
      totalScore += (4 - diff) / 4; // Normalize to 0-1
    } else if (
      valA.type === "multiple_choice" &&
      valB.type === "multiple_choice"
    ) {
      // Multiple choice: same answer = 1, different = 0
      totalScore += valA.value === valB.value ? 1 : 0;
    }
    // Short text: not scored algorithmically
  }

  return questionCount > 0 ? totalScore / questionCount : 0;
}

// Check if two users are compatible based on preferences
function arePreferencesCompatible(userA: User, userB: User): boolean {
  const genderMatch = (pref: string | null, gender: string | null) => {
    if (!pref || !gender) return true;
    if (pref === "EVERYONE") return true;
    return pref === gender;
  };

  return (
    genderMatch(userA.preference, userB.gender) &&
    genderMatch(userB.preference, userA.gender)
  );
}

// Calculate distance between two users (simple Haversine)
function calculateDistance(
  lat1: number | null,
  lon1: number | null,
  lat2: number | null,
  lon2: number | null
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0; // No penalty if location unknown

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function runMatchingAlgorithm(
  weekStart: Date,
  weekEnd: Date,
  weeklySetId: string
): Promise<{
  matches: Array<{ userAId: string; userBId: string; score: number }>;
  unmatched: string[];
}> {
  // 1. Get all eligible users with their questionnaire answers
  const eligibleUsers = (await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: "USER",
    },
    include: {
      answers: {
        where: { weeklySetId },
      },
    },
  })) as UserWithAnswers[];

  // 2. Get past match history to penalize repeat pairings
  const pastMatches = await prisma.match.findMany({
    select: { userAId: true, userBId: true },
  });

  const matchHistory = new Set<string>();
  for (const m of pastMatches) {
    matchHistory.add(`${m.userAId}-${m.userBId}`);
    matchHistory.add(`${m.userBId}-${m.userAId}`);
  }

  // 3. Score all possible pairs
  const pairs: Array<{
    userAId: string;
    userBId: string;
    score: number;
  }> = [];

  for (let i = 0; i < eligibleUsers.length; i++) {
    for (let j = i + 1; j < eligibleUsers.length; j++) {
      const userA = eligibleUsers[i];
      const userB = eligibleUsers[j];

      // Check preference compatibility
      if (!arePreferencesCompatible(userA, userB)) continue;

      // Calculate base compatibility from questionnaire
      let score = calculateCompatibility(userA, userB, weeklySetId);

      // History penalty: reduce score for previously matched users
      if (matchHistory.has(`${userA.id}-${userB.id}`)) {
        score *= 0.3; // 70% penalty for repeat matches
      }

      // Freshness bonus: users who joined in the last 7 days get a boost
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (userA.createdAt > sevenDaysAgo) score *= 1.15;
      if (userB.createdAt > sevenDaysAgo) score *= 1.15;

      // Distance penalty (mild): farther = slightly lower score
      const distance = calculateDistance(
        userA.latitude,
        userA.longitude,
        userB.latitude,
        userB.longitude
      );
      if (distance > 100) {
        score *= Math.max(0.5, 1 - distance / 1000);
      }

      pairs.push({ userAId: userA.id, userBId: userB.id, score });
    }
  }

  // 4. Greedy matching: sort by score descending, assign highest-scoring pairs first
  pairs.sort((a, b) => b.score - a.score);

  const matched = new Set<string>();
  const finalMatches: Array<{
    userAId: string;
    userBId: string;
    score: number;
  }> = [];

  for (const pair of pairs) {
    if (matched.has(pair.userAId) || matched.has(pair.userBId)) continue;

    finalMatches.push(pair);
    matched.add(pair.userAId);
    matched.add(pair.userBId);
  }

  // 5. Find unmatched users
  const unmatched = eligibleUsers
    .filter((u) => !matched.has(u.id))
    .map((u) => u.id);

  // 6. Save matches to database
  for (const match of finalMatches) {
    await prisma.match.create({
      data: {
        userAId: match.userAId,
        userBId: match.userBId,
        weekStart,
        weekEnd,
        compatibility: match.score,
        assignedBy: "ALGORITHM",
        status: "ACTIVE",
      },
    });
  }

  return { matches: finalMatches, unmatched };
}

// Cleanup: delete all messages for completed matches (ephemeral chat)
export async function cleanupExpiredChats(): Promise<number> {
  const now = new Date();

  // Find matches that have ended
  const expiredMatches = await prisma.match.findMany({
    where: {
      weekEnd: { lt: now },
      status: "ACTIVE",
    },
  });

  let deletedCount = 0;

  for (const match of expiredMatches) {
    // Delete all messages for this match
    const result = await prisma.message.deleteMany({
      where: { matchId: match.id },
    });
    deletedCount += result.count;

    // Mark match as completed
    await prisma.match.update({
      where: { id: match.id },
      data: { status: "COMPLETED" },
    });
  }

  return deletedCount;
}

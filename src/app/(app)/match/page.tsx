import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MatchView } from "./match-view";

export const dynamic = "force-dynamic";

async function getCurrentMatch(userId: string) {
  const now = new Date();

  const match = await prisma.match.findFirst({
    where: {
      status: "ACTIVE",
      weekStart: { lte: now },
      weekEnd: { gte: now },
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    include: {
      userA: {
        select: {
          id: true,
          name: true,
          dateOfBirth: true,
          photos: true,
          bio: true,
          interests: true,
          location: true,
          gender: true,
        },
      },
      userB: {
        select: {
          id: true,
          name: true,
          dateOfBirth: true,
          photos: true,
          bio: true,
          interests: true,
          location: true,
          gender: true,
        },
      },
    },
  });

  if (!match) return null;

  // Return the other user's data
  const matchedUser =
    match.userAId === userId ? match.userB : match.userA;

  // Calculate age
  const dob = matchedUser.dateOfBirth;
  let age: number | null = null;
  if (dob) {
    const today = new Date();
    age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
  }

  return {
    matchId: match.id,
    user: {
      id: matchedUser.id,
      name: matchedUser.name || "Unknown",
      age,
      photos: matchedUser.photos,
      bio: matchedUser.bio,
      interests: matchedUser.interests,
      location: matchedUser.location,
    },
    compatibility: match.compatibility,
    weekEnd: match.weekEnd.toISOString(),
  };
}

const ICEBREAKERS = [
  "If you could have dinner with anyone, living or dead, who would it be?",
  "What's the most spontaneous thing you've ever done?",
  "What's a hobby you've always wanted to pick up?",
  "If you could travel anywhere tomorrow, where would you go?",
  "What's the best advice you've ever received?",
  "What's your go-to comfort food after a long day?",
  "If you could learn any skill overnight, what would it be?",
  "What's a small thing that makes your day better?",
];

export default async function MatchPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const match = await getCurrentMatch(user.id);

  // Pick a pseudo-random icebreaker based on the day
  const dayIndex = new Date().getDay();
  const icebreaker = ICEBREAKERS[dayIndex % ICEBREAKERS.length];

  return <MatchView match={match} icebreaker={icebreaker} />;
}

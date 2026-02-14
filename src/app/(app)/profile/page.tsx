import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProfileClient } from "./profile-client";

export const dynamic = "force-dynamic";

async function getUserAnswers(userId: string) {
  const now = new Date();

  // Get the current week's question set
  const weeklySet = await prisma.weeklyQuestionSet.findFirst({
    where: {
      weekStart: { lte: now },
      weekEnd: { gte: now },
    },
    include: {
      questions: {
        include: {
          question: true,
        },
        orderBy: { orderIndex: "asc" },
      },
      answers: {
        where: { userId },
        include: {
          question: true,
        },
      },
    },
  });

  if (!weeklySet) return [];

  return weeklySet.answers.map((a) => ({
    questionText: a.question.questionText,
    answer: a.answer as string,
    questionType: a.question.questionType,
  }));
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const answers = await getUserAnswers(user.id);

  const profileData = {
    id: user.id,
    name: user.name || "",
    dateOfBirth: user.dateOfBirth?.toISOString() || null,
    gender: user.gender,
    preference: user.preference,
    bio: user.bio || "",
    location: user.location || "",
    photos: user.photos,
    interests: user.interests,
  };

  return <ProfileClient profile={profileData} answers={answers} />;
}

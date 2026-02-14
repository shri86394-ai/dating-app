"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface OnboardingData {
  name: string;
  dateOfBirth: string;
  gender: string;
  preference: string;
  bio: string;
  interests: string[];
  photos: string[];
  answers: { questionId: string; answer: string }[];
  weeklySetId: string;
}

export async function completeOnboarding(data: OnboardingData) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    if (user.status !== "ONBOARDING") {
      return { success: false, error: "User already onboarded" };
    }

    // Validate age (must be 18+)
    const dob = new Date(data.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      return { success: false, error: "You must be at least 18 years old" };
    }

    // Validate required fields
    if (!data.name.trim()) {
      return { success: false, error: "Name is required" };
    }

    if (!data.gender || !data.preference) {
      return { success: false, error: "Gender and preference are required" };
    }

    // Update user profile
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name.trim(),
        dateOfBirth: dob,
        gender: data.gender as "MALE" | "FEMALE" | "NON_BINARY" | "OTHER",
        preference: data.preference as "MALE" | "FEMALE" | "EVERYONE",
        bio: data.bio.trim() || null,
        interests: data.interests,
        photos: data.photos,
        status: "ACTIVE",
      },
    });

    // Save questionnaire answers if provided
    if (data.weeklySetId && data.answers.length > 0) {
      const answerData = data.answers.map((a) => ({
        userId: user.id,
        questionId: a.questionId,
        weeklySetId: data.weeklySetId,
        answer: a.answer,
      }));

      // Use createMany to batch insert, skip duplicates
      await prisma.questionAnswer.createMany({
        data: answerData,
        skipDuplicates: true,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Onboarding error:", error);
    return { success: false, error: "Failed to complete onboarding" };
  }
}

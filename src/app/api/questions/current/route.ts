import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Get the current week boundaries (Monday 00:00 to Sunday 23:59)
function getCurrentWeekBounds(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { weekStart, weekEnd } = getCurrentWeekBounds();

    // Check if a weekly question set exists for this week
    let weeklySet = await prisma.weeklyQuestionSet.findFirst({
      where: {
        weekStart: { gte: weekStart },
        weekEnd: { lte: new Date(weekEnd.getTime() + 1000) },
      },
      include: {
        questions: {
          include: {
            question: true,
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    // If no set exists, auto-generate one
    if (!weeklySet) {
      // Get all active questions
      const allQuestions = await prisma.questionBank.findMany({
        where: { active: true },
        orderBy: { usageCount: "asc" }, // Prefer less-used questions
      });

      if (allQuestions.length < 10) {
        return NextResponse.json(
          { error: "Not enough questions in the bank. Admin needs to add more." },
          { status: 400 }
        );
      }

      // Select 10 questions with variety
      // Ensure mix: at least 4 multiple choice, 3 scale, 2 short text
      const mcQuestions = allQuestions.filter(
        (q) => q.questionType === "MULTIPLE_CHOICE"
      );
      const scaleQuestions = allQuestions.filter(
        (q) => q.questionType === "SCALE"
      );
      const textQuestions = allQuestions.filter(
        (q) => q.questionType === "SHORT_TEXT"
      );

      const shuffle = <T>(arr: T[]): T[] =>
        [...arr].sort(() => Math.random() - 0.5);

      const selected = [
        ...shuffle(mcQuestions).slice(0, 4),
        ...shuffle(scaleQuestions).slice(0, 4),
        ...shuffle(textQuestions).slice(0, 2),
      ].slice(0, 10);

      // Shuffle the final selection
      const finalSelection = shuffle(selected);

      // Create the weekly set
      weeklySet = await prisma.weeklyQuestionSet.create({
        data: {
          weekStart,
          weekEnd,
          isFinalized: true,
          questions: {
            create: finalSelection.map((q, index) => ({
              questionId: q.id,
              orderIndex: index,
            })),
          },
        },
        include: {
          questions: {
            include: {
              question: true,
            },
            orderBy: { orderIndex: "asc" },
          },
        },
      });

      // Update usage counts
      for (const q of finalSelection) {
        await prisma.questionBank.update({
          where: { id: q.id },
          data: { usageCount: { increment: 1 } },
        });
      }
    }

    // Check if user has already answered this week's questions
    const existingAnswers = await prisma.questionAnswer.findMany({
      where: {
        userId: user.id,
        weeklySetId: weeklySet.id,
      },
    });

    const questions = weeklySet.questions.map((item) => ({
      id: item.question.id,
      questionText: item.question.questionText,
      questionType: item.question.questionType,
      options: item.question.options,
      orderIndex: item.orderIndex,
      existingAnswer: existingAnswers.find(
        (a) => a.questionId === item.question.id
      )?.answer ?? null,
    }));

    return NextResponse.json({
      weeklySetId: weeklySet.id,
      weekStart: weeklySet.weekStart,
      weekEnd: weeklySet.weekEnd,
      questions,
      isCompleted: existingAnswers.length >= 10,
    });
  } catch (error) {
    console.error("Error fetching current questions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

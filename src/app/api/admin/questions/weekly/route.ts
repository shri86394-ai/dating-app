import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function getCurrentWeekBounds(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
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
    await requireAdmin();

    const { weekStart, weekEnd } = getCurrentWeekBounds();

    const weeklySet = await prisma.weeklyQuestionSet.findFirst({
      where: {
        weekStart: { gte: weekStart },
        weekEnd: { lte: new Date(weekEnd.getTime() + 1000) },
      },
      include: {
        questions: {
          include: { question: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return NextResponse.json({
      weeklySet,
      weekStart,
      weekEnd,
    });
  } catch (error) {
    console.error("Error fetching weekly questions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Manually create or auto-generate the weekly question set
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { action, questionIds } = body;

    const { weekStart, weekEnd } = getCurrentWeekBounds();

    let selectedIds: string[];

    if (action === "generate") {
      // Auto-select 10 random active questions, prioritizing least-used
      const activeQuestions = await prisma.questionBank.findMany({
        where: { active: true },
        orderBy: { usageCount: "asc" },
        take: 10,
        select: { id: true },
      });

      if (activeQuestions.length < 10) {
        return NextResponse.json(
          { error: `Not enough active questions. Found ${activeQuestions.length}, need 10.` },
          { status: 400 }
        );
      }

      selectedIds = activeQuestions.map((q) => q.id);
    } else {
      if (!questionIds || !Array.isArray(questionIds) || questionIds.length !== 10) {
        return NextResponse.json(
          { error: "Exactly 10 question IDs are required" },
          { status: 400 }
        );
      }
      selectedIds = questionIds;
    }

    // Delete existing set for this week if any
    const existingSet = await prisma.weeklyQuestionSet.findFirst({
      where: {
        weekStart: { gte: weekStart },
        weekEnd: { lte: new Date(weekEnd.getTime() + 1000) },
      },
    });

    if (existingSet) {
      await prisma.weeklyQuestionSetItem.deleteMany({
        where: { weeklySetId: existingSet.id },
      });
      await prisma.weeklyQuestionSet.delete({
        where: { id: existingSet.id },
      });
    }

    // Create new set
    const weeklySet = await prisma.weeklyQuestionSet.create({
      data: {
        weekStart,
        weekEnd,
        isFinalized: true,
        questions: {
          create: selectedIds.map((qId: string, index: number) => ({
            questionId: qId,
            orderIndex: index,
          })),
        },
      },
      include: {
        questions: {
          include: { question: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    // Increment usage count for selected questions
    await prisma.questionBank.updateMany({
      where: { id: { in: selectedIds } },
      data: { usageCount: { increment: 1 } },
    });

    return NextResponse.json({ weeklySet }, { status: 201 });
  } catch (error) {
    console.error("Error setting weekly questions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

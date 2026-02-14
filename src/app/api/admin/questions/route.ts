import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const questions = await prisma.questionBank.findMany({
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const { questionText, questionType, options } = await req.json();

    if (!questionText || !questionType) {
      return NextResponse.json(
        { error: "questionText and questionType are required" },
        { status: 400 }
      );
    }

    if (
      questionType === "MULTIPLE_CHOICE" &&
      (!options || !Array.isArray(options) || options.length < 2)
    ) {
      return NextResponse.json(
        { error: "Multiple choice questions need at least 2 options" },
        { status: 400 }
      );
    }

    const question = await prisma.questionBank.create({
      data: {
        questionText,
        questionType,
        options: questionType === "MULTIPLE_CHOICE" ? options : null,
        active: true,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

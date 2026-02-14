import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { matchId, reportedId, reason, details, flaggedMessageIds } = body;

    if (!matchId || !reason) {
      return NextResponse.json(
        { error: "matchId and reason are required" },
        { status: 400 }
      );
    }

    // Verify user is part of this match
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [{ userAId: user.id }, { userBId: user.id }],
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Determine who is being reported: use explicit reportedId or infer from match
    const targetId =
      reportedId ||
      (match.userAId === user.id ? match.userBId : match.userAId);

    // Validate the reported user is actually the other person in the match
    if (targetId !== match.userAId && targetId !== match.userBId) {
      return NextResponse.json(
        { error: "Invalid reported user" },
        { status: 400 }
      );
    }

    if (targetId === user.id) {
      return NextResponse.json(
        { error: "You cannot report yourself" },
        { status: 400 }
      );
    }

    // Check rate limit: max 3 reports per user per week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentReports = await prisma.report.count({
      where: {
        reporterId: user.id,
        createdAt: { gt: oneWeekAgo },
      },
    });

    if (recentReports >= 3) {
      return NextResponse.json(
        { error: "You've reached the maximum number of reports for this week" },
        { status: 429 }
      );
    }

    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        reportedId: targetId,
        matchId,
        reason,
        details: details || null,
        flaggedMessages: flaggedMessageIds || [],
        status: "OPEN",
        priority: "NORMAL",
      },
    });

    // Update match status
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "REPORTED" },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Error filing report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

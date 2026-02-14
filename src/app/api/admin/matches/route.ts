import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = req.nextUrl.searchParams;
    const week = searchParams.get("week"); // ISO date string for week start

    // Default to current week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const defaultWeekStart = new Date(now);
    defaultWeekStart.setDate(now.getDate() + diffToMonday);
    defaultWeekStart.setHours(0, 0, 0, 0);

    const weekStart = week ? new Date(week) : defaultWeekStart;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const matches = await prisma.match.findMany({
      where: {
        weekStart: { gte: weekStart },
        weekEnd: { lte: new Date(weekEnd.getTime() + 1000) },
      },
      include: {
        userA: {
          select: { id: true, name: true, photos: true, location: true },
        },
        userB: {
          select: { id: true, name: true, photos: true, location: true },
        },
      },
      orderBy: { compatibility: "desc" },
    });

    // Find unmatched active users for this week
    const matchedUserIds = new Set<string>();
    for (const m of matches) {
      matchedUserIds.add(m.userAId);
      matchedUserIds.add(m.userBId);
    }

    const allActiveUsers = await prisma.user.findMany({
      where: { status: "ACTIVE", role: "USER" },
      select: { id: true, name: true, photos: true, location: true },
    });

    const unmatchedUsers = allActiveUsers.filter(
      (u) => !matchedUserIds.has(u.id)
    );

    return NextResponse.json({
      matches,
      unmatchedUsers,
      weekStart,
      weekEnd,
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Manual match override
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { userAId, userBId, weekStart, weekEnd } = await req.json();

    if (!userAId || !userBId) {
      return NextResponse.json(
        { error: "userAId and userBId are required" },
        { status: 400 }
      );
    }

    // Calculate week boundaries if not provided
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const defaultWeekStart = new Date(now);
    defaultWeekStart.setDate(now.getDate() + diffToMonday);
    defaultWeekStart.setHours(0, 0, 0, 0);
    const defaultWeekEnd = new Date(defaultWeekStart);
    defaultWeekEnd.setDate(defaultWeekStart.getDate() + 6);
    defaultWeekEnd.setHours(23, 59, 59, 999);

    const match = await prisma.match.create({
      data: {
        userAId,
        userBId,
        weekStart: weekStart ? new Date(weekStart) : defaultWeekStart,
        weekEnd: weekEnd ? new Date(weekEnd) : defaultWeekEnd,
        assignedBy: "ADMIN",
        status: "ACTIVE",
        compatibility: 0,
      },
    });

    return NextResponse.json({ match }, { status: 201 });
  } catch (error) {
    console.error("Error creating match override:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

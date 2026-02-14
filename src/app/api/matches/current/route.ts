import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getRandomIcebreakers } from "@/lib/icebreakers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the current active match for this user
    const now = new Date();
    const match = await prisma.match.findFirst({
      where: {
        status: "ACTIVE",
        weekEnd: { gt: now },
        OR: [{ userAId: user.id }, { userBId: user.id }],
      },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            dateOfBirth: true,
            bio: true,
            location: true,
            photos: true,
            interests: true,
            gender: true,
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            dateOfBirth: true,
            bio: true,
            location: true,
            photos: true,
            interests: true,
            gender: true,
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ match: null, icebreakers: [] });
    }

    // Return the partner's profile (not the current user's)
    const partner =
      match.userAId === user.id ? match.userB : match.userA;

    // Calculate age
    const age = partner.dateOfBirth
      ? Math.floor(
          (now.getTime() - partner.dateOfBirth.getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        )
      : null;

    return NextResponse.json({
      match: {
        id: match.id,
        compatibility: match.compatibility,
        weekStart: match.weekStart,
        weekEnd: match.weekEnd,
        partner: {
          ...partner,
          age,
        },
      },
      icebreakers: getRandomIcebreakers(3),
    });
  } catch (error) {
    console.error("Error fetching current match:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

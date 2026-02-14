import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matches = await prisma.match.findMany({
      where: {
        status: "COMPLETED",
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
          },
        },
      },
      orderBy: { weekStart: "desc" },
    });

    const now = new Date();
    const history = matches.map((match) => {
      const partner =
        match.userAId === user.id ? match.userB : match.userA;
      const age = partner.dateOfBirth
        ? Math.floor(
            (now.getTime() - partner.dateOfBirth.getTime()) /
              (365.25 * 24 * 60 * 60 * 1000)
          )
        : null;

      return {
        id: match.id,
        weekStart: match.weekStart,
        weekEnd: match.weekEnd,
        compatibility: match.compatibility,
        partner: {
          ...partner,
          age,
        },
      };
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching match history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

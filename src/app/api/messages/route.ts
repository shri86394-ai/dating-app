import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET: Fetch messages for the current active match
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matchId = req.nextUrl.searchParams.get("matchId");

    if (!matchId) {
      return NextResponse.json(
        { error: "matchId is required" },
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

    const messages = await prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        senderId: true,
        content: true,
        isRead: true,
        isFlagged: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Send a message (fallback for when WebSocket is unavailable)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { matchId, content } = await req.json();

    if (!matchId || !content?.trim()) {
      return NextResponse.json(
        { error: "matchId and content are required" },
        { status: 400 }
      );
    }

    // Verify user is part of this active match
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        status: "ACTIVE",
        OR: [{ userAId: user.id }, { userBId: user.id }],
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: "Active match not found" },
        { status: 404 }
      );
    }

    const message = await prisma.message.create({
      data: {
        matchId,
        senderId: user.id,
        content: content.trim(),
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        answers: {
          include: { question: true, weeklySet: true },
          orderBy: { createdAt: "desc" },
        },
        matchesAsA: {
          include: {
            userB: {
              select: { id: true, name: true, photos: true },
            },
          },
          orderBy: { weekStart: "desc" },
          take: 20,
        },
        matchesAsB: {
          include: {
            userA: {
              select: { id: true, name: true, photos: true },
            },
          },
          orderBy: { weekStart: "desc" },
          take: 20,
        },
        reportsFiled: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        reportsAgainst: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        actionsAgainst: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching user detail:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { action, reason, metadata } = await req.json();

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let newStatus: string;
    let actionType: string;

    switch (action) {
      case "warn":
        actionType = "WARN";
        newStatus = user.status; // Keep current status
        break;
      case "suspend":
        actionType = "SUSPEND";
        newStatus = "SUSPENDED";
        break;
      case "ban":
        actionType = "BAN";
        newStatus = "BANNED";
        break;
      case "reinstate":
        actionType = "REINSTATE";
        newStatus = "ACTIVE";
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: newStatus as any },
    });

    // Create admin action log
    await prisma.adminAction.create({
      data: {
        adminId: admin.id,
        targetUserId: id,
        actionType: actionType as any,
        reason: reason || `User ${action}ed by admin`,
        metadata: metadata || null,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

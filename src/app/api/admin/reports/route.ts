import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ReportStatus } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") as ReportStatus | null;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: { id: true, name: true, photos: true },
          },
          reported: {
            select: { id: true, name: true, photos: true },
          },
          match: {
            include: {
              messages: {
                orderBy: { createdAt: "asc" as const },
                take: 50,
                select: {
                  id: true,
                  senderId: true,
                  content: true,
                  isFlagged: true,
                  createdAt: true,
                },
              },
            },
          },
        },
        orderBy: [{ priority: "desc" as const }, { createdAt: "desc" as const }],
        skip,
        take: limit,
      }),
      prisma.report.count({ where }),
    ]);

    return NextResponse.json({
      reports,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { reportId, status, adminNotes, action, reason } = await req.json();

    if (!reportId) {
      return NextResponse.json(
        { error: "reportId is required" },
        { status: 400 }
      );
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    // Update report
    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        ...(status && { status: status as ReportStatus }),
        ...(adminNotes && { adminNotes }),
        resolvedBy: admin.id,
      },
    });

    // If an action is taken against the reported user
    if (action && ["warn", "suspend", "ban"].includes(action)) {
      let actionType: string;
      let newStatus: string | null = null;

      switch (action) {
        case "warn":
          actionType = "WARN";
          break;
        case "suspend":
          actionType = "SUSPEND";
          newStatus = "SUSPENDED";
          break;
        case "ban":
          actionType = "BAN";
          newStatus = "BANNED";
          break;
        default:
          actionType = "WARN";
      }

      // Update user status if needed
      if (newStatus) {
        await prisma.user.update({
          where: { id: report.reportedId },
          data: { status: newStatus as any },
        });
      }

      // Create admin action
      await prisma.adminAction.create({
        data: {
          adminId: admin.id,
          targetUserId: report.reportedId,
          actionType: actionType as any,
          reason: reason || `Action taken from report ${reportId}`,
        },
      });
    }

    return NextResponse.json({ report: updatedReport });
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

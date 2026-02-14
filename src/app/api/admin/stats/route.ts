import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      newSignups7d,
      newSignups30d,
      activeMatches,
      openReports,
      totalMatches,
      totalBanned,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.user.count({ where: { status: "ACTIVE", role: "USER" } }),
      prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo }, role: "USER" },
      }),
      prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo }, role: "USER" },
      }),
      prisma.match.count({ where: { status: "ACTIVE" } }),
      prisma.report.count({
        where: { status: { in: ["OPEN", "IN_REVIEW"] } },
      }),
      prisma.match.count(),
      prisma.user.count({ where: { status: "BANNED" } }),
    ]);

    // Signups per day for the last 30 days
    const signupsByDay = await prisma.$queryRaw<
      Array<{ date: string; count: bigint }>
    >`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users
      WHERE created_at >= ${thirtyDaysAgo} AND role = 'USER'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Messages per week for the last 4 weeks
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const messagesByWeek = await prisma.$queryRaw<
      Array<{ week: string; count: bigint }>
    >`
      SELECT DATE_TRUNC('week', created_at) as week, COUNT(*) as count
      FROM messages
      WHERE created_at >= ${fourWeeksAgo}
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week ASC
    `;

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        newSignups7d,
        newSignups30d,
        activeMatches,
        openReports,
        totalMatches,
        totalBanned,
      },
      charts: {
        signupsByDay: signupsByDay.map((row) => ({
          date: row.date,
          count: Number(row.count),
        })),
        messagesByWeek: messagesByWeek.map((row) => ({
          week: row.week,
          count: Number(row.count),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

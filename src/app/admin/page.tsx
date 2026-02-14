import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, UserPlus, Heart, AlertTriangle, Activity } from "lucide-react";
import { SignupsChart } from "./charts/signups-chart";
import { MessagesChart } from "./charts/messages-chart";

export const dynamic = "force-dynamic";

async function getStats() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalUsers, activeThisWeek, newSignups, activeMatches, openReports] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          status: "ACTIVE",
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.match.count({
        where: { status: "ACTIVE" },
      }),
      prisma.report.count({
        where: { status: { in: ["OPEN", "IN_REVIEW"] } },
      }),
    ]);

  // Signups over last 30 days grouped by day
  const signupsRaw = await prisma.user.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const signupsByDay: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
    const key = date.toISOString().split("T")[0];
    signupsByDay[key] = 0;
  }
  for (const user of signupsRaw) {
    const key = user.createdAt.toISOString().split("T")[0];
    if (signupsByDay[key] !== undefined) {
      signupsByDay[key]++;
    }
  }
  const signupsData = Object.entries(signupsByDay).map(([date, count]) => ({
    date,
    signups: count,
  }));

  // Messages per week for last 4 weeks
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const messagesRaw = await prisma.message.findMany({
    where: { createdAt: { gte: fourWeeksAgo } },
    select: { createdAt: true },
  });

  const messagesData = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(now.getTime() - (4 - w) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() - (3 - w) * 7 * 24 * 60 * 60 * 1000);
    const count = messagesRaw.filter(
      (m) => m.createdAt >= weekStart && m.createdAt < weekEnd
    ).length;
    messagesData.push({
      week: `Week ${w + 1}`,
      messages: count,
    });
  }

  return {
    totalUsers,
    activeThisWeek,
    newSignups,
    activeMatches,
    openReports,
    signupsData,
    messagesData,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      description: "All registered users",
    },
    {
      title: "Active This Week",
      value: stats.activeThisWeek.toLocaleString(),
      icon: Activity,
      description: "Users active in last 7 days",
    },
    {
      title: "New Signups (7d)",
      value: stats.newSignups.toLocaleString(),
      icon: UserPlus,
      description: "Joined in the last week",
    },
    {
      title: "Active Matches",
      value: stats.activeMatches.toLocaleString(),
      icon: Heart,
      description: "Currently active matches",
    },
    {
      title: "Open Reports",
      value: stats.openReports.toLocaleString(),
      icon: AlertTriangle,
      description: "Awaiting review",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your platform&apos;s key metrics
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Signups Over Time</CardTitle>
            <CardDescription>New user registrations (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <SignupsChart data={stats.signupsData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Messages Per Week</CardTitle>
            <CardDescription>Total messages sent (last 4 weeks)</CardDescription>
          </CardHeader>
          <CardContent>
            <MessagesChart data={stats.messagesData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

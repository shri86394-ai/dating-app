import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { MatchesClient } from "./matches-client";

export const dynamic = "force-dynamic";

function getWeekBounds(date: Date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return { weekStart, weekEnd };
}

async function getData() {
  const { weekStart, weekEnd } = getWeekBounds();

  const [currentMatches, allWeeks, unmatchedUsers] = await Promise.all([
    prisma.match.findMany({
      where: {
        weekStart: { gte: weekStart },
        weekEnd: { lte: weekEnd },
      },
      include: {
        userA: { select: { id: true, name: true, photos: true } },
        userB: { select: { id: true, name: true, photos: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.match.findMany({
      select: { weekStart: true },
      distinct: ["weekStart"],
      orderBy: { weekStart: "desc" },
      take: 20,
    }),
    // Users who are active but have no match this week
    prisma.user.findMany({
      where: {
        status: "ACTIVE",
        AND: [
          {
            matchesAsA: {
              none: {
                weekStart: { gte: weekStart },
                weekEnd: { lte: weekEnd },
              },
            },
          },
          {
            matchesAsB: {
              none: {
                weekStart: { gte: weekStart },
                weekEnd: { lte: weekEnd },
              },
            },
          },
        ],
      },
      select: { id: true, name: true, photos: true },
    }),
  ]);

  return {
    currentMatches: currentMatches.map((m) => ({
      id: m.id,
      userA: m.userA,
      userB: m.userB,
      compatibility: m.compatibility,
      status: m.status,
      assignedBy: m.assignedBy,
      createdAt: m.createdAt.toISOString(),
    })),
    weeks: allWeeks.map((w) => w.weekStart.toISOString()),
    unmatchedUsers,
    currentWeekStart: weekStart.toISOString(),
  };
}

const matchStatusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  REPORTED: "bg-red-100 text-red-800",
  ADMIN_OVERRIDE: "bg-purple-100 text-purple-800",
};

export default async function AdminMatchesPage() {
  const data = await getData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Match Management</h1>
        <p className="text-muted-foreground">
          View and manage weekly matches
        </p>
      </div>

      {/* Current Week Matches */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Week Matches</CardTitle>
              <CardDescription>
                Week of{" "}
                {new Date(data.currentWeekStart).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </CardDescription>
            </div>
            <MatchesClient
              weeks={data.weeks}
              unmatchedUsers={data.unmatchedUsers}
            />
          </div>
        </CardHeader>
        <CardContent>
          {data.currentMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No matches for the current week yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User A</TableHead>
                  <TableHead>User B</TableHead>
                  <TableHead>Compatibility</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.currentMatches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>
                      <Link
                        href={`/admin/users/${match.userA.id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={match.userA.photos[0] || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {match.userA.name?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {match.userA.name || "Unnamed"}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/users/${match.userB.id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={match.userB.photos[0] || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {match.userB.name?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {match.userB.name || "Unnamed"}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {(match.compatibility * 100).toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={matchStatusColors[match.status] || ""}
                      >
                        {match.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {match.assignedBy}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(match.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Unmatched Users */}
      <Card>
        <CardHeader>
          <CardTitle>Unmatched Users This Week</CardTitle>
          <CardDescription>
            {data.unmatchedUsers.length} active users without a match this cycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.unmatchedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              All active users are matched this week.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {data.unmatchedUsers.map((user) => (
                <Link
                  key={user.id}
                  href={`/admin/users/${user.id}`}
                  className="flex items-center gap-2 rounded-lg border p-2 pr-4 transition-colors hover:bg-accent"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photos[0] || undefined} />
                    <AvatarFallback className="text-xs">
                      {user.name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {user.name || "Unnamed"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

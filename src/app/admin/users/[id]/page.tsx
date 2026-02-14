import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, MapPin, Calendar, Phone } from "lucide-react";
import Link from "next/link";
import { UserActions } from "./user-actions";

export const dynamic = "force-dynamic";

async function getUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      answers: {
        include: {
          question: true,
          weeklySet: true,
        },
        orderBy: { createdAt: "desc" },
      },
      matchesAsA: {
        include: {
          userB: { select: { id: true, name: true, photos: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      matchesAsB: {
        include: {
          userA: { select: { id: true, name: true, photos: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      reportsFiled: {
        include: {
          reported: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      reportsAgainst: {
        include: {
          reporter: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      actionsAgainst: {
        include: {
          admin: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return user;
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  ONBOARDING: "bg-blue-100 text-blue-800",
  SUSPENDED: "bg-yellow-100 text-yellow-800",
  BANNED: "bg-red-100 text-red-800",
};

const matchStatusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  REPORTED: "bg-red-100 text-red-800",
  ADMIN_OVERRIDE: "bg-purple-100 text-purple-800",
};

const reportStatusColors: Record<string, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  IN_REVIEW: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-emerald-100 text-emerald-800",
  DISMISSED: "bg-gray-100 text-gray-800",
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser(id);

  if (!user) {
    notFound();
  }

  // Combine matches from both sides
  const allMatches = [
    ...user.matchesAsA.map((m) => ({
      id: m.id,
      partner: m.userB,
      compatibility: m.compatibility,
      status: m.status,
      assignedBy: m.assignedBy,
      weekStart: m.weekStart,
      createdAt: m.createdAt,
    })),
    ...user.matchesAsB.map((m) => ({
      id: m.id,
      partner: m.userA,
      compatibility: m.compatibility,
      status: m.status,
      assignedBy: m.assignedBy,
      weekStart: m.weekStart,
      createdAt: m.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {user.name || "Unnamed User"}
          </h1>
          <p className="text-muted-foreground">User Profile Detail</p>
        </div>
        <UserActions userId={user.id} currentStatus={user.status} />
      </div>

      {/* Profile Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Info */}
        <Card className="lg:col-span-1">
          <CardHeader className="items-center text-center">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={user.photos[0] || undefined}
                alt={user.name || "User"}
              />
              <AvatarFallback className="text-2xl">
                {user.name
                  ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
                  : "?"}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="mt-2">{user.name || "Unnamed"}</CardTitle>
            <Badge
              variant="secondary"
              className={statusColors[user.status] || ""}
            >
              {user.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{user.phone}</span>
            </div>
            {user.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{user.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <Separator />
            {user.bio && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Bio</p>
                <p className="text-sm">{user.bio}</p>
              </div>
            )}
            {user.interests.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Interests</p>
                <div className="flex flex-wrap gap-1">
                  {user.interests.map((interest) => (
                    <Badge key={interest} variant="outline" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {user.gender && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Gender</p>
                <p className="text-sm capitalize">{user.gender.toLowerCase().replace("_", " ")}</p>
              </div>
            )}
            {user.preference && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Looking For</p>
                <p className="text-sm capitalize">{user.preference.toLowerCase()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Photos & Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Photos */}
          {user.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {user.photos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="aspect-square overflow-hidden rounded-lg border bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo}
                        alt={`Photo ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Questionnaire Answers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Questionnaire Answers</CardTitle>
              <CardDescription>
                {user.answers.length} total answers across all weeks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.answers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No answers yet.</p>
              ) : (
                <div className="space-y-3">
                  {user.answers.slice(0, 20).map((answer) => (
                    <div key={answer.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{answer.question.questionText}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {typeof answer.answer === "string"
                          ? answer.answer
                          : JSON.stringify(answer.answer)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Week of {new Date(answer.weeklySet.weekStart).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Match History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Match History</CardTitle>
              <CardDescription>{allMatches.length} total matches</CardDescription>
            </CardHeader>
            <CardContent>
              {allMatches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matches yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead>Compatibility</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned By</TableHead>
                      <TableHead>Week</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allMatches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell>
                          <Link
                            href={`/admin/users/${match.partner.id}`}
                            className="flex items-center gap-2 hover:underline"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={match.partner.photos[0] || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {match.partner.name?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{match.partner.name || "Unnamed"}</span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {(match.compatibility * 100).toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={matchStatusColors[match.status] || ""}>
                            {match.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {match.assignedBy}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(match.weekStart).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Reports */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reports Filed</CardTitle>
                <CardDescription>{user.reportsFiled.length} reports</CardDescription>
              </CardHeader>
              <CardContent>
                {user.reportsFiled.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None</p>
                ) : (
                  <div className="space-y-2">
                    {user.reportsFiled.map((report) => (
                      <div key={report.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            vs {report.reported.name || "Unnamed"}
                          </span>
                          <Badge variant="secondary" className={reportStatusColors[report.status] || ""}>
                            {report.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{report.reason}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reports Against</CardTitle>
                <CardDescription>{user.reportsAgainst.length} reports</CardDescription>
              </CardHeader>
              <CardContent>
                {user.reportsAgainst.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None</p>
                ) : (
                  <div className="space-y-2">
                    {user.reportsAgainst.map((report) => (
                      <div key={report.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            by {report.reporter.name || "Unnamed"}
                          </span>
                          <Badge variant="secondary" className={reportStatusColors[report.status] || ""}>
                            {report.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{report.reason}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Admin Actions History */}
          {user.actionsAgainst.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Admin Action History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {user.actionsAgainst.map((action) => (
                    <div key={action.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{action.actionType}</p>
                        <p className="text-xs text-muted-foreground">{action.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          by {action.admin.name || "Admin"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(action.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

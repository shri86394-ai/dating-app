import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

async function getPastMatches(userId: string) {
  const matches = await prisma.match.findMany({
    where: {
      status: "COMPLETED",
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    include: {
      userA: {
        select: {
          id: true,
          name: true,
          dateOfBirth: true,
          photos: true,
          bio: true,
        },
      },
      userB: {
        select: {
          id: true,
          name: true,
          dateOfBirth: true,
          photos: true,
          bio: true,
        },
      },
    },
    orderBy: { weekStart: "desc" },
  });

  return matches.map((match) => {
    const matchedUser =
      match.userAId === userId ? match.userB : match.userA;

    let age: number | null = null;
    if (matchedUser.dateOfBirth) {
      const today = new Date();
      age = today.getFullYear() - matchedUser.dateOfBirth.getFullYear();
      const m = today.getMonth() - matchedUser.dateOfBirth.getMonth();
      if (
        m < 0 ||
        (m === 0 && today.getDate() < matchedUser.dateOfBirth.getDate())
      ) {
        age--;
      }
    }

    return {
      id: match.id,
      name: matchedUser.name || "Unknown",
      age,
      photo: matchedUser.photos[0] || null,
      bio: matchedUser.bio,
      weekStart: match.weekStart.toISOString(),
      weekEnd: match.weekEnd.toISOString(),
    };
  });
}

function formatWeekRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}, ${endDate.getFullYear()}`;
}

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const pastMatches = await getPastMatches(user.id);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Past Matches</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          People you&apos;ve been matched with
        </p>
      </div>

      {pastMatches.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Clock className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No past matches yet</h3>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            Your match history will appear here after your first weekly cycle
            completes
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pastMatches.map((match) => {
            const initials = match.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase();

            return (
              <Card key={match.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Avatar className="h-16 w-16 shrink-0 rounded-lg">
                      <AvatarImage
                        src={match.photo || undefined}
                        alt={match.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="rounded-lg text-lg">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {match.name}
                        </h3>
                        {match.age && (
                          <span className="text-sm text-muted-foreground shrink-0">
                            {match.age}
                          </span>
                        )}
                      </div>

                      {match.bio && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {match.bio}
                        </p>
                      )}

                      <Separator className="my-2" />

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {formatWeekRange(match.weekStart, match.weekEnd)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

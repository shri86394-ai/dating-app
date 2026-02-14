"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageCircle,
  Flag,
  MapPin,
  Sparkles,
  Heart,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface MatchData {
  matchId: string;
  user: {
    id: string;
    name: string;
    age: number | null;
    photos: string[];
    bio: string | null;
    interests: string[];
    location: string | null;
  };
  compatibility: number;
  weekEnd: string;
}

interface MatchViewProps {
  match: MatchData | null;
  icebreaker: string;
}

export function MatchView({ match, icebreaker }: MatchViewProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  async function handleReport() {
    if (!match || !reportReason) return;

    setReportLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedId: match.user.id,
          matchId: match.matchId,
          reason: reportReason,
          details: reportDetails,
        }),
      });

      if (res.ok) {
        toast.success("Report submitted. We'll review it shortly.");
        setReportOpen(false);
        setReportReason("");
        setReportDetails("");
      } else {
        toast.error("Failed to submit report");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setReportLoading(false);
    }
  }

  // Empty state
  if (!match) {
    return (
      <div className="flex min-h-[80dvh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <Heart className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">No match this week</h2>
        <p className="mt-2 max-w-xs text-muted-foreground">
          Sit tight! New matches are assigned every Monday at midnight. Make sure
          your questionnaire is up to date.
        </p>
      </div>
    );
  }

  const { user: matchedUser } = match;
  const heroPhoto = matchedUser.photos[0];
  const initials = matchedUser.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-lg">
      {/* Hero photo */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        {heroPhoto ? (
          <img
            src={heroPhoto}
            alt={matchedUser.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Avatar className="h-32 w-32">
              <AvatarImage src={heroPhoto} />
              <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-6 pt-20">
          <h1 className="text-3xl font-bold text-white">
            {matchedUser.name}
            {matchedUser.age && (
              <span className="ml-2 text-2xl font-normal opacity-80">
                {matchedUser.age}
              </span>
            )}
          </h1>
          {matchedUser.location && (
            <div className="mt-1 flex items-center gap-1 text-white/80">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{matchedUser.location}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 px-4 py-6">
        {/* Bio */}
        {matchedUser.bio && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                About
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{matchedUser.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Interests */}
        {matchedUser.interests.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Interests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {matchedUser.interests.map((interest) => (
                  <Badge key={interest} variant="secondary">
                    {interest}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Icebreaker */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Icebreaker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{icebreaker}</p>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button asChild className="flex-1" size="lg">
            <Link href="/chat">
              <MessageCircle className="mr-2 h-5 w-5" />
              Start Chatting
            </Link>
          </Button>

          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg">
                <Flag className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report {matchedUser.name}</DialogTitle>
                <DialogDescription>
                  If this person is making you uncomfortable or violating
                  community guidelines, let us know. All reports are reviewed by
                  our team.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Select value={reportReason} onValueChange={setReportReason}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inappropriate">
                        Inappropriate behavior
                      </SelectItem>
                      <SelectItem value="harassment">Harassment</SelectItem>
                      <SelectItem value="fake_profile">
                        Fake profile
                      </SelectItem>
                      <SelectItem value="spam">Spam</SelectItem>
                      <SelectItem value="offensive">
                        Offensive content
                      </SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Additional details (optional)</Label>
                  <Textarea
                    placeholder="Tell us more about what happened..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setReportOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReport}
                  disabled={!reportReason || reportLoading}
                >
                  {reportLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Report"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

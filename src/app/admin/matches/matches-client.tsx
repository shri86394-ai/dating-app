"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shuffle } from "lucide-react";
import { toast } from "sonner";

interface UnmatchedUser {
  id: string;
  name: string | null;
  photos: string[];
}

export function MatchesClient({
  weeks,
  unmatchedUsers,
}: {
  weeks: string[];
  unmatchedUsers: UnmatchedUser[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userAId, setUserAId] = useState("");
  const [userBId, setUserBId] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleOverride() {
    if (!userAId || !userBId) {
      toast.error("Please select both users");
      return;
    }
    if (userAId === userBId) {
      toast.error("Cannot match a user with themselves");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAId, userBId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create match");
      }
      toast.success("Manual match created successfully");
      setDialogOpen(false);
      setUserAId("");
      setUserBId("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create match");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Week Selector */}
      {weeks.length > 1 && (
        <Select
          onValueChange={(val) => {
            // For now, just log it; could implement week-based filtering later
            toast.info(`Selected week: ${new Date(val).toLocaleDateString()}`);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Past weeks" />
          </SelectTrigger>
          <SelectContent>
            {weeks.map((week) => (
              <SelectItem key={week} value={week}>
                Week of {new Date(week).toLocaleDateString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Override Button */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Shuffle className="h-4 w-4" />
            Override Match
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Manual Match</DialogTitle>
            <DialogDescription>
              Manually assign a match between two users for the current week.
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>User A</Label>
              <Select value={userAId} onValueChange={setUserAId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first user" />
                </SelectTrigger>
                <SelectContent>
                  {unmatchedUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || "Unnamed"} ({u.id.slice(0, 8)}...)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>User B</Label>
              <Select value={userBId} onValueChange={setUserBId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second user" />
                </SelectTrigger>
                <SelectContent>
                  {unmatchedUsers
                    .filter((u) => u.id !== userAId)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || "Unnamed"} ({u.id.slice(0, 8)}...)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleOverride} disabled={creating}>
                {creating ? "Creating..." : "Create Match"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

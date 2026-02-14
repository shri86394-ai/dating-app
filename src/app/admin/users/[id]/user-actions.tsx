"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldOff, Ban, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function UserActions({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: string;
}) {
  const router = useRouter();

  async function handleAction(action: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: `Admin ${action} from user detail page`,
        }),
      });
      if (!res.ok) throw new Error("Action failed");
      toast.success(`User ${action.toLowerCase()} successfully`);
      router.refresh();
    } catch {
      toast.error(`Failed to ${action.toLowerCase()} user`);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {currentStatus === "SUSPENDED" || currentStatus === "BANNED" ? (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => handleAction("reinstate")}
        >
          <ShieldCheck className="h-4 w-4" />
          Reinstate
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleAction("warn")}
          >
            <AlertTriangle className="h-4 w-4" />
            Warn
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleAction("suspend")}
          >
            <ShieldOff className="h-4 w-4" />
            Suspend
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => handleAction("ban")}
          >
            <Ban className="h-4 w-4" />
            Ban
          </Button>
        </>
      )}
    </div>
  );
}

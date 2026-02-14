"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  ShieldOff,
  Ban,
  XCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

interface Report {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  priority: string;
  adminNotes: string | null;
  flaggedMessages: string[];
  createdAt: string;
  reporter: {
    id: string;
    name: string | null;
    photos: string[];
  };
  reported: {
    id: string;
    name: string | null;
    photos: string[];
  };
  match: {
    id: string;
    messages: {
      id: string;
      senderId: string;
      content: string;
      isFlagged: boolean;
      createdAt: string;
    }[];
  };
}

const statusColors: Record<string, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  IN_REVIEW: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-emerald-100 text-emerald-800",
  DISMISSED: "bg-gray-100 text-gray-800",
};

const priorityColors: Record<string, string> = {
  NORMAL: "bg-gray-100 text-gray-700",
  HIGH: "bg-red-100 text-red-700",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogReport, setDialogReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/reports?${params}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      setReports(data.reports);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function handleAction(reportId: string, newStatus: string) {
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          status: newStatus,
          adminNotes: adminNotes || undefined,
        }),
      });
      if (!res.ok) throw new Error("Action failed");
      toast.success(`Report ${newStatus.toLowerCase()} successfully`);
      setDialogReport(null);
      setAdminNotes("");
      fetchReports();
    } catch {
      toast.error(`Failed to update report`);
    }
  }

  async function handleUserAction(userId: string, action: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action.toLowerCase(),
          reason: `Action from report moderation`,
        }),
      });
      if (!res.ok) throw new Error("Action failed");
      toast.success(`User ${action.toLowerCase()} successfully`);
    } catch {
      toast.error(`Failed to ${action.toLowerCase()} user`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Moderation</h1>
        <p className="text-muted-foreground">
          Review and manage user reports
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_REVIEW">In Review</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="DISMISSED">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]" />
              <TableHead>Reporter</TableHead>
              <TableHead>Reported User</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="text-muted-foreground">Loading reports...</div>
                </TableCell>
              </TableRow>
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="text-muted-foreground">No reports found</div>
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <>
                  <TableRow
                    key={report.id}
                    className="cursor-pointer"
                    onClick={() =>
                      setExpandedId(expandedId === report.id ? null : report.id)
                    }
                  >
                    <TableCell>
                      {expandedId === report.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/users/${report.reporter.id}`}
                        className="flex items-center gap-2 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={report.reporter.photos[0] || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {report.reporter.name?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {report.reporter.name || "Unnamed"}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/users/${report.reported.id}`}
                        className="flex items-center gap-2 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={report.reported.photos[0] || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {report.reported.name?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {report.reported.name || "Unnamed"}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm line-clamp-1">{report.reason}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={priorityColors[report.priority] || ""}
                      >
                        {report.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColors[report.status] || ""}
                      >
                        {report.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleAction(report.id, "DISMISSED")}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Dismiss
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            handleUserAction(report.reported.id, "warn")
                          }
                        >
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Warn
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            handleUserAction(report.reported.id, "suspend")
                          }
                        >
                          <ShieldOff className="mr-1 h-3 w-3" />
                          Suspend
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive"
                          onClick={() =>
                            handleUserAction(report.reported.id, "ban")
                          }
                        >
                          <Ban className="mr-1 h-3 w-3" />
                          Ban
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Detail Row */}
                  {expandedId === report.id && (
                    <TableRow key={`${report.id}-detail`}>
                      <TableCell colSpan={8} className="bg-muted/30 p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Report Details */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold">Report Details</h4>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Reason</p>
                              <p className="text-sm">{report.reason}</p>
                            </div>
                            {report.details && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">
                                  Additional Details
                                </p>
                                <p className="text-sm">{report.details}</p>
                              </div>
                            )}
                            {report.adminNotes && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">
                                  Admin Notes
                                </p>
                                <p className="text-sm">{report.adminNotes}</p>
                              </div>
                            )}
                            <div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => {
                                  setDialogReport(report);
                                  setAdminNotes(report.adminNotes || "");
                                }}
                              >
                                <MessageSquare className="h-3 w-3" />
                                Add Notes
                              </Button>
                            </div>
                          </div>

                          {/* Chat Transcript */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold">Chat Transcript</h4>
                            {report.match.messages.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No messages in this match.
                              </p>
                            ) : (
                              <ScrollArea className="h-[250px] rounded-lg border p-3">
                                <div className="space-y-2">
                                  {report.match.messages.map((msg) => (
                                    <div
                                      key={msg.id}
                                      className={`rounded-lg p-2 text-sm ${
                                        msg.isFlagged
                                          ? "border border-red-200 bg-red-50"
                                          : "bg-muted/50"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium">
                                          {msg.senderId === report.reporter.id
                                            ? report.reporter.name || "Reporter"
                                            : report.reported.name || "Reported"}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                          {new Date(msg.createdAt).toLocaleString()}
                                        </span>
                                      </div>
                                      <p className="mt-1">{msg.content}</p>
                                      {msg.isFlagged && (
                                        <Badge
                                          variant="destructive"
                                          className="mt-1 text-[10px]"
                                        >
                                          Flagged
                                        </Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Admin Notes Dialog */}
      <Dialog
        open={dialogReport !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogReport(null);
            setAdminNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Notes</DialogTitle>
            <DialogDescription>
              Add notes to report by{" "}
              {dialogReport?.reporter.name || "Unnamed"} against{" "}
              {dialogReport?.reported.name || "Unnamed"}
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <div className="space-y-4">
            <Textarea
              placeholder="Enter admin notes..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogReport(null);
                  setAdminNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (dialogReport) {
                    handleAction(dialogReport.id, "IN_REVIEW");
                  }
                }}
              >
                Save & Mark In Review
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  if (dialogReport) {
                    handleAction(dialogReport.id, "RESOLVED");
                  }
                }}
              >
                Save & Resolve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

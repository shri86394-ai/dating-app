"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  options: string[] | null;
  active: boolean;
  usageCount: number;
  createdAt: string;
}

interface WeeklySetItem {
  id: string;
  orderIndex: number;
  question: Question;
}

interface WeeklySet {
  id: string;
  weekStart: string;
  weekEnd: string;
  isFinalized: boolean;
  questions: WeeklySetItem[];
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [weeklySet, setWeeklySet] = useState<WeeklySet | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New question form
  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState("SHORT_TEXT");
  const [newOptions, setNewOptions] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/questions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setQuestions(data.questions);
    } catch {
      toast.error("Failed to load questions");
    }
  }, []);

  const fetchWeeklySet = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/questions/weekly");
      if (!res.ok) {
        if (res.status === 404) {
          setWeeklySet(null);
          return;
        }
        throw new Error("Failed to fetch");
      }
      const data = await res.json();
      setWeeklySet(data.weeklySet);
    } catch {
      toast.error("Failed to load weekly set");
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchQuestions(), fetchWeeklySet()]).finally(() =>
      setLoading(false)
    );
  }, [fetchQuestions, fetchWeeklySet]);

  async function handleCreate() {
    if (!newText.trim()) {
      toast.error("Question text is required");
      return;
    }
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        questionText: newText.trim(),
        questionType: newType,
      };
      if (newType === "MULTIPLE_CHOICE" && newOptions.trim()) {
        body.options = newOptions
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean);
      }
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create");
      toast.success("Question created");
      setDialogOpen(false);
      setNewText("");
      setNewType("SHORT_TEXT");
      setNewOptions("");
      fetchQuestions();
    } catch {
      toast.error("Failed to create question");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(active ? "Question activated" : "Question deactivated");
      fetchQuestions();
    } catch {
      toast.error("Failed to update question");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Question deactivated");
      fetchQuestions();
    } catch {
      toast.error("Failed to delete question");
    }
  }

  async function generateWeeklySet() {
    try {
      const res = await fetch("/api/admin/questions/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      toast.success("Weekly question set generated");
      fetchWeeklySet();
    } catch {
      toast.error("Failed to generate weekly set");
    }
  }

  const typeLabels: Record<string, string> = {
    MULTIPLE_CHOICE: "Multiple Choice",
    SCALE: "Scale",
    SHORT_TEXT: "Short Text",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading questions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>
          <p className="text-muted-foreground">
            Manage questions and weekly sets
          </p>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Questions</TabsTrigger>
          <TabsTrigger value="weekly">This Week&apos;s Set</TabsTrigger>
        </TabsList>

        {/* All Questions Tab */}
        <TabsContent value="all" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Question
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Question</DialogTitle>
                  <DialogDescription>
                    Create a new question for the question bank.
                  </DialogDescription>
                </DialogHeader>
                <Separator />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question Text</Label>
                    <Textarea
                      placeholder="Enter your question..."
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Question Type</Label>
                    <Select value={newType} onValueChange={setNewType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SHORT_TEXT">Short Text</SelectItem>
                        <SelectItem value="MULTIPLE_CHOICE">
                          Multiple Choice
                        </SelectItem>
                        <SelectItem value="SCALE">Scale (1-10)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newType === "MULTIPLE_CHOICE" && (
                    <div className="space-y-2">
                      <Label>Options (one per line)</Label>
                      <Textarea
                        placeholder={"Option 1\nOption 2\nOption 3"}
                        value={newOptions}
                        onChange={(e) => setNewOptions(e.target.value)}
                        rows={4}
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={creating}>
                      {creating ? "Creating..." : "Create Question"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[400px]">Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="text-muted-foreground">
                        No questions in the bank yet.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  questions.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell>
                        <p className="text-sm font-medium line-clamp-2">
                          {q.questionText}
                        </p>
                        {q.options && Array.isArray(q.options) && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(q.options as string[]).map((opt, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-[10px]"
                              >
                                {opt}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {typeLabels[q.questionType] || q.questionType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={q.active}
                            onCheckedChange={(checked) =>
                              toggleActive(q.id, checked)
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {q.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {q.usageCount} times
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(q.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Weekly Set Tab */}
        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>This Week&apos;s Question Set</CardTitle>
                  <CardDescription>
                    {weeklySet
                      ? `${weeklySet.questions.length} questions selected for week of ${new Date(
                          weeklySet.weekStart
                        ).toLocaleDateString()}`
                      : "No set generated for this week yet"}
                  </CardDescription>
                </div>
                <Button onClick={generateWeeklySet} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {weeklySet ? "Regenerate Set" : "Generate Set"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!weeklySet || weeklySet.questions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No questions in this week&apos;s set. Click &quot;Generate
                    Set&quot; to auto-select questions.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {weeklySet.questions
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {idx + 1}
                        </div>
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {item.question.questionText}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {typeLabels[item.question.questionType] ||
                                item.question.questionType}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              Used {item.question.usageCount} times
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {weeklySet && (
                <div className="mt-4 flex items-center gap-2">
                  <Badge
                    variant={weeklySet.isFinalized ? "default" : "secondary"}
                  >
                    {weeklySet.isFinalized ? "Finalized" : "Draft"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Week: {new Date(weeklySet.weekStart).toLocaleDateString()} -{" "}
                    {new Date(weeklySet.weekEnd).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

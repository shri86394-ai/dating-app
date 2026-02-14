"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { completeOnboarding } from "./actions";

const INTERESTS = [
  "Hiking",
  "Cooking",
  "Music",
  "Travel",
  "Fitness",
  "Reading",
  "Gaming",
  "Photography",
  "Art",
  "Dancing",
  "Movies",
  "Tech",
  "Fashion",
  "Nature",
  "Food",
  "Sports",
];

interface Question {
  id: string;
  questionText: string;
  questionType: "MULTIPLE_CHOICE" | "SCALE" | "SHORT_TEXT";
  options: string[] | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Basic info
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [preference, setPreference] = useState("");

  // Step 2: Photo & bio
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  // Step 3: Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Step 4: Questionnaire
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [weeklySetId, setWeeklySetId] = useState<string>("");

  // Fetch questions when reaching step 4
  useEffect(() => {
    if (step === 4 && questions.length === 0) {
      fetchQuestions();
    }
  }, [step, questions.length]);

  async function fetchQuestions() {
    try {
      const res = await fetch("/api/questions/current");
      const data = await res.json();
      if (res.ok) {
        setQuestions(data.questions || []);
        setWeeklySetId(data.weeklySetId || "");
      } else {
        toast.error("Failed to load questions");
      }
    } catch {
      toast.error("Failed to load questions");
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 6) {
      toast.error("Maximum 6 photos allowed");
      return;
    }
    setPhotos((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreview((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreview((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleInterest(interest: string) {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  }

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return !!(name.trim() && dateOfBirth && gender && preference);
      case 2:
        return bio.trim().length > 0;
      case 3:
        return selectedInterests.length >= 3;
      case 4:
        return questions.length > 0 && questions.every((q) => answers[q.id]);
      default:
        return false;
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const result = await completeOnboarding({
        name: name.trim(),
        dateOfBirth,
        gender,
        preference,
        bio: bio.trim(),
        interests: selectedInterests,
        photos: [], // Photo upload to cloud would go here
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
        weeklySetId,
      });

      if (result.success) {
        toast.success("Profile created! Welcome to Blackout.");
        router.push("/match");
      } else {
        toast.error(result.error || "Failed to complete onboarding");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-dvh bg-background">
      {/* Progress bar */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {step} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-primary">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Let&apos;s get started</h2>
              <p className="mt-1 text-muted-foreground">
                Tell us a little about yourself
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">First Name</Label>
                <Input
                  id="name"
                  placeholder="Your first name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={
                    new Date(
                      new Date().setFullYear(new Date().getFullYear() - 18)
                    )
                      .toISOString()
                      .split("T")[0]
                  }
                />
                <p className="text-xs text-muted-foreground">
                  You must be 18 or older to use Blackout
                </p>
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="NON_BINARY">Non-binary</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>I&apos;m interested in</Label>
                <Select value={preference} onValueChange={setPreference}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Men</SelectItem>
                    <SelectItem value="FEMALE">Women</SelectItem>
                    <SelectItem value="EVERYONE">Everyone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Photos & Bio */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Show yourself off</h2>
              <p className="mt-1 text-muted-foreground">
                Add photos and write a short bio
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Photos (up to 6)</Label>
                <div className="grid grid-cols-3 gap-3">
                  {photoPreview.map((src, i) => (
                    <div
                      key={i}
                      className="relative aspect-square rounded-lg overflow-hidden border bg-muted"
                    >
                      <img
                        src={src}
                        alt={`Photo ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-xs hover:bg-black/80"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  {photoPreview.length < 6 && (
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 hover:border-primary/50 hover:bg-muted transition-colors">
                      <Camera className="h-6 w-6 text-muted-foreground" />
                      <span className="mt-1 text-xs text-muted-foreground">
                        Add
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Write something interesting about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 500))}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {bio.length}/500
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Interests */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">What are you into?</h2>
              <p className="mt-1 text-muted-foreground">
                Select at least 3 interests to help us find your match
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <Badge
                    key={interest}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer select-none px-4 py-2 text-sm transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "hover:border-primary/50 hover:text-primary"
                    }`}
                    onClick={() => toggleInterest(interest)}
                  >
                    {isSelected && <Check className="mr-1 h-3 w-3" />}
                    {interest}
                  </Badge>
                );
              })}
            </div>

            <p className="text-sm text-muted-foreground">
              {selectedInterests.length} selected
              {selectedInterests.length < 3 && (
                <span className="text-destructive">
                  {" "}
                  &mdash; pick at least {3 - selectedInterests.length} more
                </span>
              )}
            </p>
          </div>
        )}

        {/* Step 4: Questionnaire */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold">Weekly Questions</h2>
              </div>
              <p className="mt-1 text-muted-foreground">
                Your answers help us find the perfect match for you
              </p>
            </div>

            {questions.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">
                  Loading questions...
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100dvh-320px)]">
                <div className="space-y-6 pr-4">
                  {questions.map((q, idx) => (
                    <Card key={q.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium">
                          <span className="mr-2 text-primary">
                            {idx + 1}.
                          </span>
                          {q.questionText}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {q.questionType === "MULTIPLE_CHOICE" &&
                          q.options && (
                            <div className="space-y-2">
                              {(q.options as string[]).map((option) => (
                                <button
                                  key={option}
                                  onClick={() =>
                                    setAnswers((prev) => ({
                                      ...prev,
                                      [q.id]: option,
                                    }))
                                  }
                                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                                    answers[q.id] === option
                                      ? "border-primary bg-primary/10 text-primary font-medium"
                                      : "border-border hover:border-primary/30 hover:bg-muted"
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          )}

                        {q.questionType === "SCALE" && (
                          <div className="space-y-3">
                            <div className="flex justify-between gap-2">
                              {[1, 2, 3, 4, 5].map((val) => (
                                <button
                                  key={val}
                                  onClick={() =>
                                    setAnswers((prev) => ({
                                      ...prev,
                                      [q.id]: String(val),
                                    }))
                                  }
                                  className={`flex h-12 w-12 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                                    answers[q.id] === String(val)
                                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                                      : "border-border hover:border-primary/30 hover:bg-muted"
                                  }`}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Not at all</span>
                              <span>Extremely</span>
                            </div>
                          </div>
                        )}

                        {q.questionType === "SHORT_TEXT" && (
                          <Textarea
                            placeholder="Type your answer..."
                            value={answers[q.id] || ""}
                            onChange={(e) =>
                              setAnswers((prev) => ({
                                ...prev,
                                [q.id]: e.target.value,
                              }))
                            }
                            rows={3}
                            className="resize-none"
                          />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              className="flex-1"
              size="lg"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}

          {step < totalSteps ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="flex-1"
              size="lg"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !canProceed()}
              className="flex-1"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating profile...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Complete Setup
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

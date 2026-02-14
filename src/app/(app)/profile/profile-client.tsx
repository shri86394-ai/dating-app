"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
  Camera,
  Edit2,
  Loader2,
  MapPin,
  Save,
  Trash2,
  Bell,
  AlertTriangle,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface ProfileData {
  id: string;
  name: string;
  dateOfBirth: string | null;
  gender: string | null;
  preference: string | null;
  bio: string;
  location: string;
  photos: string[];
  interests: string[];
}

interface AnswerData {
  questionText: string;
  answer: string;
  questionType: string;
}

interface ProfileClientProps {
  profile: ProfileData;
  answers: AnswerData[];
}

export function ProfileClient({ profile, answers }: ProfileClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState(true);

  // Editable state
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location);
  const [gender, setGender] = useState(profile.gender || "");
  const [preference, setPreference] = useState(profile.preference || "");

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

  const age = profile.dateOfBirth
    ? (() => {
        const dob = new Date(profile.dateOfBirth!);
        const today = new Date();
        let a = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
        return a;
      })()
    : null;

  async function handleSave(section: string) {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};

      switch (section) {
        case "basic":
          body.name = name;
          body.gender = gender;
          body.preference = preference;
          break;
        case "bio":
          body.bio = bio;
          break;
        case "location":
          body.location = location;
          break;
      }

      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success("Profile updated!");
        setEditing(null);
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update profile");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    // In production, this would call a delete endpoint
    toast.error(
      "Account deletion requires confirmation via email. This feature is coming soon."
    );
    setDeleteDialogOpen(false);
  }

  function genderLabel(g: string | null) {
    switch (g) {
      case "MALE":
        return "Male";
      case "FEMALE":
        return "Female";
      case "NON_BINARY":
        return "Non-binary";
      case "OTHER":
        return "Other";
      default:
        return "Not set";
    }
  }

  function preferenceLabel(p: string | null) {
    switch (p) {
      case "MALE":
        return "Men";
      case "FEMALE":
        return "Women";
      case "EVERYONE":
        return "Everyone";
      default:
        return "Not set";
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* Profile header */}
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage
              src={profile.photos[0] || undefined}
              alt={name}
              className="object-cover"
            />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors">
            <Camera className="h-4 w-4" />
          </button>
        </div>
        <h1 className="mt-4 text-2xl font-bold">
          {name}
          {age && <span className="ml-1 font-normal text-muted-foreground">, {age}</span>}
        </h1>
        {location && (
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </div>
        )}
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Basic Info
          </CardTitle>
          {editing === "basic" ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave("basic")}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing("basic")}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {editing === "basic" ? (
            <>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
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
                <Label>Interested in</Label>
                <Select value={preference} onValueChange={setPreference}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Men</SelectItem>
                    <SelectItem value="FEMALE">Women</SelectItem>
                    <SelectItem value="EVERYONE">Everyone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Name</span>
                <p className="font-medium">{name}</p>
              </div>
              {age && (
                <div>
                  <span className="text-muted-foreground">Age</span>
                  <p className="font-medium">{age}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Gender</span>
                <p className="font-medium">{genderLabel(gender)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Interested in</span>
                <p className="font-medium">{preferenceLabel(preference)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bio */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Bio
          </CardTitle>
          {editing === "bio" ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave("bio")}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing("bio")}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing === "bio" ? (
            <div className="space-y-2">
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 500))}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/500
              </p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed">
              {bio || (
                <span className="text-muted-foreground italic">
                  No bio yet. Tap edit to add one.
                </span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Interests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Interests
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setEditing("interests")}>
            <Edit2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {profile.interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <Badge key={interest} variant="secondary">
                  {interest}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No interests selected yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Photos
          </CardTitle>
          <Button variant="ghost" size="sm">
            <Edit2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {profile.photos.map((photo, i) => (
              <div
                key={i}
                className="aspect-square overflow-hidden rounded-lg bg-muted"
              >
                <img
                  src={photo}
                  alt={`Photo ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
            {profile.photos.length < 6 && (
              <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50">
                <Camera className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Questionnaire Answers */}
      {answers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Week&apos;s Answers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {answers.map((a, i) => (
              <div key={i}>
                <p className="text-sm font-medium">{a.questionText}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {typeof a.answer === "string" ? a.answer : JSON.stringify(a.answer)}
                </p>
                {i < answers.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Get notified about new matches and messages
                </p>
              </div>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>

          <Separator />

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Delete Account
                </DialogTitle>
                <DialogDescription>
                  This action is permanent and cannot be undone. All your data,
                  including your profile, matches, and messages will be
                  permanently deleted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteAccount}>
                  Delete My Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

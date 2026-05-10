import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Plus, Trash2 } from "lucide-react";
import type { FirestoreUser, MentorshipService } from "../lib/firestore";
import { updateMentorshipProfile } from "../lib/firestore";

function newService(): MentorshipService {
  return {
    id: `svc_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    title: "Career Guidance Call",
    description: "Role strategy, resume positioning, and next steps.",
    duration: 30,
    price: 999,
    isActive: true,
  };
}

export default function MentorshipSettingsPanel({
  user,
  onUpdated,
}: {
  user: FirestoreUser;
  onUpdated?: () => void;
}) {
  const [enabled, setEnabled] = useState(Boolean(user.isMentorshipEnabled));
  const [bio, setBio] = useState(user.mentorshipBio || "");
  const [services, setServices] = useState<MentorshipService[]>(user.mentorshipServices || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(Boolean(user.isMentorshipEnabled));
    setBio(user.mentorshipBio || "");
    setServices(user.mentorshipServices || []);
  }, [user.isMentorshipEnabled, user.mentorshipBio, user.mentorshipServices]);

  const activeCount = useMemo(() => services.filter((s) => s.isActive && s.title.trim()).length, [services]);

  const canPublish = enabled && activeCount > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMentorshipProfile(user.uid, {
        isMentorshipEnabled: enabled,
        mentorshipBio: bio.trim() || undefined,
        mentorshipServices: services,
      });
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-xl">Mentorship Settings</CardTitle>
              <CardDescription>
                Toggle mentorship on to appear as a mentor for seekers. Set at least one active service to go live.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={canPublish ? "default" : "secondary"} className="capitalize">
                {canPublish ? "Live" : "Hidden"}
              </Badge>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Mentorship</Label>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mentor Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Add a short mentor bio: roles you hire for, companies you've worked with, what you can help with."
              className="min-h-[120px]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{activeCount} active service{activeCount === 1 ? "" : "s"}</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Seekers will book only active services</span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setServices((prev) => [newService(), ...prev])}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          </div>

          <div className="space-y-3">
            {services.length === 0 ? (
              <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                Add your first mentorship service to appear in the mentorship section.
              </div>
            ) : (
              services.map((service, idx) => (
                <div key={service.id} className="rounded-lg border bg-background p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            value={service.title}
                            onChange={(e) =>
                              setServices((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, title: e.target.value } : s)),
                              )
                            }
                            placeholder="Resume Review, Mock Interview..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Price (INR)</Label>
                          <Input
                            type="number"
                            value={service.price}
                            onChange={(e) =>
                              setServices((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, price: Number(e.target.value || 0) } : s)),
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Duration (minutes)</Label>
                          <Input
                            type="number"
                            value={service.duration}
                            onChange={(e) =>
                              setServices((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, duration: Number(e.target.value || 0) } : s)),
                              )
                            }
                          />
                        </div>
                        <div className="flex items-end justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Active</Label>
                            <Switch
                              checked={service.isActive}
                              onCheckedChange={(checked) =>
                                setServices((prev) => prev.map((s, i) => (i === idx ? { ...s, isActive: checked } : s)))
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setServices((prev) => prev.filter((s) => s.id !== service.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={service.description}
                          onChange={(e) =>
                            setServices((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, description: e.target.value } : s)),
                            )
                          }
                          className="min-h-[90px]"
                          placeholder="What the seeker gets, what you'll cover, and what to prepare."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <Button type="button" onClick={handleSave} disabled={saving} className="min-w-[160px]">
              {saving ? "Saving..." : "Save Mentorship"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


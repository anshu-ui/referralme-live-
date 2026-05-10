import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Loader2, Send, Sparkles } from "lucide-react";
import type { FirestoreUser } from "../lib/firestore";
import { useToast } from "../hooks/use-toast";

type ChatMsg = { role: "user" | "assistant"; content: string; ts: number };

function getInitials(name?: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

function keyFor(uid: string) {
  return `referralme:ai-mentor:${uid}`;
}

export default function AiMentorChat({ user }: { user: FirestoreUser }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Tell me what you’re aiming for (role + company type) and share your current status (experience, resume, interviews). I’ll give you a tight plan.",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(keyFor(user.uid));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed.slice(-50));
    } catch {
      // ignore
    }
  }, [user.uid]);

  useEffect(() => {
    try {
      localStorage.setItem(keyFor(user.uid), JSON.stringify(messages.slice(-50)));
    } catch {
      // ignore
    }
  }, [messages, user.uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const trimmed = input.trim();
  const canSend = trimmed.length > 0 && !sending;

  const profile = useMemo(() => {
    return {
      name: user.displayName,
      role: user.role,
      experience: user.experience,
      designation: user.designation,
      location: user.location,
      skills: user.skills?.slice?.(0, 12),
      linkedinUrl: user.linkedinUrl,
    };
  }, [user]);

  const send = async () => {
    if (!canSend) return;
    const userMsg: ChatMsg = { role: "user", content: trimmed.slice(0, 4000), ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const resp = await fetch("/api/ai/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].slice(-20).map((m) => ({ role: m.role, content: m.content })),
          profile,
        }),
      });

      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(data?.message || "AI mentor failed");
      }

      const text = String(data?.text || "").trim();
      if (!text) throw new Error("AI mentor returned empty response");
      setMessages((prev) => [...prev, { role: "assistant", content: text, ts: Date.now() }]);
    } catch (e: any) {
      toast({ title: "AI mentor unavailable", description: e?.message || "Please try again." });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I couldn’t respond right now. Please try again in a moment.",
          ts: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-slate-200/80">
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-blue-600" />
              AI Mentor (Text)
              <Badge variant="secondary" className="ml-1">
                Beta
              </Badge>
            </CardTitle>
            <CardDescription>
              Ask questions and get a practical plan for resume, referrals etiquette, and interviews.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[420px] overflow-auto rounded-xl border bg-white p-3">
          <div className="space-y-3">
            {messages.map((m, idx) => (
              <div key={idx} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className="flex max-w-[92%] items-start gap-2">
                  {m.role === "assistant" ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/logo.png" alt="ReferralMe" />
                      <AvatarFallback>R</AvatarFallback>
                    </Avatar>
                  ) : null}
                  <div
                    className={[
                      "rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                      m.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-50 text-slate-900 border",
                    ].join(" ")}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                  {m.role === "user" ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.profileImageUrl || user.photoURL} alt={user.displayName} />
                      <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask: resume improvements, outreach message, interview plan..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button onClick={send} disabled={!canSend} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


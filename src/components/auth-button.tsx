"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { User } from "@supabase/supabase-js";

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const enabled = isSupabaseConfigured();

  useEffect(() => {
    if (!enabled) return;

    let supabase;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      return;
    }

    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setOpen(false);
        window.location.reload();
      }
    });

    return () => subscription.unsubscribe();
  }, [enabled]);

  const sendMagicLink = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter your email");
      return;
    }

    setSending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      toast.success("Check your email for the sign-in link");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSending(false);
    }
  }, [email]);

  const signOut = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      setUser(null);
      toast("Signed out — local data stays in this browser");
      window.location.reload();
    } catch {
      toast.error("Sign out failed");
    }
  }, []);

  if (!enabled) {
    return null;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-[140px] truncate text-xs text-ink-soft sm:inline">
          {user.email}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Sign in
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="email"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
        className="h-8 w-44 text-sm"
      />
      <Button type="button" size="sm" disabled={sending} onClick={sendMagicLink}>
        {sending ? "Sending…" : "Magic link"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

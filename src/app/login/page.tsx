"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const auth = createClient().auth;
    const { data, error: authError } = mode === "sign-in"
      ? await auth.signInWithPassword({ email, password })
      : await auth.signUp({ email, password });
    if (authError) {
      setError(authError.message);
      setIsSubmitting(false);
      return;
    }

    if (mode === "sign-up" && !data.session) {
      setError("Account created. Check your email to confirm it, then sign in.");
      setIsSubmitting(false);
      return;
    }

    const nextPath = new URLSearchParams(window.location.search).get("next") || "/pos";
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-12 text-ink">
      <section className="surface w-full max-w-md p-7 sm:p-9">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-brand-strong">Biznizer</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">{mode === "sign-in" ? "Sign in to your workspace" : "Create your account"}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{mode === "sign-in" ? "Use your Biznizer account." : "Create a Supabase account, then ask an owner to assign your store role."}</p>
        </div>

        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block text-sm font-semibold text-ink">
            Email
            <input required autoComplete="email" className="input-field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label className="block text-sm font-semibold text-ink">
            Password
            <input required autoComplete="current-password" className="input-field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>

          {error ? <p className="rounded-xl border border-danger-line bg-danger-soft px-3 py-2 text-sm text-brand-strong" role="alert">{error}</p> : null}

          <button className="primary-btn w-full py-4" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>

          <button className="w-full py-2 text-sm font-medium text-muted transition hover:text-brand-strong" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(""); }} type="button">
            {mode === "sign-in" ? "Create a new account" : "Already have an account? Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
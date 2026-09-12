"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("The email or password was not accepted.");
      setIsSubmitting(false);
      return;
    }

    const nextPath = new URLSearchParams(window.location.search).get("next") || "/pos";
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-[#f4f1ea] px-6 py-16 text-[#1d2a24]">
      <section className="w-full max-w-md border border-[#d8d4ca] bg-[#fffdf8] p-8 shadow-[0_24px_70px_rgba(38,48,39,0.08)] sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#c75c3b]">Biznizer</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in to your workspace</h1>
        <p className="mt-3 text-sm leading-6 text-[#69736b]">Use the account created in Supabase Authentication.</p>
        <form className="mt-8 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block text-sm font-semibold">Email<input required autoComplete="email" className="mt-2 w-full border border-[#d8d4ca] bg-[#f4f1ea] px-3 py-3 font-normal outline-none focus:border-[#c75c3b]" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="block text-sm font-semibold">Password<input required autoComplete="current-password" className="mt-2 w-full border border-[#d8d4ca] bg-[#f4f1ea] px-3 py-3 font-normal outline-none focus:border-[#c75c3b]" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error ? <p className="text-sm text-[#c75c3b]" role="alert">{error}</p> : null}
          <button className="w-full bg-[#1d2a24] px-5 py-4 text-sm font-bold text-[#fffdf8] transition hover:bg-[#c75c3b] disabled:cursor-not-allowed disabled:bg-[#b5b8b2]" disabled={isSubmitting} type="submit">{isSubmitting ? "Signing in..." : "Sign in"}</button>
        </form>
      </section>
    </main>
  );
}
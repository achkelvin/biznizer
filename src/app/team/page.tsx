"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getCurrentUserRole, getTeamMembers, setTeamMemberRole, type StoreRole, type TeamMember } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";

export default function TeamPage() {
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<StoreRole>("staff");
  const [status, setStatus] = useState("Loading team...");
  const [isOwner, setIsOwner] = useState(false);

  async function loadTeam() {
    try {
      const currentRole = await getCurrentUserRole();
      setIsOwner(currentRole === "owner");
      if (currentRole !== "owner") {
        setStatus("Only owners can manage team roles.");
        return;
      }
      setMembers(await getTeamMembers());
      setStatus("Assign roles to your store members.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load the team.");
    }
  }

  useEffect(() => {
    const task = window.setTimeout(() => void loadTeam(), 0);
    return () => window.clearTimeout(task);
  }, []);

  async function saveRole() {
    try {
      await setTeamMemberRole(userId.trim(), role);
      setUserId("");
      await loadTeam();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save the role.");
    }
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  return <main className="min-h-full flex-1 bg-[#f4f1ea] text-[#1d2a24]"><header className="flex items-center justify-between border-b border-[#d8d4ca] bg-[#fffdf8] px-6 py-5 sm:px-10"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#c75c3b]">Biznizer</p><h1 className="mt-1 text-xl font-semibold">Team roles</h1></div><div className="flex gap-5 text-sm"><a className="text-[#69736b] hover:text-[#c75c3b]" href="/pos">Back to POS</a><button className="text-[#69736b] hover:text-[#c75c3b]" onClick={() => void signOut()} type="button">Sign out</button></div></header><div className="mx-auto max-w-3xl space-y-6 p-6 sm:p-10"><p className="text-sm text-[#69736b]">{status}</p>{isOwner ? <><section className="border border-[#d8d4ca] bg-[#fffdf8] p-6"><h2 className="text-xl font-semibold">Assign a user</h2><p className="mt-2 text-sm text-[#69736b]">Copy the user UUID from Supabase Authentication -&gt; Users.</p><div className="mt-5 grid gap-3 sm:grid-cols-[1fr_140px_auto]"><input className="border border-[#d8d4ca] bg-[#f4f1ea] px-3 py-3 text-sm outline-none focus:border-[#c75c3b]" placeholder="User UUID" value={userId} onChange={(event) => setUserId(event.target.value)} /><select className="border border-[#d8d4ca] bg-[#f4f1ea] px-3 py-3 text-sm outline-none focus:border-[#c75c3b]" value={role} onChange={(event) => setRole(event.target.value as StoreRole)}><option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option></select><button className="bg-[#1d2a24] px-4 py-3 text-sm font-bold text-[#fffdf8] disabled:bg-[#b5b8b2]" disabled={!userId.trim()} onClick={() => void saveRole()} type="button">Save role</button></div></section><section className="border border-[#d8d4ca] bg-[#fffdf8] p-6"><h2 className="text-xl font-semibold">Current members</h2><div className="mt-4 divide-y divide-[#eee9df]">{members.map((member) => <div className="flex items-center justify-between py-3 text-sm" key={member.userId}><span className="font-mono text-xs">{member.userId}</span><span className="font-semibold uppercase tracking-[0.12em] text-[#c75c3b]">{member.role}</span></div>)}</div></section></> : null}</div></main>;
}
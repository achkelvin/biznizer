"use client";

import { useEffect, useState } from "react";

import { AppNav } from "@/components/top-nav";
import { getCurrentUserRole, getTeamMembers, removeTeamMember, setTeamMemberRole, type StoreRole, type TeamMember } from "@/lib/supabase/auth";

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<StoreRole>("staff");
  const [status, setStatus] = useState("Loading team...");
  const [isOwner, setIsOwner] = useState(false);
  // Remove asks twice: the first click arms the row, the second removes.
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);

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

  async function changeRole(memberId: string, next: StoreRole) {
    try {
      await setTeamMemberRole(memberId, next);
      await loadTeam();
      setStatus(`Role changed to ${next}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not change the role.");
    }
  }

  async function removeMember(memberId: string) {
    setConfirmingRemove(null);
    try {
      await removeTeamMember(memberId);
      await loadTeam();
      setStatus("Member removed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not remove the member.");
    }
  }

  return <main className="min-h-full min-w-0 flex-1 text-[#1e2a23]"><AppNav title="Team" subtitle="Roles and access for your store" /><div className="mx-auto max-w-3xl space-y-6 p-6 sm:p-10"><p aria-live="polite" className="text-sm text-[#69736b]">{status}</p>{isOwner ? <><section className="surface p-6"><h2 className="text-xl font-semibold">Assign a user</h2><p className="mt-2 text-sm text-[#69736b]">Copy the user UUID from Supabase Authentication -&gt; Users.</p><div className="mt-5 grid gap-3 sm:grid-cols-[1fr_140px_auto]"><input className="field px-3 py-3 text-sm outline-none" placeholder="User UUID" value={userId} onChange={(event) => setUserId(event.target.value)} /><select className="field px-3 py-3 text-sm outline-none" value={role} onChange={(event) => setRole(event.target.value as StoreRole)}><option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option></select><button className="primary-btn" disabled={!userId.trim()} onClick={() => void saveRole()} type="button">Save role</button></div></section><section className="surface p-6"><h2 className="text-xl font-semibold">Current members</h2><div className="mt-4 divide-y divide-[#1e2a23]/10">{members.map((member) => <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm" key={member.userId}><span className="min-w-0 break-all font-mono text-xs">{member.userId}</span><div className="flex items-center gap-2"><select aria-label={`Role of ${member.userId}`} className="field px-2 py-1.5 text-sm outline-none" value={member.role} onChange={(event) => void changeRole(member.userId, event.target.value as StoreRole)}><option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option></select>{confirmingRemove === member.userId ? <><button className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition bg-[#c75c3b] text-white hover:bg-[#a14f35]" onClick={() => void removeMember(member.userId)} type="button">Confirm</button><button className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition text-[#5d665f] hover:bg-white/70" onClick={() => setConfirmingRemove(null)} type="button">Cancel</button></> : <button aria-label={`Remove ${member.userId}`} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition text-[#a14f35] hover:bg-[#fbeae5]" onClick={() => setConfirmingRemove(member.userId)} type="button">Remove</button>}</div></div>)}</div></section></> : null}</div></main>;
}
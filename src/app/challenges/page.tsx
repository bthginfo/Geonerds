import { Suspense } from "react";
import { ChallengeDashboard } from "@/components/challenges/challenge-dashboard";

export default function ChallengesPage() {
  return <Suspense fallback={<div className="mx-auto w-full max-w-5xl px-4 py-12" aria-busy="true"><div className="h-10 w-56 animate-pulse rounded-xl bg-muted" /><div className="mt-8 h-72 animate-pulse rounded-2xl bg-muted" /></div>}><ChallengeDashboard /></Suspense>;
}

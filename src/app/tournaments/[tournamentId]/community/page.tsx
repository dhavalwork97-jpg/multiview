import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CommunityEngagementPanel } from "@/components/social/CommunityEngagementPanel";

export async function generateMetadata({ params }: { params: Promise<{ tournamentId:string }> }): Promise<Metadata> {
  const { tournamentId } = await params;
  const tournament = await db.tournament.findUnique({ where:{id:tournamentId}, select:{name:true,game:true} });
  return { title: tournament ? `${tournament.name} · Community` : "Community" };
}

export default async function TournamentCommunityPage({ params }: { params: Promise<{ tournamentId:string }> }) {
  const { tournamentId } = await params;
  const tournament = await db.tournament.findUnique({ where:{id:tournamentId}, select:{id:true,name:true,game:true,publicEnabled:true,entrants:{orderBy:{seed:"asc"},take:24,select:{player:{select:{id:true,gamertag:true}}}}} });
  if(!tournament || !tournament.publicEnabled) notFound();
  const candidates=tournament.entrants.map(e=>e.player);
  return <main className="page-shell"><div className="page-container max-w-6xl">
    <header className="mb-6"><p className="page-kicker">{tournament.game} · {tournament.name}</p><div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="page-title">Community</h1><p className="page-subtitle mt-2">Predictions, live polls, MVP voting, Pick'em brackets and the community leaderboard.</p></div><Link href={`/tournaments/${tournament.id}`} className="action-secondary">Back to tournament</Link></div><nav aria-label="Community navigation" className="context-tabs mt-4"><Link href={`/tournaments/${tournament.id}`} className="context-tab">Overview</Link><Link href={`/tournaments/${tournament.id}/standings`} className="context-tab">Standings</Link><span className="context-tab context-tab-active" aria-current="page">Community</span></nav></header>
    <CommunityEngagementPanel tournamentId={tournament.id} mvpCandidates={candidates} />
  </div></main>;
}

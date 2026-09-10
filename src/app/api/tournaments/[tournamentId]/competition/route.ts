import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePrimaryOrganizationRole } from "@/lib/organization";
import { validateDynamicCompetition, type DynamicCompetitionConfig } from "@/lib/dynamic-competition";
import { generateBattleRoyaleCompetition } from "@/lib/battle-royale-engine";

export async function POST(
  req: Request,
  context: { params: Promise<{ tournamentId: string }> },
) {
  let user;
  try {
    ({ user } = await requirePrimaryOrganizationRole("ADMIN"));
  } catch {
    return NextResponse.json({ error: "Only organization admins can configure competitions" }, { status: 403 });
  }

  const { tournamentId } = await context.params;
  const body = await req.json().catch(() => null) as { config?: unknown } | null;

  let config: DynamicCompetitionConfig;
  try {
    config = validateDynamicCompetition(body?.config);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid competition configuration" },
      { status: 400 },
    );
  }

  const tournament = await db.tournament.findFirst({
    where: { id: tournamentId, organizerId: user.id },
    include: { stages: { orderBy: { orderIndex: "asc" } } },
  });
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  const stages = await db.$transaction(async (tx) => {
    const result = [];
    for (const stage of config.stages) {
      const existing = tournament.stages.find((candidate) => candidate.orderIndex === stage.order);
      const rules = {
        ...stage.rules,
        id: stage.id,
        name: stage.name,
        order: stage.order,
        session: stage.session,
        scoring: stage.scoring,
        advancement: stage.advancement,
        victory: stage.victory,
        format: stage.format,
        family: config.family,
      };
      if (existing) {
        result.push(await tx.competitionStage.update({
          where: { id: existing.id },
          data: { name: stage.name, orderIndex: stage.order, status: stage.order === 0 ? "READY" : existing.status, rules: rules as object },
        }));
      } else {
        result.push(await tx.competitionStage.create({
          data: {
            tournamentId,
            name: stage.name,
            orderIndex: stage.order,
            kind: stage.format === "BATTLE_ROYALE_SESSION" ? "LEAGUE" : stage.format === "ROUND_ROBIN" || stage.format === "LEAGUE" ? "LEAGUE" : stage.format === "SWISS" ? "SWISS" : stage.format === "CUSTOM" ? "CUSTOM" : "KNOCKOUT",
            status: stage.order === 0 ? "READY" : "SCHEDULED",
            rules: rules as object,
          },
        }));
      }
    }
    return result;
  });

  const lobbyIds = config.family === "BATTLE_ROYALE"
    ? await db.$transaction((tx) => generateBattleRoyaleCompetition(tx, tournamentId, config))
    : [];

  return NextResponse.json({
    tournamentId,
    family: config.family,
    stages: stages.map((stage) => ({ id: stage.id, name: stage.name, order: stage.orderIndex, status: stage.status })),
    generatedLobbies: lobbyIds,
  });
}

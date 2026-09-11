export type LiveScoreState = {
  scoreA: number;
  scoreB: number;
  round: number;
  roundLabel: string;
  leader: "A" | "B" | "TIE";
  lastEvent: "score" | "round" | "goal" | "ko" | "match-point" | null;
};

export type ScoreUpdate = Partial<LiveScoreState> & {
  scoreA?: number;
  scoreB?: number;
  round?: number;
  eventType?: "score" | "round" | "goal" | "ko" | "match-point" | null;
};

export type LiveGraphicsAnimation =
  | "score-pop"
  | "round-slam"
  | "goal-burst"
  | "ko-impact"
  | "match-point"
  | "score-steady";

export function normalizeLiveScore(update: ScoreUpdate, previous: LiveScoreState = {
  scoreA: 0,
  scoreB: 0,
  round: 1,
  roundLabel: "ROUND 1",
  leader: "TIE",
  lastEvent: null,
}): LiveScoreState {
  const scoreA = Math.max(0, Math.floor(update.scoreA ?? previous.scoreA));
  const scoreB = Math.max(0, Math.floor(update.scoreB ?? previous.scoreB));
  const round = Math.max(1, Math.floor(update.round ?? previous.round));
  const leader = scoreA === scoreB ? "TIE" : scoreA > scoreB ? "A" : "B";
  return {
    scoreA,
    scoreB,
    round,
    roundLabel: update.roundLabel?.trim() || `ROUND ${round}`,
    leader,
    lastEvent: update.eventType ?? previous.lastEvent,
  };
}

export function animationForScoreUpdate(previous: LiveScoreState, next: LiveScoreState): LiveGraphicsAnimation {
  switch (next.lastEvent) {
    case "ko": return "ko-impact";
    case "goal": return "goal-burst";
    case "round": return "round-slam";
    case "match-point": return "match-point";
    default: return next.scoreA !== previous.scoreA || next.scoreB !== previous.scoreB ? "score-pop" : "score-steady";
  }
}

export function winnerSide(state: LiveScoreState): "A" | "B" | null {
  if (state.scoreA === state.scoreB) return null;
  return state.scoreA > state.scoreB ? "A" : "B";
}

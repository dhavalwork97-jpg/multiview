
/**
 * Match completion must NOT end the station's YouTube broadcast. The same
 * broadcast is intentionally reused by the next bracket match on that
 * station. This makes normal match completion a zero-quota YouTube operation.
 */
export async function endBroadcastForMatch(matchId: string) {
  void matchId;
  return;
}

/**
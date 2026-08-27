"use client";

import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import type { CompetitionViewerState } from "@/lib/competition/viewer-state";

export function useCompetitionViewerState(
  tournamentId: string,
  initialState: CompetitionViewerState,
) {
  const [state, setState] = useState(initialState);
  const [refreshing, setRefreshing] = useState(false);
  const socket = useSocket({ tournamentId });

  const refresh = useCallback(async () => {
    setRefreshing(true);

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/viewer-state`,
        { cache: "no-store" },
      );

      if (!response.ok) return;

      const next = (await response.json()) as CompetitionViewerState;
      setState(next);
    } finally {
      setRefreshing(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Debounce because one result can generate match + bracket +
    // competition events within milliseconds.
    const handleUpdate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void refresh();
      }, 150);
    };

    socket.on("competition:updated", handleUpdate);

    return () => {
      socket.off("competition:updated", handleUpdate);
      if (timer) clearTimeout(timer);
    };
  }, [socket, refresh]);

  return {
    state,
    refreshing,
    refresh,
  };
}
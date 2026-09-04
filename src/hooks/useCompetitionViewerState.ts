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
  const [refreshError, setRefreshError] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(initialState.generatedAt);
  const [connected, setConnected] = useState(false);
  const socket = useSocket({ tournamentId });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(false);

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/viewer-state`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        setRefreshError(true);
        return;
      }

      const next = (await response.json()) as CompetitionViewerState;
      setState(next);
      setLastUpdatedAt(next.generatedAt);
    } catch {
      setRefreshError(true);
    } finally {
      setRefreshing(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    const handleConnect = () => {
      setConnected(true);
      void refresh();
    };
    const handleDisconnect = () => setConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    setConnected(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket, refresh]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

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
    refreshError,
    lastUpdatedAt,
    connected,
    refresh,
  };
}

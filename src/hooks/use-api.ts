/**
 * React Query hooks for the backend.
 *
 * React Query was already installed and the provider was already mounted, but
 * nothing used it — every screen did its own `useEffect` + `fetch`, which meant
 * no caching, no deduplication (the case view fired /timeline and /movement
 * twice on mount), no retries, and no real loading or error states.
 */

import { useQuery } from "@tanstack/react-query";

import {
  fetchCopilotStatus,
  fetchModelInfo,
  fetchMovement,
  fetchStats,
  fetchTimeline,
  type CopilotStatus,
  type ModelInfo,
  type MovementResponse,
  type StatsResponse,
  type TimelineResponse,
} from "@/lib/api";

const ONE_MINUTE = 60_000;

export function useStats() {
  return useQuery<StatsResponse>({
    queryKey: ["stats"],
    queryFn: fetchStats,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useTimeline(caseId: string) {
  return useQuery<TimelineResponse>({
    queryKey: ["timeline", caseId],
    queryFn: () => fetchTimeline(caseId),
    staleTime: 5 * ONE_MINUTE,
    enabled: Boolean(caseId),
    retry: 1,
  });
}

export function useMovement(caseId: string) {
  return useQuery<MovementResponse>({
    queryKey: ["movement", caseId],
    queryFn: () => fetchMovement(caseId),
    staleTime: 5 * ONE_MINUTE,
    enabled: Boolean(caseId),
    retry: 1,
  });
}

export function useCopilotStatus() {
  return useQuery<CopilotStatus>({
    queryKey: ["copilot-status"],
    queryFn: fetchCopilotStatus,
    staleTime: 10 * ONE_MINUTE,
    retry: 1,
  });
}

export function useModelInfo() {
  return useQuery<ModelInfo>({
    queryKey: ["model-info"],
    queryFn: fetchModelInfo,
    staleTime: 10 * ONE_MINUTE,
    retry: 1,
  });
}

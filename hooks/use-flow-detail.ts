"use client";

import { useState, useEffect, useCallback } from "react";
import type { FlowRunData, AgentRunData } from "@/lib/flow-graph";

type FlowDetailResponse = {
  flowRun: FlowRunData;
  agentRuns: AgentRunData[];
};

export function useFlowDetail(id: string | null) {
  const [state, setState] = useState<{
    flowRun: FlowRunData | null;
    agentRuns: AgentRunData[];
    loading: boolean;
    error: string | null;
  }>({ flowRun: null, agentRuns: [], loading: false, error: null });
  const [retryCounter, setRetryCounter] = useState(0);

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    fetch(`/api/flows/${id}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json() as Promise<FlowDetailResponse>;
      })
      .then((data) => {
        setState({
          flowRun: data.flowRun,
          agentRuns: data.agentRuns,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState((s) => ({
          ...s,
          loading: false,
          error: "Failed to load flow details.",
        }));
      });

    return () => {
      controller.abort();
    };
  }, [id, retryCounter]);

  // Reset when id becomes null
  const flowRun = id ? state.flowRun : null;
  const agentRuns = id ? state.agentRuns : [];
  const loading = id ? state.loading : false;
  const error = id ? state.error : null;

  const retry = useCallback(() => {
    setRetryCounter((c) => c + 1);
  }, []);

  return { flowRun, agentRuns, loading, error, retry };
}

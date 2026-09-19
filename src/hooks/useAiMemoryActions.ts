import { useCallback, useEffect, useState } from "react";
import { safeApiFetch } from "../lib/api";

type AiMemoryOptions = {
  activeAiTab: string;
  orders: unknown[];
  materials: unknown[];
};

export function useAiMemoryActions({ activeAiTab, orders, materials }: AiMemoryOptions) {
  const [aiMemoryLayers, setAiMemoryLayers] = useState<any>(null);
  const [isLoadingAiMemory, setIsLoadingAiMemory] = useState(false);
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiSearchResults, setAiSearchResults] = useState<any[]>([]);
  const [isSearchingAi, setIsSearchingAi] = useState(false);

  const fetchAiMemory = useCallback(async () => {
    setIsLoadingAiMemory(true);
    try {
      const data = await safeApiFetch<{ success?: boolean; layers?: any }>("/api/ai/memory");
      if (data?.success) setAiMemoryLayers(data.layers);
    } finally {
      setIsLoadingAiMemory(false);
    }
  }, []);

  const handleAiSearch = useCallback(async () => {
    const query = aiSearchQuery.trim();
    if (!query) {
      setAiSearchResults([]);
      return;
    }
    setIsSearchingAi(true);
    try {
      const data = await safeApiFetch<{ success?: boolean; results?: any[] }>("/api/ai/semantic-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (data?.success) setAiSearchResults(data.results || []);
    } finally {
      setIsSearchingAi(false);
    }
  }, [aiSearchQuery]);

  useEffect(() => {
    if (activeAiTab === "memory") void fetchAiMemory();
  }, [activeAiTab, fetchAiMemory, orders, materials]);

  return {
    aiMemoryLayers,
    isLoadingAiMemory,
    aiSearchQuery,
    setAiSearchQuery,
    aiSearchResults,
    isSearchingAi,
    fetchAiMemory,
    handleAiSearch,
  };
}

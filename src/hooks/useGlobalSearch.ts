import { useEffect, useState } from "react";
import { safeApiFetch } from "../lib/api";

type SearchResults = {
  orders: any[];
  customers: any[];
  products: any[];
  materials: any[];
  invoices: any[];
};

export function useGlobalSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    const delayDebounce = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await safeApiFetch<{ success?: boolean; results?: SearchResults }>(
          `/api/search?q=${encodeURIComponent(searchQuery)}`,
        );
        if (data?.success) setSearchResults(data.results || null);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(delayDebounce);
  }, [searchQuery]);

  return { searchQuery, setSearchQuery, searchResults, setSearchResults, isSearching };
}

"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Brain,
  Tag as TagIcon,
  X,
  Loader2,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddFactForm } from "./add-fact-form";
import { FactCard } from "./fact-card";
import type { Fact } from "@/lib/memory";

/**
 * Recall — MemoryCanvas.
 *
 * The interactive memory vault. Shows the AddFactForm at top, a search/filter
 * bar, and the list of fact cards. Uses TanStack Query for data fetching with
 * a 30s stale time and refetch-on-focus.
 *
 * Search: when the user types in the search box, it calls /api/memory/query
 * (substring + tag match, ranked by relevance). When empty, it lists all
 * facts via /api/memory.
 *
 * Tag filter: clicking a tag chip filters the list to facts with that tag.
 * The tag chips come from the distinct tags the user has used.
 */
export function MemoryCanvas() {
  const [search, setSearch] = React.useState("");
  const [activeTag, setActiveTag] = React.useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // Debounce the search input so we don't hit the API on every keystroke.
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const isSearching = debouncedSearch.length > 0;

  // --- Fetch facts ---
  const { data: factsData, isLoading } = useQuery<{
    facts: Fact[];
    total: number;
  }>({
    queryKey: ["facts", activeTag],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTag) params.set("tag", activeTag);
      const res = await fetch(`/api/memory?${params}`);
      if (!res.ok) throw new Error("Failed to load facts");
      return res.json();
    },
    enabled: !isSearching,
  });

  // --- Search facts (only when searching) ---
  const { data: searchData, isFetching: isSearchingLoading } = useQuery<{
    facts: Fact[];
    count: number;
  }>({
    queryKey: ["search", debouncedSearch, activeTag],
    queryFn: async () => {
      const res = await fetch("/api/memory/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: debouncedSearch,
          tags: activeTag ? [activeTag] : [],
        }),
      });
      if (!res.ok) throw new Error("Failed to search");
      return res.json();
    },
    enabled: isSearching,
  });

  // --- Fetch tags (for the filter chips) ---
  const { data: tags } = useQuery<string[]>({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await fetch("/api/memory/tags");
      if (!res.ok) return [];
      const data = await res.json();
      return data.tags ?? [];
    },
  });

  const facts = isSearching ? searchData?.facts ?? [] : factsData?.facts ?? [];
  const total = isSearching
    ? searchData?.count ?? 0
    : factsData?.total ?? 0;
  const showLoading = isLoading || (isSearching && isSearchingLoading);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <Brain className="h-4 w-4 text-primary" />
          Memory canvas
        </h2>
        <span className="text-xs text-muted-foreground">
          {total} {total === 1 ? "fact" : "facts"}
        </span>
      </div>

      {/* Add fact form */}
      <AddFactForm />

      {/* Search + filter */}
      <div className="mt-4 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your memory…"
            className="h-9 bg-background/70 pl-9 text-sm"
            aria-label="Search facts"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Tag filter chips */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <TagIcon className="h-3 w-3 text-muted-foreground" />
            {activeTag && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 gap-1 px-1.5 text-[10px] text-muted-foreground"
                onClick={() => setActiveTag(null)}
              >
                <X className="h-2.5 w-2.5" />
                clear
              </Button>
            )}
            {tags.slice(0, 12).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={cn(
                  "rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors",
                  activeTag === tag
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground",
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fact list */}
      <div className="mt-4">
        {showLoading ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Loading your memory…</p>
          </div>
        ) : facts.length === 0 ? (
          <EmptyState isSearching={isSearching} search={debouncedSearch} />
        ) : (
          <ScrollArea className="max-h-[600px]">
            <div className="grid gap-2.5 pr-1 sm:grid-cols-2">
              {facts.map((fact) => (
                <FactCard key={fact.id} fact={fact} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  isSearching,
  search,
}: {
  isSearching: boolean;
  search: string;
}) {
  return (
    <div className="bg-memory-lattice flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {isSearching ? (
          <Search className="h-6 w-6 text-muted-foreground" />
        ) : (
          <Inbox className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <p className="mt-4 text-sm font-medium">
        {isSearching ? "No matching facts" : "No facts yet"}
      </p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        {isSearching
          ? `No facts match "${search}". Try a different query or clear the search.`
          : "Add a fact manually above, or let your ChatGPT agent add one via the addFact WebMCP tool."}
      </p>
    </div>
  );
}

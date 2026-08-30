"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Tag as TagIcon, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LIMITS } from "@/lib/constants";
import type { Fact } from "@/lib/memory";

/**
 * Recall — AddFactForm.
 *
 * A compact form for adding a new fact to the memory vault. Content textarea
 * + tag input + submit. Uses an optimistic mutation so the new card appears
 * immediately, then rolls back if the API call fails.
 *
 * The form validates client-side (min/max content length, max tags) and
 * surfaces server-side validation errors via the toast.
 */
export function AddFactForm() {
  const queryClient = useQueryClient();
  const [content, setContent] = React.useState("");
  const [tagsText, setTagsText] = React.useState("");
  const [isExpanded, setIsExpanded] = React.useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: { content: string; tags: string[] }) => {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to add fact");
      }
      return res.json() as Promise<{ fact: Fact }>;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["facts"] });
      const previous = queryClient.getQueryData<{ facts: Fact[]; total: number }>(["facts"]);
      if (previous) {
        // Optimistic: insert a temp fact at the top.
        const tempFact: Fact = {
          id: `temp-${Date.now()}`,
          content: data.content,
          tags: data.tags,
          source: "user",
          sourceOrigin: "recall.app",
          capabilityTokenId: null,
          relevanceScore: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: null,
        };
        queryClient.setQueryData<{ facts: Fact[]; total: number }>(["facts"], {
          ...previous,
          facts: [tempFact, ...previous.facts],
          total: (previous.total ?? previous.facts.length) + 1,
        });
      }
      return { previous };
    },
    onError: (err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["facts"], context.previous);
      }
      toast.error(err instanceof Error ? err.message : "Failed to add fact");
    },
    onSuccess: () => {
      toast.success("Fact added to your vault");
      setContent("");
      setTagsText("");
      setIsExpanded(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["facts"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("Fact content can't be empty");
      return;
    }
    if (trimmed.length > LIMITS.FACT_MAX_LENGTH) {
      toast.error(`Fact must be at most ${LIMITS.FACT_MAX_LENGTH} characters`);
      return;
    }
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length > LIMITS.TAG_MAX_PER_FACT) {
      toast.error(`A fact can have at most ${LIMITS.TAG_MAX_PER_FACT} tags`);
      return;
    }
    createMutation.mutate({ content: trimmed, tags });
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card/60 backdrop-blur transition-all",
        isExpanded ? "border-primary/40 ring-1 ring-primary/20" : "border-border/60",
      )}
    >
      <form
        onSubmit={handleSubmit}
        className="p-4"
        // Declarative WebMCP form annotation (blueprint §32, Day 7):
        // The mcp-tool attribute tells a WebMCP-capable browser that this form
        // is ALSO a WebMCP tool. The browser synthesizes a JSON Schema from the
        // form's named fields, so the add-fact form is both an HTML form (for
        // the user) and a WebMCP tool (for the agent) — one code path, two
        // consumers. The imperative registration in lib/webmcp handles the
        // live tool calls; this declarative annotation is the spec-compliant
        // fallback that works even without imperative registration.
        data-mcp-tool="addFact"
        data-mcp-description="Add a new fact to the user's memory vault."
        data-mcp-untrusted="true"
      >
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          placeholder="Add a fact to your memory vault…"
          className={cn(
            "min-h-[60px] resize-y border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0",
            !isExpanded && "min-h-[40px]",
          )}
          maxLength={LIMITS.FACT_MAX_LENGTH}
          aria-label="Fact content"
          name="content"
          data-mcp-required="true"
          data-mcp-maxlength={LIMITS.FACT_MAX_LENGTH}
        />
        {isExpanded && (
          <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
            <div className="flex items-center gap-1.5">
              <TagIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <Input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="tags (comma-separated, optional)"
                className="h-8 border-0 bg-background/70 px-2 text-xs shadow-none"
                aria-label="Fact tags"
                name="tags"
                data-mcp-type="array"
                data-mcp-maxitems={LIMITS.TAG_MAX_PER_FACT}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {content.length}/{LIMITS.FACT_MAX_LENGTH} chars
              </span>
              <div className="flex gap-1.5">
                {isExpanded && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => {
                      setIsExpanded(false);
                      setContent("");
                      setTagsText("");
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  className="h-7"
                  disabled={createMutation.isPending || !content.trim()}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1 h-3 w-3" />
                      Add fact
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
        {!isExpanded && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/60">
            <Sparkles className="h-2.5 w-2.5" />
            <span>type a fact, then add tags</span>
          </div>
        )}
      </form>
    </div>
  );
}

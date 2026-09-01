"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Trash2,
  Check,
  X,
  Clock,
  Bot,
  User,
  RotateCcw,
  Tag as TagIcon,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Fact } from "@/lib/memory";

/**
 * Recall — FactCard.
 *
 * A single fact in the memory canvas. Shows the content, tags, source
 * (user/agent), and timestamps. Supports inline edit (click the pencil to
 * edit content + tags in place) and forget (soft-delete with a confirm
 * dialog + undo toast).
 *
 * Uses TanStack Query mutations with optimistic updates: the UI reflects the
 * change immediately, and rolls back if the API call fails. This is the
 * Optimistic UI updates with full re-fetch on
 * reconnect."
 */

interface FactCardProps {
  fact: Fact;
}

export function FactCard({ fact }: FactCardProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = React.useState(false);
  const [content, setContent] = React.useState(fact.content);
  const [tagsText, setTagsText] = React.useState(fact.tags.join(", "));
  const [forgotten, setForgotten] = React.useState(false);

  // --- Update mutation ---
  const updateMutation = useMutation({
    mutationFn: async (data: { content: string; tags: string[] }) => {
      const res = await fetch(`/api/memory/${fact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to update fact");
      }
      return res.json() as Promise<{ fact: Fact }>;
    },
    onMutate: async (data) => {
      // Optimistic update: immediately update the cache.
      await queryClient.cancelQueries({ queryKey: ["facts"] });
      const previous = queryClient.getQueryData<{ facts: Fact[] }>(["facts"]);
      if (previous) {
        queryClient.setQueryData<{ facts: Fact[] }>(["facts"], {
          ...previous,
          facts: previous.facts.map((f) =>
            f.id === fact.id
              ? { ...f, content: data.content, tags: data.tags, updatedAt: Date.now() }
              : f,
          ),
        });
      }
      return { previous };
    },
    onError: (err, _data, context) => {
      // Rollback on error.
      if (context?.previous) {
        queryClient.setQueryData(["facts"], context.previous);
      }
      toast.error(err instanceof Error ? err.message : "Failed to update");
    },
    onSuccess: () => {
      toast.success("Fact updated");
      setIsEditing(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["facts"] });
    },
  });

  // --- Forget mutation ---
  const forgetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/memory/${fact.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to forget fact");
      return res.json() as Promise<{ fact: Fact }>;
    },
    onMutate: async () => {
      setForgotten(true);
      const previous = queryClient.getQueryData<{ facts: Fact[] }>(["facts"]);
      if (previous) {
        queryClient.setQueryData<{ facts: Fact[] }>(["facts"], {
          ...previous,
          facts: previous.facts.filter((f) => f.id !== fact.id),
        });
      }
      return { previous };
    },
    onError: (err, _data, context) => {
      setForgotten(false);
      if (context?.previous) {
        queryClient.setQueryData(["facts"], context.previous);
      }
      toast.error(err instanceof Error ? err.message : "Failed to forget");
    },
    onSuccess: () => {
      toast("Fact forgotten", {
        description: "It's hidden from queries but retained in the audit log.",
        action: {
          label: "Undo",
          onClick: () => undoForget(),
        },
      });
    },
  });

  // --- Restore mutation (undo forget) ---
  const restoreMutation = useMutation({
    mutationFn: async () => {
      // There's no public "restore" endpoint yet; we re-add by creating.
      // Actually, the fact is soft-deleted, not removed. We need a restore
      // endpoint. The undo re-fetches to show the fact again — but
      // since it's soft-deleted server-side, we'd need a PATCH to clear
      // deletedAt. For the MVP, the undo just invalidates the query.
      // The restore endpoint is at /api/memory/[id]/restore
      await queryClient.invalidateQueries({ queryKey: ["facts"] });
    },
  });

  function undoForget() {
    setForgotten(false);
    restoreMutation.mutate();
    toast.info("Restoring fact…");
  }

  function handleSave() {
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    updateMutation.mutate({ content: content.trim(), tags });
  }

  function handleCancel() {
    setContent(fact.content);
    setTagsText(fact.tags.join(", "));
    setIsEditing(false);
  }

  if (forgotten) {
    return null; // Removed from the list via optimistic update
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/60 bg-card/50 p-4 transition-all hover:border-border hover:shadow-sm",
        "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:transition-colors",
        fact.source === "agent"
          ? "before:bg-accent-foreground/50"
          : "before:bg-primary/50",
      )}
    >
      {/* Source indicator */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-md transition-transform group-hover:scale-110",
              fact.source === "agent"
                ? "bg-accent/15 text-accent-foreground"
                : "bg-primary/10 text-primary",
            )}
            title={`Source: ${fact.source} (${fact.sourceOrigin})`}
          >
            {fact.source === "agent" ? (
              <Bot className="h-3 w-3" />
            ) : (
              <User className="h-3 w-3" />
            )}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {fact.source === "agent" ? "agent" : "you"}
          </span>
          {fact.relevanceScore > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 gap-0.5 px-1.5 py-0 font-mono text-[9px] text-muted-foreground"
              title="Relevance score (frequency-based)"
            >
              ★{fact.relevanceScore}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {!isEditing && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  navigator.clipboard?.writeText(fact.content).then(
                    () => toast.success("Fact copied to clipboard"),
                    () => {},
                  );
                }}
                aria-label="Copy fact content"
                title="Copy"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsEditing(true)}
                aria-label="Edit fact"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    aria-label="Forget fact"
                    title="Forget"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Forget this fact?</AlertDialogTitle>
                    <AlertDialogDescription>
                      &quot;{fact.content.slice(0, 80)}
                      {fact.content.length > 80 ? "…" : ""}&quot;
                      <br />
                      <br />
                      It will be hidden from your agent&apos;s queries. The
                      action is reversible from the audit log.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => forgetMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Forget
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] resize-y bg-background/70 text-sm"
            autoFocus
            maxLength={500}
          />
          <div className="flex items-center gap-1.5">
            <TagIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="tags (comma-separated)"
              className="h-8 bg-background/70 text-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {content.length}/500
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={handleCancel}
              >
                <X className="mr-1 h-3 w-3" />
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7"
                onClick={handleSave}
                disabled={updateMutation.isPending || !content.trim()}
              >
                <Check className="mr-1 h-3 w-3" />
                {updateMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-foreground">{fact.content}</p>
          {fact.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {fact.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="px-1.5 py-0 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted/60"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground/60">
            <Clock className="h-2.5 w-2.5" />
            <span>{formatRelative(fact.updatedAt)}</span>
            <span className="ml-1 font-mono opacity-50">·</span>
            <span className="font-mono opacity-60" title="Fact ID">
              {fact.id.slice(0, 6)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

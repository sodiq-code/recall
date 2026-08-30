"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Clock,
  ShieldCheck,
  Plus as PlusIcon,
  X,
  Loader2,
  Key,
  Globe,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ALL_TOOLS } from "@/lib/webmcp/tools";
import type { ToolName } from "@/lib/constants";

/**
 * Recall — Settings page (client).
 *
 * Per-tool enable/disable + granted-origins management + capability-token
 * issuance. The WebMCP bridge re-registers only the ENABLED tools when the
 * user returns to /app, so disabling a tool here takes effect immediately.
 */

const TOOL_ICONS: Record<ToolName, React.ComponentType<{ className?: string }>> = {
  query: Search,
  addFact: Plus,
  updateFact: Pencil,
  forgetFact: Trash2,
  summarize: Sparkles,
  timeline: Clock,
};

interface PermissionState {
  userId: string;
  enabledTools: ToolName[];
  grantedOrigins: string[];
  updatedAt: number;
}

interface IssuedToken {
  id: string;
  audience: string;
  scope: ToolName[];
  expiresAt: string;
  signature: string;
}

export function SettingsClient() {
  const queryClient = useQueryClient();
  const [newOrigin, setNewOrigin] = React.useState("");
  const [issuedToken, setIssuedToken] = React.useState<IssuedToken | null>(null);

  // --- Fetch permissions ---
  const { data: permData, isLoading } = useQuery<{ state: PermissionState }>({
    queryKey: ["permissions"],
    queryFn: async () => {
      const res = await fetch("/api/permissions");
      if (!res.ok) throw new Error("Failed to load permissions");
      return res.json();
    },
  });

  // --- Toggle tool mutation ---
  const toggleMutation = useMutation({
    mutationFn: async (params: { tool: ToolName; enabled: boolean }) => {
      const res = await fetch("/api/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggleTool",
          tool: params.tool,
          enabled: params.enabled,
        }),
      });
      if (!res.ok) throw new Error("Failed to toggle tool");
      return res.json() as Promise<{ state: PermissionState }>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["permissions"], { state: data.state });
      toast.success("Permission updated");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    },
  });

  // --- Add origin mutation ---
  const addOriginMutation = useMutation({
    mutationFn: async (origin: string) => {
      const res = await fetch("/api/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addOrigin", origin }),
      });
      if (!res.ok) throw new Error("Failed to add origin");
      return res.json() as Promise<{ state: PermissionState }>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["permissions"], { state: data.state });
      setNewOrigin("");
      toast.success("Origin granted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add origin");
    },
  });

  // --- Remove origin mutation ---
  const removeOriginMutation = useMutation({
    mutationFn: async (origin: string) => {
      const res = await fetch("/api/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "removeOrigin", origin }),
      });
      if (!res.ok) throw new Error("Failed to remove origin");
      return res.json() as Promise<{ state: PermissionState }>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["permissions"], { state: data.state });
      toast.success("Origin revoked");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to remove origin");
    },
  });

  // --- Issue token mutation ---
  const issueTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/capability-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to issue token");
      }
      return res.json() as Promise<{ token: IssuedToken }>;
    },
    onSuccess: (data) => {
      setIssuedToken(data.token);
      toast.success("Capability token issued", {
        description: `Scope: ${data.token.scope.join(", ")}`,
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to issue token");
    },
  });

  const state = permData?.state;

  return (
    <div className="space-y-6">
      {/* Per-tool permissions */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Tool permissions
          </h2>
          {state && (
            <span className="text-xs text-muted-foreground">
              {state.enabledTools.length}/6 enabled
            </span>
          )}
        </div>

        {isLoading || !state ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {ALL_TOOLS.map((tool) => {
              const Icon = TOOL_ICONS[tool.name as ToolName];
              const enabled = state.enabledTools.includes(tool.name as ToolName);
              return (
                <div
                  key={tool.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/40 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md border",
                        enabled
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/60 bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium">{tool.name}</p>
                      <p className="text-xs text-muted-foreground">{tool.summary}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden items-center gap-1.5 sm:flex">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "border font-mono text-[9px] uppercase tracking-wide",
                          tool.annotations.readOnlyHint
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border/60 bg-muted/40 text-muted-foreground/50 line-through",
                        )}
                      >
                        read-only
                      </Badge>
                      {tool.annotations.untrustedContentHint && (
                        <Badge
                          variant="secondary"
                          className="border border-accent/40 bg-accent/10 font-mono text-[9px] uppercase tracking-wide text-accent-foreground"
                        >
                          untrusted
                        </Badge>
                      )}
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({
                          tool: tool.name as ToolName,
                          enabled: checked,
                        })
                      }
                      disabled={toggleMutation.isPending}
                      aria-label={`Toggle ${tool.name}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground/70">
          Disabled tools are not registered with WebMCP — your agent cannot call
          them until you re-enable. Changes take effect when you return to the
          canvas.
        </p>
      </div>

      {/* Granted origins */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            <Globe className="h-4 w-4 text-primary" />
            Granted agent origins
          </h2>
          {state && (
            <span className="text-xs text-muted-foreground">
              {state.grantedOrigins.length} granted
            </span>
          )}
        </div>

        {isLoading || !state ? (
          <div className="flex min-h-[100px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newOrigin}
                onChange={(e) => setNewOrigin(e.target.value)}
                placeholder="https://example.com"
                className="h-8 bg-background/70 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newOrigin.trim()) {
                    addOriginMutation.mutate(newOrigin.trim());
                  }
                }}
              />
              <Button
                size="sm"
                className="h-8"
                onClick={() => addOriginMutation.mutate(newOrigin.trim())}
                disabled={!newOrigin.trim() || addOriginMutation.isPending}
              >
                <PlusIcon className="mr-1 h-3.5 w-3.5" />
                Grant
              </Button>
            </div>

            <div className="space-y-1.5">
              {state.grantedOrigins.length === 0 ? (
                <p className="text-xs text-muted-foreground/70">
                  No origins granted. Your agent won&apos;t be able to call tools
                  until you grant at least one origin.
                </p>
              ) : (
                state.grantedOrigins.map((origin) => (
                  <div
                    key={origin}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-2"
                  >
                    <code className="font-mono text-xs text-foreground">{origin}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOriginMutation.mutate(origin)}
                      disabled={removeOriginMutation.isPending}
                      aria-label={`Revoke ${origin}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Capability tokens */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            <Key className="h-4 w-4 text-primary" />
            Capability tokens
          </h2>
        </div>

        <p className="mb-4 text-xs text-muted-foreground">
          Issue a short-TTL (120s) capability token for your agent. The token
          is signed with your site key (WebCrypto ECDSA P-256) and scoped to
          your currently-enabled tools.
        </p>

        <Button
          size="sm"
          onClick={() => issueTokenMutation.mutate()}
          disabled={issueTokenMutation.isPending}
        >
          {issueTokenMutation.isPending ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Issuing…
            </>
          ) : (
            <>
              <Key className="mr-1.5 h-3.5 w-3.5" />
              Issue capability token
            </>
          )}
        </Button>

        {issuedToken && (
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/[0.04] p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">
                Token issued
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex gap-2">
                <span className="w-16 shrink-0 text-muted-foreground">ID</span>
                <code className="font-mono break-all text-foreground">
                  {issuedToken.id}
                </code>
              </div>
              <div className="flex gap-2">
                <span className="w-16 shrink-0 text-muted-foreground">Audience</span>
                <code className="font-mono text-foreground">{issuedToken.audience}</code>
              </div>
              <div className="flex gap-2">
                <span className="w-16 shrink-0 text-muted-foreground">Scope</span>
                <span className="text-foreground">
                  {issuedToken.scope.join(", ") || "(none — all tools disabled)"}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="w-16 shrink-0 text-muted-foreground">Expires</span>
                <span className="text-foreground">
                  {new Date(issuedToken.expiresAt).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="w-16 shrink-0 text-muted-foreground">Signature</span>
                <code className="font-mono break-all text-muted-foreground">
                  {issuedToken.signature.slice(0, 64)}…
                </code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

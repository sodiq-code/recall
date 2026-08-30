"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Recall — TanStack Query provider.
 *
 * Wraps the app so the memory canvas (and every client component that fetches
 * from /api/*) can use useQuery / useMutation with automatic caching,
 * refetch-on-focus, and optimistic update support.
 *
 * The queryClient is created once per browser session and reused across
 * hot-reloads in dev. Stale time is 30s so the canvas doesn't refetch on
 * every tab focus during a demo, but stays fresh enough that a second tab's
 * mutations show up within half a minute.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * Recall — theme toggle.
 *
 * A compact icon button that swaps light/dark. The audit-feed glow and the
 * memory-lattice grid are tuned for dark mode (the demo default); this toggle
 * lets a judge preview the light surface.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // `mounted` is gated so the SSR markup and the first client render agree
  // on the same default state (treats the theme as dark until the client has
  // had a chance to resolve it). Without this, the aria-label / icon differ
  // between server and client on first paint and React logs a hydration
  // mismatch warning. After mount, the real resolved theme takes over.
  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="text-muted-foreground hover:text-foreground"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

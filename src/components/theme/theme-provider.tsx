"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Recall — theme provider.
 *
 * Wraps the app in next-themes so the audit feed, memory canvas, and landing
 * page support light/dark. The default is "system" with the user's preference
 * persisted; dark is the demo-preferred mode (the agent activity glow reads
 * best on a dark surface).
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

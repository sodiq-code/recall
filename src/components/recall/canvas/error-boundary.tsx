"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RecallMark } from "@/components/recall/recall-mark";

/**
 * Recall — Error Boundary.
 *
 * Catches uncaught errors in client components (React render errors,
 * thrown promises, etc.) and shows a professional "something went wrong"
 * screen with a retry button. Without this, a thrown error in any client
 * component would render a blank page.
 *
 * The boundary is placed around the interactive portions of /app (the
 * MemoryCanvas, ActivityFeed, settings client, etc.) so a failure in one
 * panel doesn't take down the whole page — the header and nav remain usable.
 */

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** A label for what section failed (shown in the error message). */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console for debugging — a production app would send this to
    // Sentry or similar.
    console.error("[recall] error boundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { label = "this section" } = this.props;
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/[0.03] p-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <p className="mt-3 text-sm font-medium">
            Something went wrong in {label}.
          </p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="outline" onClick={this.handleRetry}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Try again
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link href="/app">
                <Home className="mr-1.5 h-3.5 w-3.5" />
                Back to canvas
              </Link>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Full-page error boundary — wraps the entire /app page so a fatal error
 * in any component shows a branded error screen instead of a blank page.
 */
export function FullPageErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary label="the application">
      {children}
    </ErrorBoundary>
  );
}

import Link from "next/link";
import { Home } from "lucide-react";
import { RecallMark } from "@/components/recall/recall-mark";
import { Button } from "@/components/ui/button";

/**
 * Recall — branded 404.
 *
 * Every nav link that points at a route built on a later day (e.g. /app on
 * Day 1) lands here rather than the default Next.js 404. Keeps the scaffold
 * polished from the first commit.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <RecallMark withWordmark className="mb-8" />
      <p className="font-mono text-sm uppercase tracking-widest text-primary">
        404
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        That memory isn&apos;t here yet.
      </h1>
      <p className="mt-4 max-w-md text-pretty text-muted-foreground">
        This route is part of the Recall build-out and ships on a later day.
        The landing page and docs are ready now.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">
          <Home className="mr-2 h-4 w-4" />
          Back to Recall
        </Link>
      </Button>
    </div>
  );
}

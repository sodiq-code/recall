import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Recall — brand mark.
 *
 * A rounded square holding a "recall loop": an arc that returns to its origin
 * with a node, evoking memory that comes back to you. Drawn in currentColor so
 * it inherits the text color; the dot is filled with the primary accent.
 */
export function RecallMark({
  className,
  withWordmark = false,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 select-none",
        withWordmark && "font-semibold tracking-tight",
        className,
      )}
    >
      <svg
        viewBox="0 0 32 32"
        className="h-7 w-7"
        role="img"
        aria-label="Recall"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="8"
          className="fill-primary"
        />
        <rect
          x="1.5"
          y="1.5"
          width="29"
          height="29"
          rx="7.5"
          stroke="oklch(1 0 0 / 18%)"
          strokeWidth="1"
        />
        {/* Recall loop — an arc returning to its origin */}
        <path
          d="M10 16a6 6 0 1 1 6 6"
          stroke="oklch(0.99 0.01 95)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M15.5 21.5 16 25l-3.5-1.5"
          stroke="oklch(0.99 0.01 95)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="22" cy="10" r="2.6" className="fill-accent" />
      </svg>
      {withWordmark && (
        <span className="text-lg leading-none">Recall</span>
      )}
    </span>
  );
}

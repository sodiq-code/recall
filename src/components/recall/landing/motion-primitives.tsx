"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Recall — framer-motion entrance primitives.
 *
 * Three small, composable wrappers used across the landing sections to give
 * the page a tasteful "fade-up on scroll" rhythm. They are deliberately
 * restrained: 0.5s ease-out, ~16px offset, no spring physics, no parallax. The
 * goal is "this feels premium" — restrained, not flashy.
 *
 * Accessibility:
 *   - Each primitive calls `useReducedMotion()`; when the user has requested
 *     reduced motion, the animation collapses to a plain element (no
 *     transform, no opacity change) so the page still works perfectly.
 *   - Animations run `once: true` so re-scrolling does not retrigger.
 *
 * Composition:
 *   - `<Reveal>` for a single block-level fade-up (used by section intros).
 *   - `<StaggerGroup>` + `<StaggerItem>` for grids of cards.
 *
 * These are client components, but they are safe to import from server
 * components — React renders them as client islands with server-rendered
 * children passed through.
 */

const EASE_OUT = "easeOut" as const;
const REVEAL_DURATION = 0.5; // seconds
const REVEAL_OFFSET = 16; // px
const VIEWPORT_MARGIN = "-80px";

const itemVariants: Variants = {
  hidden: { opacity: 0, y: REVEAL_OFFSET },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: REVEAL_DURATION, ease: EASE_OUT },
  },
};

type IntrinsicTag = "div" | "section" | "li" | "span" | "ol" | "ul";

function renderReduced(
  as: IntrinsicTag,
  className: string | undefined,
  children: React.ReactNode,
) {
  // Use createElement so TS does not complain about a dynamic JSX tag.
  return React.createElement(as, { className }, children);
}

export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: IntrinsicTag;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return renderReduced(as, className, children);
  }

  const MotionComponent =
    as === "li" ? motion.li : as === "section" ? motion.section : motion.div;

  return (
    <MotionComponent
      className={className}
      initial={{ opacity: 0, y: REVEAL_OFFSET }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: VIEWPORT_MARGIN }}
      transition={{ duration: REVEAL_DURATION, ease: EASE_OUT, delay }}
    >
      {children}
    </MotionComponent>
  );
}

export function StaggerGroup({
  children,
  className,
  stagger = 0.08,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  as?: Extract<IntrinsicTag, "div" | "section" | "ol" | "ul">;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return renderReduced(as, className, children);
  }

  const MotionComponent =
    as === "section"
      ? motion.section
      : as === "ol"
        ? motion.ol
        : as === "ul"
          ? motion.ul
          : motion.div;

  return (
    <MotionComponent
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: VIEWPORT_MARGIN }}
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: stagger, delayChildren: 0.04 },
        },
      }}
    >
      {children}
    </MotionComponent>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: Extract<IntrinsicTag, "div" | "li">;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return renderReduced(as, className, children);
  }

  const MotionComponent = as === "li" ? motion.li : motion.div;

  return (
    <MotionComponent className={className} variants={itemVariants}>
      {children}
    </MotionComponent>
  );
}

/**
 * LiftOnHover — a small wrapper that adds a tasteful -2px hover lift plus a
 * smooth transition. Kept separate so the hover treatment is opt-in per card
 * and so it composes cleanly with StaggerItem (which only handles entrance).
 */
export function LiftOnHover({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out",
        "hover:-translate-y-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

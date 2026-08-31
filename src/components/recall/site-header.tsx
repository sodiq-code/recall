import Link from "next/link";
import { Github, BookOpen, PlayCircle } from "lucide-react";
import { RecallMark } from "./recall-mark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { authConfigured } from "@/lib/env";

/**
 * Recall — site header.
 *
 * Anchored at the top of every public page. The header is intentionally quiet
 * so the hero owns the first impression; it carries the mark, a single
 * primary nav link (Docs), the theme toggle, the repo link, and the Connect
 * CTA. The CTA's destination flips to /login once GitHub OAuth is configured
 * ; until then it points at the repo so it is never a dead
 * end.
 */
export function SiteHeader() {
  const ctaHref = authConfigured ? "/login" : "https://github.com/sodiq-code/recall";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Recall home"
        >
          <RecallMark withWordmark />
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Primary">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground hover:text-foreground"
          >
            <Link href="/playground">
              <PlayCircle className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Playground</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground hover:text-foreground"
          >
            <Link href="/docs">
              <BookOpen className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Docs</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            <a
              href="https://webmcp.devpost.com/"
              target="_blank"
              rel="noreferrer"
            >
              <span>WebMCP Challenge</span>
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground hover:text-foreground"
          >
            <a
              href="https://github.com/sodiq-code/recall"
              target="_blank"
              rel="noreferrer"
              aria-label="Recall on GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>
          <ThemeToggle />
          <Button size="sm" asChild className="ml-1">
            <Link href={ctaHref}>
              <span className="sm:hidden">Connect</span>
              <span className="hidden sm:inline">Connect ChatGPT</span>
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

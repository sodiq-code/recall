import Link from "next/link";
import { Github, BookOpen, PlayCircle, LogOut, User } from "lucide-react";
import { RecallMark } from "./recall-mark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSessionUser } from "@/lib/auth/session";

/**
 * Recall — site header.
 *
 * Session-aware: shows "Connect ChatGPT" (→ /login) when signed out,
 * and the user's avatar + "Sign out" when signed in. The CTA flips
 * based on the session state.
 */
export async function SiteHeader() {
  const user = await getSessionUser();

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
              <span>WebMCP</span>
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

          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="ml-1 gap-2"
              >
                <Link href="/app">
                  <Avatar className="h-6 w-6">
                    {user.avatarUrl && (
                      <AvatarImage src={user.avatarUrl} alt={user.name ?? user.email} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      {(user.name ?? user.email)[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[120px] truncate sm:inline">
                    {user.name ?? user.email.split("@")[0]}
                  </span>
                </Link>
              </Button>
            </>
          ) : (
            <Button size="sm" asChild className="ml-1">
              <Link href="/login">
                <span className="sm:hidden">Connect</span>
                <span className="hidden sm:inline">Connect ChatGPT</span>
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

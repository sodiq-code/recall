import Link from "next/link";
import { Github } from "lucide-react";
import { RecallMark } from "./recall-mark";
import { APP_VERSION } from "@/lib/constants";

/**
 * Recall — site footer.
 *
 * Sticky to the bottom on short pages (the wrapper in layout/page applies
 * min-h-screen + flex-col, this is the mt-auto element) and pushed down
 * naturally on long pages. Carries the compact sitemap, the sponsor-stack
 * callouts, the repo link, and the version + license note.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <RecallMark withWordmark />
            <p className="max-w-xs text-sm text-muted-foreground">
              The first transparent, controllable memory layer for your
              ChatGPT agent — built natively on WebMCP.
            </p>
          </div>

          <FooterColumn
            title="Product"
            links={[
              { label: "Overview", href: "/" },
              { label: "Tool playground", href: "/playground" },
              { label: "Docs", href: "/docs" },
              { label: "Memory canvas", href: "/app" },
              { label: "Settings", href: "/app/settings" },
            ]}
          />

          <FooterColumn
            title="Built on"
            links={[
              { label: "WebMCP spec", href: "https://webmcp.devpost.com/" },
              { label: "Next.js 16", href: "https://nextjs.org/" },
              { label: "shadcn/ui", href: "https://ui.shadcn.com/" },
              { label: "Prisma", href: "https://www.prisma.io/" },
            ]}
            external
          />

          <FooterColumn
            title="Challenge"
            links={[
              { label: "WebMCP Challenge", href: "https://webmcp.devpost.com/" },
              { label: "Rules", href: "https://webmcp.devpost.com/rules" },
              { label: "Resources", href: "https://webmcp.devpost.com/resources" },
              { label: "Project gallery", href: "https://webmcp.devpost.com/project-gallery" },
            ]}
            external
          />
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} Recall. Released under the MIT
            License.
          </p>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs">v{APP_VERSION}</span>
            <a
              href="https://github.com/sodiq-code/recall"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <Github className="h-4 w-4" />
              <span>sodiq-code/recall</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
  external,
}: {
  title: string;
  links: { label: string; href: string }[];
  external?: boolean;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { EyeOff, Trash2, FileQuestion, Link2Off } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem, LiftOnHover } from "./motion-primitives";

/**
 * Recall — "the problem" section.
 *
 * The four concrete failures of ChatGPT's opaque memory, drawn from the
 * . Each is a sentence a target user would say, not
 * abstract complaint — so a judge reads it as a real pain, not marketing.
 */
const FAILURES = [
  {
    icon: EyeOff,
    title: "You can't see what it knows.",
    body: "Memory edits are a flat list with no search, no context, no provenance. There is no API.",
  },
  {
    icon: Trash2,
    title: "Edits are destructive.",
    body: "Deleted facts are gone forever. There's no rollback, no history, no receipt.",
  },
  {
    icon: FileQuestion,
    title: "No way to verify a response.",
    body: "ChatGPT claims it 'remembered' something — you cannot check which fact was used, or when.",
  },
  {
    icon: Link2Off,
    title: "Locked to one agent.",
    body: "Memory built in ChatGPT cannot travel with you to Claude, Gemini, or your own agent app.",
  },
];

export function Problem() {
  return (
    <section className="border-t border-border/60 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              The problem
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              ChatGPT&apos;s memory is a black box.
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              Power users waste time re-explaining context ChatGPT should
              remember. Professionals avoid using memory for sensitive client
              work because they cannot audit it. And every agent app that wants
              memory today has to build its own — from scratch.
            </p>
          </div>
        </Reveal>

        <StaggerGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FAILURES.map((f) => (
            <StaggerItem key={f.title}>
              <LiftOnHover className="h-full rounded-xl border border-border/60 bg-card/50 p-5 transition-colors hover:border-border hover:bg-card">
                <f.icon className="h-5 w-5 text-muted-foreground" />
                <h3 className="mt-4 text-base font-medium">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </LiftOnHover>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

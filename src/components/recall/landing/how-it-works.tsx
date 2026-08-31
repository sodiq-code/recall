import { LogIn, Brain, MessageSquare, ScrollText } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem, LiftOnHover } from "./motion-primitives";

/**
 * Recall — "how it works" section.
 *
 * The four-step user journey . Each step is one
 * sentence so a judge can trace the demo from sign-up to audited answer in a
 * single glance.
 */
const STEPS = [
  {
    icon: LogIn,
    title: "Sign in once.",
    body: "Authenticate at recall.app. GitHub OAuth is used for authentication. ChatGPT OAuth will be added when available to third parties.",
  },
  {
    icon: Brain,
    title: "See your memory.",
    body: "Recall renders your facts as a canvas of editable, taggable cards. Add, edit, or forget any fact directly — nothing is hidden.",
  },
  {
    icon: MessageSquare,
    title: "Ask ChatGPT anything.",
    body: "Open ChatGPT in its in-app browser. ChatGPT calls recall(query=…), addFact(…), or forgetFact(…) through the WebMCP tools Recall registered.",
  },
  {
    icon: ScrollText,
    title: "Audit every call.",
    body: "Every tool call appears in your activity feed in real time, signed and reversible. Export the whole log as a verifiable JSON bundle.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-border/60 bg-muted/30 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              How it works
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              From sign-in to audited answer in four steps.
            </h2>
          </div>
        </Reveal>

        <StaggerGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" as="ol">
          {STEPS.map((step, i) => (
            <StaggerItem key={step.title} as="li">
              <LiftOnHover className="relative h-full rounded-xl border border-border/60 bg-card/70 p-5 backdrop-blur transition-colors hover:border-primary/40">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-medium text-primary">
                    {i + 1}
                  </div>
                  <step.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-base font-medium">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </LiftOnHover>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

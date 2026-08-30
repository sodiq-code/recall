/**
 * Recall — WebMCP HTML attribute type augmentation.
 *
 * The WebMCP spec introduces new HTML attributes for declarative tool
 * registration: `toolname`, `tooldescription`, `toolautosubmit`, and
 * `toolparamdescription`. These aren't in React's TypeScript types yet
 * (they're an emerging standard), so we augment the HTML element interfaces
 * to accept them.
 *
 * Spec: https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md
 */

declare module "react" {
  interface HTMLAttributes<T> {
    /** The WebMCP tool name (analogous to ModelContextTool.name). */
    toolname?: string;
    /** A natural-language description of the tool's functionality. */
    tooldescription?: string;
    /** Lets the agent submit the form after filling it out. */
    toolautosubmit?: boolean;
    /** A description for each form property (analogous to JSON Schema
     *  property descriptions). */
    toolparamdescription?: string;
  }
}

export {};

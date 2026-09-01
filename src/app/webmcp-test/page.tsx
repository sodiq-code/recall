"use client";

import * as React from "react";

/**
 * A standalone WebMCP diagnostic page. Tests each tool registration
 * individually and reports the exact error if one fails.
 */
export default function WebMCPTestPage() {
  const [results, setResults] = React.useState<string[]>(["Running diagnostics..."]);

  React.useEffect(() => {
    async function run() {
      const logs: string[] = [];
      const supported = typeof document !== "undefined" && "modelContext" in document;
      logs.push(`WebMCP supported: ${supported}`);
      logs.push(`Chrome version: ${navigator.userAgent.match(/Chrome\/([0-9]+)/)?.[1] || "unknown"}`);
      logs.push("");

      if (!supported) {
        logs.push("Enable chrome://flags/#enable-webmcp-testing in Chrome 149+");
        setResults(logs);
        return;
      }

      const tools = [
        { name: "query", description: "Test query", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }, execute: async () => "ok" },
        { name: "addFact", description: "Test add", inputSchema: { type: "object", properties: { content: { type: "string" } }, required: ["content"] }, execute: async () => "ok" },
        { name: "updateFact", description: "Test update", inputSchema: { type: "object", properties: { factId: { type: "string" } }, required: ["factId"] }, execute: async () => "ok" },
        { name: "forgetFact", description: "Test forget", inputSchema: { type: "object", properties: { factId: { type: "string" } }, required: ["factId"] }, execute: async () => "ok" },
        { name: "summarize", description: "Test summarize", inputSchema: { type: "object", properties: {} }, execute: async () => "ok" },
        { name: "timeline", description: "Test timeline", inputSchema: { type: "object", properties: { limit: { type: "integer" } } }, execute: async () => "ok" },
      ];

      logs.push("=== Sequential registration (all stay registered) ===");
      const controllers: AbortController[] = [];
      let count = 0;
      for (const tool of tools) {
        try {
          const ac = new AbortController();
          controllers.push(ac);
          await document.modelContext!.registerTool(tool as any, { signal: ac.signal });
          logs.push(`✅ ${tool.name}: registered`);
          count++;
        } catch (err: any) {
          logs.push(`❌ ${tool.name}: ${err?.message || err?.name || String(err)}`);
        }
      }
      logs.push(`Result: ${count}/6 registered`);

      for (const ac of controllers) {
        try { ac.abort(); } catch {}
      }
      logs.push("All tools unregistered. Done!");
      setResults(logs);
    }
    run();
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace", fontSize: "14px", maxWidth: "900px", margin: "0 auto" }}>
      <h1>WebMCP Diagnostics</h1>
      <pre style={{ whiteSpace: "pre-wrap", background: "#1a1a1a", color: "#0f0", padding: "1rem", borderRadius: "8px", fontSize: "12px" }}>
        {results.join("\n")}
      </pre>
    </div>
  );
}

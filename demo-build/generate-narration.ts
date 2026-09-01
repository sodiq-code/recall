/**
 * Generate the new query segment narration with xiaochen voice at 1.05x speed.
 *
 * Visual timeline (24s, trimmed from the new screen recording):
 *   0-4s:   Memory Insights dashboard (6 facts, tool calls chart)
 *   4-6s:   Scroll down to Agent tool-call simulator
 *   6-8s:   Panel expands, query tool selected
 *   8-10s:  CALL ARGS (JSON) appears with { "query": "hobbies" }
 *   10-12s: User selects "hobbies" text
 *   12-14s: Types "like"
 *   14-16s: Call query() button visible, cursor hovers
 *   16-17s: Button clicked → calling… spinner
 *   17-18s: Response appears (661ms, green checkmark)
 *   18-22s: JSON response shown (fact: "I like rock climbing")
 *   22-24s: Scroll up to Memory Canvas, activity feed updates, green banner
 *
 * Narration script (split into 3 chunks for the 1024-char limit):
 *   Chunk 1 (0-8s):   "The query tool searches both content and tags. I'll call it from the simulator — the same handlers ChatGPT uses."
 *   Chunk 2 (8-16s):  "I'll query for 'like'. The request runs through the page sandbox, authenticated as the signed-in user."
 *   Chunk 3 (16-24s): "Six hundred milliseconds later, the matching fact appears. The activity feed records the call in real time — signed and traceable."
 *
 * Total ~24s at xiaochen 1.05x.
 */
import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const chunks = [
  {
    name: "query_narr_1",
    text: "The query tool searches both content and tags. I'll call it from the simulator — the same handlers ChatGPT uses.",
  },
  {
    name: "query_narr_2",
    text: "I'll query for 'like'. The request runs through the page sandbox, authenticated as the signed-in user.",
  },
  {
    name: "query_narr_3",
    text: "Six hundred milliseconds later, the matching fact appears. The activity feed records the call in real time — signed and traceable.",
  },
];

async function main() {
  const zai = await ZAI.create();
  for (const chunk of chunks) {
    console.log(`Generating: ${chunk.name} (${chunk.text.length} chars)`);
    const response = await zai.audio.tts.create({
      input: chunk.text,
      voice: "xiaochen",
      speed: 1.05,
      response_format: "wav",
      stream: false,
    });
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    const outPath = `/home/z/my-project/demo-build/${chunk.name}.wav`;
    fs.writeFileSync(outPath, buffer);
    console.log(`  → saved ${outPath} (${buffer.length} bytes)`);
  }
  console.log("All narration chunks generated.");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});

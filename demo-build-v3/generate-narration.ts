import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const chunks = [
  {
    name: "gov_narr_1",
    text: "And the user is always in control. Disable any tool in Settings —",
  },
  {
    name: "gov_narr_2",
    text: "the agent is immediately blocked from calling it. Try again — blocked.",
  },
  {
    name: "gov_narr_3",
    text: "Re-enable it, and the agent can write again. Your AI, your memory, your rules.",
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
    const outPath = `/home/z/my-project/demo-build-v3/${chunk.name}.wav`;
    fs.writeFileSync(outPath, buffer);
    console.log(`  → saved ${outPath} (${buffer.length} bytes)`);
  }
  console.log("All narration chunks generated.");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});

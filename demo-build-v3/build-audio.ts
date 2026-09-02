import { execSync } from "node:child_process";

const OUT = "/home/z/my-project/demo-build-v3/gov_narration_full.wav";

// Placement:
// Chunk 1 (3.95s): start at 0.0s → "And the user is always in control. Disable any tool in Settings —"
//   - Toggle OFF happens at ~4s → narration ends at 3.95s ✓
// Chunk 2 (3.98s): start at 4.0s → "the agent is immediately blocked from calling it. Try again — blocked."
//   - ERROR appears at ~6s into beat2 (11s total) → "blocked" lands at ~8s ✓
// Chunk 3 (6.21s): start at 11.0s → "Re-enable it, and the agent can write again. Your AI, your memory, your rules."
//   - Toggle ON at ~12s, SUCCESS at ~15s, "your rules" at ~17s ✓
// Total: 17.21s narration in a 17.57s video → 0.36s natural silence at end

const filter = [
  "[0:a]adelay=0|0,apad=pad_dur=0[a1]",
  "[1:a]adelay=4000|4000,apad=pad_dur=0[a2]",
  "[2:a]adelay=11000|11000,apad=pad_dur=0[a3]",
  "[a1][a2][a3]amix=inputs=3:duration=longest:normalize=0[mixed]",
  "[mixed]atrim=0:17.57,asetpts=N/SR/TB[out]",
].join(";");

const cmd = [
  "ffmpeg -y",
  "-i /home/z/my-project/demo-build-v3/gov_narr_1.wav",
  "-i /home/z/my-project/demo-build-v3/gov_narr_2.wav",
  "-i /home/z/my-project/demo-build-v3/gov_narr_3.wav",
  `-filter_complex "${filter}"`,
  "-map [out]",
  "-c:a pcm_s16le -ar 24000 -ac 1",
  OUT,
].join(" ");

console.log("Building narration track...");
execSync(cmd, { stdio: "inherit" });

const dur = execSync(
  `ffprobe -v error -show_entries format=duration -of csv=p=0 ${OUT}`,
).toString().trim();
console.log(`\nFinal narration track: ${dur}s (target: 17.57s)`);

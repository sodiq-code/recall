/**
 * Build the query segment audio track with precise timing.
 *
 * Visual timeline (24s video):
 *   0.0s:  Memory Insights dashboard
 *   4.0s:  Scroll to simulator
 *   6.0s:  Panel expands
 *   8.0s:  CALL ARGS appears (hobbies)
 *   10.0s: Select "hobbies"
 *   12.0s: Type "like"
 *   14.0s: Button ready
 *   16.0s: Click → calling…
 *   17.0s: Response (661ms)
 *   18.0s: JSON visible
 *   22.0s: Canvas + activity feed
 *   24.0s: End
 *
 * Narration chunks:
 *   Chunk 1: 8.79s — "The query tool searches both content and tags. I'll call it from the simulator — the same handlers ChatGPT uses."
 *   Chunk 2: 6.84s — "I'll query for 'like'. The request runs through the page sandbox, authenticated as the signed-in user."
 *   Chunk 3: 7.97s — "Six hundred milliseconds later, the matching fact appears. The activity feed records the call in real time — signed and traceable."
 *
 * Placement (start times):
 *   Chunk 1 starts at 0.0s  → ends at 8.79s  (covers dashboard + scroll + simulator + query tool)
 *      - 0.3s lead-in silence for natural pace
 *   Chunk 2 starts at 9.0s  → ends at 15.84s (covers typing "like" + button ready)
 *      - 0.21s gap after chunk 1 (natural breath)
 *   Chunk 3 starts at 16.0s → ends at 23.97s (covers click + response + canvas + activity feed)
 *      - 0.16s gap (aligns with the click moment)
 *      - Ends at 23.97s, leaving 0.03s before the 24s cut — clean transition
 *
 * Total audio: 24.0s (matches video exactly)
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const OUT = "/home/z/my-project/demo-build/query_narration_full.wav";

// Build a complex filter graph that places each chunk at its offset
// and pads to exactly 24.0s.
const filter = [
  "[0:a]adelay=300|300,apad=pad_dur=0[a1]", // chunk1 at 0.3s
  "[1:a]adelay=9000|9000,apad=pad_dur=0[a2]", // chunk2 at 9.0s
  "[2:a]adelay=16000|16000,apad=pad_dur=0[a3]", // chunk3 at 16.0s
  "[a1][a2][a3]amix=inputs=3:duration=longest:normalize=0[mixed]",
  "[mixed]atrim=0:24,asetpts=N/SR/TB[out]",
].join(";");

const cmd = [
  "ffmpeg -y",
  "-i /home/z/my-project/demo-build/query_narr_1.wav",
  "-i /home/z/my-project/demo-build/query_narr_2.wav",
  "-i /home/z/my-project/demo-build/query_narr_3.wav",
  `-filter_complex "${filter}"`,
  "-map [out]",
  "-c:a pcm_s16le -ar 24000 -ac 1",
  OUT,
].join(" ");

console.log("Running:", cmd);
execSync(cmd, { stdio: "inherit" });

// Verify duration
const dur = execSync(
  `ffprobe -v error -show_entries format=duration -of csv=p=0 ${OUT}`,
).toString().trim();
console.log(`\nFinal narration track: ${dur}s (target: 24.0s)`);

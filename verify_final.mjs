// Final single-call verification with a longer pre-wait.
import ZAI from '/home/z/.bun/install/global/node_modules/z-ai-web-dev-sdk/dist/index.js';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function pngToDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function main() {
  const zai = await ZAI.create();

  // Extract lossless PNGs at key moments
  const targets = [
    { t: 12.0, name: 'v12' },
    { t: 14.0, name: 'v14' },
    { t: 17.5, name: 'v175' },
    { t: 18.0, name: 'v180' },
  ];
  for (const { t, name } of targets) {
    const fname = `/tmp/recall_frames/${name}.png`;
    fs.rmSync(fname, { force: true });
    spawnSync('ffmpeg', ['-y', '-i', '/tmp/recall_query.mp4', '-ss', String(t), '-frames:v', '1', fname], { stdio: 'ignore' });
  }
  await new Promise(r => setTimeout(r, 1000));

  // Single batched call
  const content = [{ type: 'text', text:
    `Below are 4 high-resolution PNG frames from the Recall web app.

Frame 1: t=12.0s — user is editing the JSON input
Frame 2: t=14.0s — user finished editing, button ready
Frame 3: t=17.5s — response just appeared
Frame 4: t=18.0s — response settled

For EACH frame, answer these specific questions, quoting text VERBATIM:

=== Frame 1 (t=12.0s) ===
Q1. The exact text inside the "CALL ARGS (JSON)" input field — character for character.
Q2. Is any text highlighted/selected (blue background)?
Q3. Does the input have a focus border?
Q4. The exact text in small grey font next to where the "Call query()" button is (or will be).

=== Frame 2 (t=14.0s) ===
(Same Q1-Q4)

=== Frame 3 (t=17.5s) ===
Q1. The exact response-time value shown on the right of the RESPONSE header — look VERY carefully. Is it "661ms" or "681ms" or some other number?
Q2. The exact text on the button — "Call query()" or "calling..."?
Q3. Has the JSON response body started rendering yet? If yes, what is visible?
Q4. The exact text in small grey font next to the button.

=== Frame 4 (t=18.0s) ===
Q1. The exact response-time value — same careful look. "661ms" or "681ms"?
Q2. The exact text on the button.
Q3. The COMPLETE JSON response body visible on screen — every character. List every fact in the "facts" array with: id, content, tags, source, sourceOrigin, capabilityTokenId, and any other visible fields.
Q4. The exact text in small grey font next to the button.

The CRITICAL questions to answer at the end:
A. Is the response time "661ms" or "681ms"? (These have appeared in different readings — please look carefully at the digit between "6" and "1".)
B. How many facts are in the returned JSON response? List each fact's "content" field.
C. What was the user's exact query string at t=12s vs t=14s? Did they type "like" or "11ke" or both?` }];

  for (const name of ['v12', 'v14', 'v175', 'v180']) {
    const p = `/tmp/recall_frames/${name}.png`;
    if (fs.existsSync(p)) {
      content.push({ type: 'image_url', image_url: { url: pngToDataUrl(p) } });
    } else {
      console.log(`MISSING: ${p}`);
    }
  }

  try {
    const response = await zai.chat.completions.createVision({
      messages: [{ role: 'user', content }],
      thinking: { type: 'enabled' },
    });
    console.log('=== FINAL VERIFICATION ===\n');
    console.log(response.choices[0]?.message?.content || '(no content)');
  } catch (e) {
    console.log(`[ERROR] ${e.message}`);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

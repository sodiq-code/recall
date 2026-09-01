// Analyze Recall video recording using z-ai-web-dev-sdk
// Sends each per-second frame to vision API for precise per-second analysis.

import ZAI from '/home/z/.bun/install/global/node_modules/z-ai-web-dev-sdk/dist/index.js';
import fs from 'node:fs';
import path from 'node:path';

const FRAMES_DIR = '/tmp/recall_frames';
const VIDEO_PATH = '/tmp/recall_query.mp4';

// sec_01.jpg = t=0s, sec_02.jpg = t=1s, ..., sec_29.jpg = t=28s, sec_30.jpg = t=29s
function frameToDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

function videoToDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:video/mp4;base64,${buf.toString('base64')}`;
}

async function analyzeFullVideo(zai) {
  const videoUrl = videoToDataUrl(VIDEO_PATH);
  console.log(`[FULL VIDEO] file size: ${(fs.statSync(VIDEO_PATH).size/1024/1024).toFixed(2)} MB, base64 length: ${videoUrl.length}`);

  const prompt = `This is a screen recording (29.3s, 1376x736, 60fps) of the "Recall" web app — a WebMCP memory layer for ChatGPT. The recording shows a "WebMCP Test Panel" UI where someone demonstrates the "query" tool.

Please provide a SECOND-BY-SECOND breakdown. For each second from 0s through 29s, describe:
1. What UI elements are visible (input field, buttons, panels, banners, result cards)
2. What action is happening (idle, typing in input, button hover, click, results rendering)
3. The exact text/content shown on screen — quote text verbatim where possible (the query string, button labels, banner messages, fact text, badges, response-time indicators)

CRITICAL details to capture precisely:
- The exact moment the query input field is focused and the cursor appears
- The exact query string being typed (character by character if visible — e.g. "hobbies", "paris", "vacation")
- The exact moment the "Call query()" button (or similar) is clicked
- The exact moment results begin appearing
- Whether there is an amber/yellow "Fallback results" banner — when it appears, and the full text of any note inside it
- The exact text of EACH fact returned (quote verbatim)
- Any response-time indicator (e.g. "12ms", "45ms")
- The overall WebMCP test panel layout: title, description, tool dropdown/selector, input fields, run button, results area
- Any badges or status indicators (e.g. "WebMCP", "Ready", "Success")

Format your response as a numbered list: "0s: ...", "1s: ...", ..., "29s: ...". Be extremely precise and thorough — this will be used to write narration for a demo video.`;

  try {
    const response = await zai.chat.completions.createVision({
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'video_url', video_url: { url: videoUrl } },
        ],
      }],
      thinking: { type: 'enabled' },
    });
    return response.choices[0]?.message?.content || '(no content)';
  } catch (e) {
    return `[FULL VIDEO ERROR] ${e.message}`;
  }
}

async function analyzeFrameBatch(zai, frames, startSec) {
  const content = [{ type: 'text', text:
    `Below are ${frames.length} consecutive frames from a 29-second screen recording of the "Recall" web app (a WebMCP memory layer). Frame 1 in this batch corresponds to t=${startSec}s, Frame 2 to t=${startSec+1}s, etc.

For EACH frame, describe in extreme detail:
1. The visible UI: layout, panels, buttons, input fields, banners, result cards, badges
2. Any text shown on screen — quote VERBATIM (the query input text, button labels, banner messages, fact text, response-time numbers, page title, etc.)
3. Any visual cue indicating an action (cursor in input field, button highlighted/pressed, results animating in, scroll position)

Format as:
Frame 1 (t=${startSec}s): ...
Frame 2 (t=${startSec+1}s): ...
...etc

Be extremely precise — every visible word matters.` }];

  for (const f of frames) {
    content.push({
      type: 'image_url',
      image_url: { url: frameToDataUrl(f.path) },
    });
  }

  try {
    const response = await zai.chat.completions.createVision({
      messages: [{ role: 'user', content }],
      thinking: { type: 'enabled' },
    });
    return response.choices[0]?.message?.content || '(no content)';
  } catch (e) {
    return `[BATCH ERROR starting at ${startSec}s] ${e.message}`;
  }
}

async function main() {
  const zai = await ZAI.create();

  const frames = [];
  for (let i = 1; i <= 30; i++) {
    const num = String(i).padStart(2, '0');
    const p = path.join(FRAMES_DIR, `sec_${num}.jpg`);
    if (fs.existsSync(p)) {
      frames.push({ sec: i - 1, path: p });
    }
  }
  console.log(`Found ${frames.length} frames. First: t=${frames[0].sec}s, Last: t=${frames[frames.length-1].sec}s`);

  console.log('\n=== ANALYZING FULL VIDEO ===');
  const fullResult = await analyzeFullVideo(zai);
  console.log(fullResult);

  const BATCH_SIZE = 6;
  console.log(`\n\n=== ANALYZING ${frames.length} FRAMES IN BATCHES OF ${BATCH_SIZE} ===`);
  for (let i = 0; i < frames.length; i += BATCH_SIZE) {
    const batch = frames.slice(i, i + BATCH_SIZE);
    const startSec = batch[0].sec;
    console.log(`\n--- Batch starting at t=${startSec}s (${batch.length} frames) ---`);
    const result = await analyzeFrameBatch(zai, batch, startSec);
    console.log(result);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

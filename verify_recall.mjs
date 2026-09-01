// Final verification: PNG-quality frames at t=17, 17.5, 18, 18.5, 12, 14 for response-time + typing sequence.
import ZAI from '/home/z/.bun/install/global/node_modules/z-ai-web-dev-sdk/dist/index.js';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function pngToDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function analyzeOne(zai, imagePath, label, prompt) {
  const dataUrl = pngToDataUrl(imagePath);
  console.log(`\n=== ${label} ===`);
  try {
    const response = await zai.chat.completions.createVision({
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      }],
      thinking: { type: 'enabled' },
    });
    console.log(response.choices[0]?.message?.content || '(no content)');
  } catch (e) {
    console.log(`[ERROR] ${e.message}`);
  }
}

async function main() {
  const zai = await ZAI.create();

  // Extract lossless PNGs at the critical moments
  const targets = [
    { t: 12.0, name: 'verify_12_0' },
    { t: 13.0, name: 'verify_13_0' },
    { t: 14.0, name: 'verify_14_0' },
    { t: 17.0, name: 'verify_17_0' },
    { t: 17.3, name: 'verify_17_3' },
    { t: 17.6, name: 'verify_17_6' },
    { t: 18.0, name: 'verify_18_0' },
    { t: 18.5, name: 'verify_18_5' },
    { t: 19.0, name: 'verify_19_0' },
  ];
  for (const { t, name } of targets) {
    const fname = `/tmp/recall_frames/${name}.png`;
    fs.rmSync(fname, { force: true });
    spawnSync('ffmpeg', ['-y', '-i', '/tmp/recall_query.mp4', '-ss', String(t), '-frames:v', '1', fname], { stdio: 'ignore' });
  }
  // tiny delay to let fs settle
  await new Promise(r => setTimeout(r, 500));

  // 1. RESPONSE TIME verification at multiple sub-second timestamps
  const respFrames = [];
  for (const t of [17.0, 17.3, 17.6, 18.0, 18.5, 19.0]) {
    const fname = `/tmp/recall_frames/verify_${t.toString().replace('.', '_')}.png`;
    if (fs.existsSync(fname)) respFrames.push({ t, path: fname });
  }
  if (respFrames.length > 0) {
    const content = [{ type: 'text', text:
      `Below are ${respFrames.length} consecutive frames showing the RESPONSE section of a Recall web app tool call, captured at sub-second intervals. Frame 1 = t=${respFrames[0].t}s, Frame 2 = t=${respFrames[1].t}s, etc.

For EACH frame, look very carefully at the response-time indicator on the right side of the RESPONSE header (next to a green checkmark). Report:
- The EXACT response-time value shown (e.g. "661ms", "681ms", "0ms" if still loading)
- The EXACT text on the button below (e.g. "Call query()" or "calling...")
- Whether a JSON response body has started rendering
- If JSON is visible, list ALL complete and partial fact entries you can see (with their content text, tags, source, sourceOrigin, etc.)
- Any other metadata visible (e.g. text next to the button like "as chatgpt.com → recall.app")

Format as:
Frame 1 (t=${respFrames[0].t}s): response_time="...", button="...", json_visible=true/false, facts=[...], meta="..."
...

Pay extra attention to whether the response time changes between frames (it should be stable once the call completes).` }];
    for (const f of respFrames) {
      content.push({ type: 'image_url', image_url: { url: pngToDataUrl(f.path) } });
    }
    try {
      const response = await zai.chat.completions.createVision({
        messages: [{ role: 'user', content }],
        thinking: { type: 'enabled' },
      });
      console.log('=== RESPONSE TIME + FACTS VERIFICATION ===');
      console.log(response.choices[0]?.message?.content || '(no content)');
    } catch (e) {
      console.log(`[VERIFY ERROR] ${e.message}`);
    }
  }

  // 2. TYPING SEQUENCE verification at t=12, 13, 14
  const typeFrames = [];
  for (const t of [12.0, 13.0, 14.0]) {
    const fname = `/tmp/recall_frames/verify_${t.toString().replace('.', '_')}.png`;
    if (fs.existsSync(fname)) typeFrames.push({ t, path: fname });
  }
  if (typeFrames.length > 0) {
    const content = [{ type: 'text', text:
      `Below are 3 frames showing the user editing the JSON input field in the Recall web app. Frame 1 = t=12.0s, Frame 2 = t=13.0s, Frame 3 = t=14.0s.

For EACH frame, look very carefully at the text inside the "CALL ARGS (JSON)" input field. Report:
- The EXACT text inside the input field (quote character-for-character, including any cursor position indicator)
- Whether any text appears highlighted/selected (blue background)
- Whether the input field has a focus border

Format as:
Frame 1 (t=12.0s): input_text="<exact chars>", selected=<yes/no>, focused=<yes/no>
Frame 2 (t=13.0s): input_text="<exact chars>", selected=<yes/no>, focused=<yes/no>
Frame 3 (t=14.0s): input_text="<exact chars>", selected=<yes/no>, focused=<yes/no>

The CRITICAL question: what is the exact query string the user typed? Did they type "like" or "11ke" or something else? Was there a transitional state?` }];
    for (const f of typeFrames) {
      content.push({ type: 'image_url', image_url: { url: pngToDataUrl(f.path) } });
    }
    try {
      const response = await zai.chat.completions.createVision({
        messages: [{ role: 'user', content }],
        thinking: { type: 'enabled' },
      });
      console.log('\n=== TYPING SEQUENCE VERIFICATION ===');
      console.log(response.choices[0]?.message?.content || '(no content)');
    } catch (e) {
      console.log(`[TYPE VERIFY ERROR] ${e.message}`);
    }
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

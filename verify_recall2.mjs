// Single consolidated verification call after a longer wait.
import ZAI from '/home/z/.bun/install/global/node_modules/z-ai-web-dev-sdk/dist/index.js';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function pngToDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function main() {
  // Wait 90s for rate-limit to clear
  console.log('Waiting 90s for rate-limit reset...');
  await new Promise(r => setTimeout(r, 90000));

  const zai = await ZAI.create();

  // Extract lossless PNGs at t=17.6, 18.0, 12.0, 14.0
  const targets = [
    { t: 17.6, name: 'verify_17_6' },
    { t: 18.0, name: 'verify_18_0' },
    { t: 12.0, name: 'verify_12_0' },
    { t: 14.0, name: 'verify_14_0' },
  ];
  for (const { t, name } of targets) {
    const fname = `/tmp/recall_frames/${name}.png`;
    fs.rmSync(fname, { force: true });
    spawnSync('ffmpeg', ['-y', '-i', '/tmp/recall_query.mp4', '-ss', String(t), '-frames:v', '1', fname], { stdio: 'ignore' });
  }
  await new Promise(r => setTimeout(r, 500));

  // Single batched call with all 4 frames
  const frames = [
    { t: 12.0, path: '/tmp/recall_frames/verify_12_0.png', purpose: 'typing' },
    { t: 14.0, path: '/tmp/recall_frames/verify_14_0.png', purpose: 'typing' },
    { t: 17.6, path: '/tmp/recall_frames/verify_17_6.png', purpose: 'response' },
    { t: 18.0, path: '/tmp/recall_frames/verify_18_0.png', purpose: 'response' },
  ];

  const content = [{ type: 'text', text:
    `Below are 4 high-resolution PNG frames from the Recall web app. They are in this order:
- Frame 1: t=12.0s (user editing the JSON input)
- Frame 2: t=14.0s (user finished editing the JSON input)
- Frame 3: t=17.6s (response just appeared)
- Frame 4: t=18.0s (full response visible)

For EACH frame, report:

**For Frames 1 & 2 (typing):**
- The EXACT text inside the "CALL ARGS (JSON)" input field — quote character-for-character (e.g. { "query": "like" } or { "query": "11ke" })
- Whether any text appears highlighted/selected
- Whether the input field has a focus border
- The exact text of any small grey metadata next to the (possibly invisible) "Call query()" button — e.g. "as chatgpt.com → recall.app"

**For Frames 3 & 4 (response):**
- The EXACT response-time value shown next to the RESPONSE header (e.g. "661ms" — look VERY carefully, is it "661ms" or "681ms"? The digit could be 6 or 8)
- The EXACT text on the button (e.g. "Call query()" or "calling...")
- The COMPLETE JSON response body visible on screen — every character. List every fact in the "facts" array with: id, content, tags, source, sourceOrigin, capabilityTokenId, and any other visible fields
- The exact text of any small grey metadata next to the button (e.g. "as chatgpt.com → recall.app")

Format:
### Frame 1 (t=12.0s, TYPING)
- input_text: "..."
- selected: yes/no
- focused: yes/no
- meta: "..."

### Frame 2 (t=14.0s, TYPING)
- input_text: "..."
- ...

### Frame 3 (t=17.6s, RESPONSE)
- response_time: "..."
- button: "..."
- meta: "..."
- json_body:
\`\`\`json
<complete JSON>
\`\`\`
- facts_list:
  1. id=..., content="...", tags=[...], source=..., sourceOrigin=..., capabilityTokenId=...
  ...

### Frame 4 (t=18.0s, RESPONSE)
- (same structure as Frame 3)

Be exhaustive and quote verbatim. Every visible character matters.` }];

  for (const f of frames) {
    if (fs.existsSync(f.path)) {
      content.push({ type: 'image_url', image_url: { url: pngToDataUrl(f.path) } });
    } else {
      console.log(`WARNING: missing frame at ${f.path}`);
    }
  }

  try {
    const response = await zai.chat.completions.createVision({
      messages: [{ role: 'user', content }],
      thinking: { type: 'enabled' },
    });
    console.log('\n=== VERIFICATION RESULT ===\n');
    console.log(response.choices[0]?.message?.content || '(no content)');
  } catch (e) {
    console.log(`[VERIFY ERROR] ${e.message}`);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

// Focused analysis on key frames: response JSON, button click moment.
import ZAI from '/home/z/.bun/install/global/node_modules/z-ai-web-dev-sdk/dist/index.js';
import fs from 'node:fs';

function frameToDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

async function analyzeOne(zai, imagePath, label, prompt) {
  const dataUrl = frameToDataUrl(imagePath);
  console.log(`\n=== ${label} (${imagePath}) ===`);
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

  // Extract additional high-resolution frames around the response viewing moment (t=17-19s)
  // We'll use existing sec_18.jpg, sec_19.jpg, sec_20.jpg which are at full resolution.

  // 1. RESPONSE BLOCK — focus on extracting the COMPLETE JSON response verbatim
  await analyzeOne(zai, '/tmp/recall_frames/sec_18.jpg', 'RESPONSE BLOCK @ t=18s',
    `This is a screenshot of the "Recall" web app showing the RESPONSE section after a "query" tool call. The response time on the right says "661ms" (or similar).

I need you to extract the COMPLETE JSON response that is visible on screen — every character, every fact, every field. Format your answer as:

## Response Time
<the exact number shown, e.g. "661ms">

## Response JSON (verbatim, exactly as visible on screen)
\`\`\`json
<paste the entire JSON here, character for character, including all whitespace and indentation as shown>
\`\`\`

## Facts Returned (list each fact)
For each fact in the "facts" array, list:
- id: <full UUID>
- content: <full text>
- tags: <array of tags>
- source: <value>
- sourceOrigin: <value>
- capabilityTokenId: <value>
- (any other visible fields)

## Other Visible Text
List any other text visible on screen — button labels, badges, sidebar items, header text, input field contents. Quote verbatim.

Be exhaustive. Every word visible on screen matters.`);

  // 2. BUTTON CLICK MOMENT — extract frames at 0.1s intervals around t=15-16s
  // First extract those frames
  console.log('\n=== Extracting high-frequency frames around button click ===');
  for (const t of [14.5, 14.7, 14.9, 15.1, 15.3, 15.5, 15.7, 15.9, 16.1, 16.3, 16.5]) {
    const fname = `/tmp/recall_frames/click_${t.toString().replace('.', 'p')}.jpg`;
    fs.rmSync(fname, { force: true });
  }
  for (const t of [14.5, 14.7, 14.9, 15.1, 15.3, 15.5, 15.7, 15.9, 16.1, 16.3, 16.5]) {
    const fname = `/tmp/recall_frames/click_${t.toString().replace('.', 'p')}.jpg`;
    const { spawnSync } = await import('node:child_process');
    spawnSync('ffmpeg', ['-y', '-i', '/tmp/recall_query.mp4', '-ss', String(t), '-frames:v', '1', fname], { stdio: 'ignore' });
  }

  // Analyze the button-click sequence as a batch
  const clickFrames = [];
  for (const t of [14.5, 14.7, 14.9, 15.1, 15.3, 15.5, 15.7, 15.9, 16.1, 16.3, 16.5]) {
    const fname = `/tmp/recall_frames/click_${t.toString().replace('.', 'p')}.jpg`;
    if (fs.existsSync(fname)) clickFrames.push({ t, path: fname });
  }

  if (clickFrames.length > 0) {
    const content = [{ type: 'text', text:
      `Below are ${clickFrames.length} frames captured at 200ms intervals around the moment the user clicks the "Call query()" button in the Recall web app. Frame 1 = t=${clickFrames[0].t}s, Frame 2 = t=${clickFrames[1].t}s, etc.

For EACH frame, tell me precisely:
1. The exact text on the button (e.g. "Call query()" vs "calling..." vs other)
2. Whether the button appears pressed/highlighted/loading (with spinner)
3. The exact text in the JSON input field (the query value)
4. The exact text in the metadata next to the button (e.g. "as chatgpt.com — recall.app" or "as chatgpt.com — 10811 ms")
5. The position of the mouse cursor
6. Whether a RESPONSE section has appeared yet, and if so, the response time shown

Format as:
Frame 1 (t=14.5s): button="...", pressed=true/false, input="...", meta="...", cursor="...", response_time="..."
Frame 2 (t=14.7s): ...
...

The KEY question: at exactly which timestamp does the button transition from "Call query()" to "calling..." (i.e. the click moment)? And at which timestamp does the RESPONSE section first appear?` }];

    for (const f of clickFrames) {
      content.push({ type: 'image_url', image_url: { url: frameToDataUrl(f.path) } });
    }

    try {
      const response = await zai.chat.completions.createVision({
        messages: [{ role: 'user', content }],
        thinking: { type: 'enabled' },
      });
      console.log('\n=== BUTTON CLICK SEQUENCE ANALYSIS ===');
      console.log(response.choices[0]?.message?.content || '(no content)');
    } catch (e) {
      console.log(`[CLICK SEQ ERROR] ${e.message}`);
    }
  }

  // 3. Final state — extract the "Your vault is live" banner at t=26s and the Memory Canvas
  await analyzeOne(zai, '/tmp/recall_frames/sec_27.jpg', 'VAULT LIVE BANNER @ t=27s',
    `This screenshot shows the "Recall" web app after a query tool call. A green banner saying "Your vault is live" should be visible.

Extract VERBATIM:
1. The complete text of the banner (including the headline AND any subtitle/description text)
2. Any badge or icon next to the banner (describe color and shape)
3. The complete "ACTIVITY FEED" list on the right — every entry, in order, with timestamps (e.g. "query('like') · just now")
4. The "syncing" indicator status (yellow dot or other)
5. The Memory Canvas section: title, fact count, input field placeholders, filter tags visible
6. Any visible memory fact cards (quote their text and timestamps verbatim)

Be exhaustive — every visible word matters.`);

  // 4. Final check — frame at t=24s showing all 6 memory cards in the grid
  await analyzeOne(zai, '/tmp/recall_frames/sec_25.jpg', 'MEMORY CANVAS + ACTIVITY FEED @ t=25s',
    `This screenshot shows the Recall web app Memory Canvas section with memory cards.

Extract VERBATIM:
1. The full text of EVERY memory card visible on screen, including:
   - The user attribution (e.g. "YOU" or "you")
   - The fact text content
   - Any tags/badges attached (e.g. "work")
   - The timestamp (e.g. "13h ago", "1d ago")
2. The "ACTIVITY FEED" panel on the right — every entry, in order, with text and timestamps
3. The "syncing" indicator if present
4. The "MEMORY CANVAS" header text and fact count
5. The two input field placeholders (Add a fact, Search your memory)
6. Any filter pills/tags visible (e.g. a "work" pill)

List every memory card in this exact format:
Card 1: user="<user>", text="<text>", tags=[<tags>], timestamp="<time>"
Card 2: ...

Be exhaustive and quote text exactly as shown.`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

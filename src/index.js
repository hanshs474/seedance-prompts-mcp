#!/usr/bin/env node
/**
 * Seedance Prompts MCP server — 150 real, video-tested AI video prompts.
 *
 * Zero dependencies on purpose: MCP directories run packages with `npx -y`, and every
 * dependency is one more way for a listing's automated smoke test to fail. The stdio
 * transport is ~80 lines of JSON-RPC over newline-delimited JSON, so we implement it here.
 *
 * Data is bundled (src/prompts.json) rather than fetched: the tools work offline, and the
 * package needs no network permission — which is also what makes it acceptable to the
 * directories that audit what a server talks to.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROMPTS = JSON.parse(readFileSync(join(HERE, 'prompts.json'), 'utf8'));
const SITE = 'https://emaki.ai';
const REF = '?utm_source=mcp';
const pageUrl = (slug) => `${SITE}/prompt/${slug}${REF}`;

const CATEGORIES = {
  person: 'People & portraits', anime: 'Anime & illustration', food: 'Food & cooking',
  product: 'Product & commercial', animal: 'Animals & pets', scenery: 'Landscape & nature',
  vehicle: 'Vehicles', scifi: 'Sci-fi & futuristic', physics: 'Physics & effects',
  cinematic: 'Cinematic',
};

/** The seven elements that separate a prompt that lands from one that drifts.
 *  Percentages are measured over the 150 bundled prompts at load time — no hand-typed numbers. */
const ELEMENTS = [
  { key: 'style', label: 'Visual style', re: /スタイル|シネマティック|実写|アニメ調|質感|4K|8K|映画|style|cinematic|photorealistic|anime/i, tip: 'Set the look first (cinematic / anime / commercial realism); everything else follows it.' },
  { key: 'scene', label: 'Scene & setting', re: /シーン|背景|舞台|場所|室内|屋外|街|部屋|空間|路地|都市|森|海|山|宇宙|キッチン|店|scene|background|interior|exterior|street|room|city|forest/i, tip: 'One sentence on where it happens. The setting decides the lighting.' },
  { key: 'subject', label: 'Subject', re: /人物|キャラクター|女性|男性|少女|少年|登場|被写体|動物|猫|犬|woman|man|girl|boy|character|subject|product|cat|dog/i, tip: 'Name who or what is on screen, with two or three concrete traits.' },
  { key: 'camera', label: 'Camera work', re: /カメラ|ショット|クローズアップ|ドリー|パン|ズーム|俯瞰|トラッキング|アングル|ワンカット|1カット|camera|shot|close-?up|dolly|pan|zoom|aerial|tracking|one[- ]take/i, tip: 'Give the move a direction: "slow dolly in to a close-up" beats "nice camera work".' },
  { key: 'light', label: 'Lighting', re: /光|ライティング|照明|逆光|夕日|ネオン|影|light|lighting|backlit|sunset|neon|shadow/i, tip: 'One light source and its direction lifts the whole shot.' },
  { key: 'sound', label: 'Sound', re: /音|BGM|効果音|サウンド|声|ナレーション|セリフ|sound|audio|music|sfx|voice|narration|dialogue/i, tip: 'Seedance 2 generates audio with the video. Name the ambience, music or voice.' },
  { key: 'timeline', label: 'Timeline beats', re: /\d+\s*[〜~\-–ー]\s*\d+\s*秒|\d+秒|\d+\s*[-–]\s*\d+\s*s(ec)?\b/i, tip: 'Split the shot into beats ("0-3s: …") to control the order of events.' },
];
const stat = (e) => Math.round((PROMPTS.filter((p) => e.re.test(p.prompt_ja) || e.re.test(p.prompt_en)).length / PROMPTS.length) * 100);
const ELEMENT_PCT = Object.fromEntries(ELEMENTS.map((e) => [e.key, stat(e)]));
const lens = PROMPTS.map((p) => p.prompt_en.length).sort((a, b) => a - b);
const MEDIAN_EN = lens[Math.floor(lens.length / 2)];

const card = (p, full = false) => ({
  slug: p.slug,
  title: p.title_en || p.title,
  title_ja: p.title,
  category: CATEGORIES[p.cat] || p.cat,
  needs_reference_image: p.needs_ref_image,
  summary: p.desc_en || p.desc,
  ...(full
    ? { prompt_en: p.prompt_en, prompt_ja: p.prompt_ja, example_video: p.video, thumbnail: p.thumb }
    : {}),
  source: pageUrl(p.slug),
});

const TOOLS = [
  {
    name: 'search_prompts',
    description:
      'Search 150 AI video prompts that were each actually rendered into a video with Seedance 2. Returns titles, categories and source links; use get_prompt for the full prompt text and the example video.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free text, English or Japanese (e.g. "neon street", "product commercial", "one take morphing").' },
        category: { type: 'string', enum: Object.keys(CATEGORIES), description: 'Restrict to one category.' },
        needs_reference_image: { type: 'boolean', description: 'true = only image-to-video prompts that expect a reference image.' },
        limit: { type: 'number', description: 'Max results, default 10, max 50.' },
      },
    },
  },
  {
    name: 'get_prompt',
    description: 'Full English and Japanese text of one prompt, plus the example video URL that this exact prompt produced.',
    inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
  },
  {
    name: 'list_categories',
    description: 'The ten prompt categories with how many prompts each one holds.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'check_prompt',
    description:
      'Audit a draft video prompt against the seven elements measured across the 150 rendered prompts (style, scene, subject, camera, lighting, sound, timeline). Returns what is missing, why it matters, and a real prompt to copy from.',
    inputSchema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] },
  },
  {
    name: 'build_prompt',
    description:
      'Compose a structured video prompt from parts. Fills the seven elements into the bracket format the rendered prompts use, and flags the parts you left empty.',
    inputSchema: {
      type: 'object',
      properties: {
        style: { type: 'string' }, scene: { type: 'string' }, subject: { type: 'string' },
        action: { type: 'string' }, camera: { type: 'string' }, lighting: { type: 'string' },
        sound: { type: 'string' },
        beats: { type: 'array', items: { type: 'string' }, description: 'Ordered beats, e.g. ["0-3s: the door opens", "3-8s: she steps into the rain"].' },
        language: { type: 'string', enum: ['en', 'ja'], description: 'Output language, default en.' },
      },
    },
  },
];

function callTool(name, args = {}) {
  if (name === 'search_prompts') {
    const q = String(args.query || '').toLowerCase().trim();
    const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 50);
    let rows = PROMPTS;
    if (args.category) rows = rows.filter((p) => p.cat === args.category);
    if (args.needs_reference_image === true) rows = rows.filter((p) => p.needs_ref_image);
    if (args.needs_reference_image === false) rows = rows.filter((p) => !p.needs_ref_image);
    if (q) {
      const terms = q.split(/\s+/);
      rows = rows
        .map((p) => {
          const hay = `${p.title} ${p.title_en} ${p.desc} ${p.desc_en} ${p.prompt_en} ${p.prompt_ja} ${p.cat}`.toLowerCase();
          return { p, score: terms.filter((t) => hay.includes(t)).length };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.p);
    }
    return {
      matches: rows.length,
      results: rows.slice(0, limit).map((p) => card(p)),
      browse_all: `${SITE}/prompt${REF}`,
    };
  }

  if (name === 'get_prompt') {
    const p = PROMPTS.find((x) => x.slug === args.slug);
    if (!p) return { error: `No prompt with slug "${args.slug}". Use search_prompts first.` };
    return {
      ...card(p, true),
      note: p.needs_ref_image
        ? 'This prompt expects a reference image; @Image1 / @Image2 refer to the images you attach. Run it at https://emaki.ai/image-to-video?utm_source=mcp'
        : 'Text-only prompt. Run it at https://emaki.ai/video?utm_source=mcp',
    };
  }

  if (name === 'list_categories') {
    return {
      total_prompts: PROMPTS.length,
      categories: Object.entries(CATEGORIES).map(([key, label]) => ({
        key, label,
        count: PROMPTS.filter((p) => p.cat === key).length,
        browse: `${SITE}/prompt/category/${key}${REF}`,
      })),
    };
  }

  if (name === 'check_prompt') {
    const text = String(args.prompt || '');
    if (!text.trim()) return { error: 'Pass the prompt text to audit.' };
    const found = [], missing = [];
    for (const e of ELEMENTS) {
      if (e.re.test(text)) found.push(e.label);
      else {
        const example = PROMPTS.filter((p) => e.re.test(p.prompt_en)).sort((a, b) => a.prompt_en.length - b.prompt_en.length)[0];
        missing.push({
          element: e.label,
          why: e.tip,
          share_of_rendered_prompts_that_specify_it: `${ELEMENT_PCT[e.key]}%`,
          ...(example ? { example_excerpt: example.prompt_en.slice(0, 160), example_source: pageUrl(example.slug) } : {}),
        });
      }
    }
    return {
      score: `${found.length}/${ELEMENTS.length}`,
      present: found,
      missing,
      length_chars: text.length,
      median_length_of_rendered_prompts: MEDIAN_EN,
      run_it: `${SITE}/video${REF}`,
    };
  }

  if (name === 'build_prompt') {
    const ja = args.language === 'ja';
    const labels = ja
      ? { style: 'スタイル', scene: 'シーン', subject: '登場人物・被写体', action: 'アクション', camera: 'カメラワーク', lighting: 'ライティング', sound: '音', beats: '時間軸' }
      : { style: 'Style', scene: 'Scene', subject: 'Subject', action: 'Action', camera: 'Camera', lighting: 'Lighting', sound: 'Sound', beats: 'Timeline' };
    const parts = [];
    for (const k of ['style', 'scene', 'subject', 'action', 'camera', 'lighting', 'sound']) {
      const v = String(args[k] || '').trim();
      if (v) parts.push(`【${labels[k]}】${v}`);
    }
    const beats = Array.isArray(args.beats) ? args.beats.filter(Boolean) : [];
    if (beats.length) parts.push(`【${labels.beats}】${beats.join(' / ')}`);
    const prompt = parts.join('\n');
    const empty = ['style', 'scene', 'subject', 'action', 'camera', 'lighting', 'sound'].filter((k) => !String(args[k] || '').trim());
    return {
      prompt: prompt || null,
      empty_fields: empty.map((k) => labels[k]),
      hint: empty.length
        ? 'Empty fields are left to the model. Fill camera and sound first — they are the two most often skipped.'
        : 'All seven elements are specified.',
      run_it: `${SITE}/video${REF}`,
    };
  }

  return { error: `Unknown tool: ${name}` };
}

// ---------- stdio JSON-RPC ----------
const send = (msg) => process.stdout.write(`${JSON.stringify(msg)}\n`);
const result = (id, value) => send({ jsonrpc: '2.0', id, result: value });

function handle(msg) {
  const { id, method, params } = msg;
  if (method === 'initialize') {
    return result(id, {
      protocolVersion: params?.protocolVersion === '2024-11-05' ? '2024-11-05' : '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'seedance-prompts', version: '1.0.0' },
      instructions:
        'Search and audit AI video prompts that were each rendered into a real video with Seedance 2. Every result carries a source URL on emaki.ai with the example video.',
    });
  }
  if (method === 'tools/list') return result(id, { tools: TOOLS });
  if (method === 'tools/call') {
    const out = callTool(params?.name, params?.arguments || {});
    return result(id, { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }], isError: Boolean(out?.error) });
  }
  if (method === 'ping') return result(id, {});
  if (method?.startsWith('notifications/')) return; // no id, no reply
  if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    try {
      handle(JSON.parse(line));
    } catch {
      send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    }
  }
});
process.stdin.on('end', () => process.exit(0));

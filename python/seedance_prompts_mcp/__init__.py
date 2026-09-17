"""Seedance Prompts MCP server — 150 AI video prompts, each rendered into a real video.

Same tools and same bundled data as the npm package `seedance-prompts-mcp`; this one exists
so `uvx` users do not have to install Node. Stdlib only: MCP directories run servers with
`uvx <pkg>`, and every dependency is one more way for a listing's smoke test to fail.
"""

import json
import re
import sys
from pathlib import Path

__version__ = "1.0.1"

DATA = json.loads((Path(__file__).parent / "prompts.json").read_text(encoding="utf-8"))
SITE = "https://emaki.ai"
REF = "?utm_source=mcp-py"

CATEGORIES = {
    "person": "People & portraits",
    "anime": "Anime & illustration",
    "food": "Food & cooking",
    "product": "Product & commercial",
    "animal": "Animals & pets",
    "scenery": "Landscape & nature",
    "vehicle": "Vehicles",
    "scifi": "Sci-fi & futuristic",
    "physics": "Physics & effects",
    "cinematic": "Cinematic",
}

# The seven elements that separate a prompt that lands from one that drifts. The percentages
# are computed over the bundled set at import time — never hand-typed, so they cannot drift
# away from the data they claim to describe.
ELEMENTS = [
    ("style", "Visual style",
     r"スタイル|シネマティック|実写|アニメ調|質感|4K|8K|映画|style|cinematic|photorealistic|anime",
     "Set the look first (cinematic / anime / commercial realism); everything else follows it."),
    ("scene", "Scene & setting",
     r"シーン|背景|舞台|場所|室内|屋外|街|部屋|空間|路地|都市|森|海|山|宇宙|キッチン|店|scene|background|interior|exterior|street|room|city|forest",
     "One sentence on where it happens. The setting decides the lighting."),
    ("subject", "Subject",
     r"人物|キャラクター|女性|男性|少女|少年|登場|被写体|動物|猫|犬|woman|man|girl|boy|character|subject|product|cat|dog",
     "Name who or what is on screen, with two or three concrete traits."),
    ("camera", "Camera work",
     r"カメラ|ショット|クローズアップ|ドリー|パン|ズーム|俯瞰|トラッキング|アングル|ワンカット|1カット|camera|shot|close-?up|dolly|pan|zoom|aerial|tracking|one[- ]take",
     'Give the move a direction: "slow dolly in to a close-up" beats "nice camera work".'),
    ("light", "Lighting",
     r"光|ライティング|照明|逆光|夕日|ネオン|影|light|lighting|backlit|sunset|neon|shadow",
     "One light source and its direction lifts the whole shot."),
    ("sound", "Sound",
     r"音|BGM|効果音|サウンド|声|ナレーション|セリフ|sound|audio|music|sfx|voice|narration|dialogue",
     "Seedance 2 generates audio with the video. Name the ambience, music or voice."),
    ("timeline", "Timeline beats",
     r"\d+\s*[〜~\-–ー]\s*\d+\s*秒|\d+秒|\d+\s*[-–]\s*\d+\s*s(ec)?\b",
     'Split the shot into beats ("0-3s: …") to control the order of events.'),
]
_COMPILED = [(k, label, re.compile(pat, re.I), tip) for k, label, pat, tip in ELEMENTS]
_PCT = {
    k: round(
        sum(1 for p in DATA if rx.search(p["prompt_ja"]) or rx.search(p["prompt_en"]))
        / len(DATA) * 100
    )
    for k, _, rx, _ in _COMPILED
}
_MEDIAN_EN = sorted(len(p["prompt_en"]) for p in DATA)[len(DATA) // 2]


def page_url(slug: str) -> str:
    return f"{SITE}/prompt/{slug}{REF}"


def card(p: dict, full: bool = False) -> dict:
    out = {
        "slug": p["slug"],
        "title": p.get("title_en") or p["title"],
        "title_ja": p["title"],
        "category": CATEGORIES.get(p["cat"], p["cat"]),
        "needs_reference_image": p["needs_ref_image"],
        "summary": p.get("desc_en") or p["desc"],
    }
    if full:
        out.update(
            prompt_en=p["prompt_en"],
            prompt_ja=p["prompt_ja"],
            example_video=p["video"],
            thumbnail=p["thumb"],
        )
    out["source"] = page_url(p["slug"])
    return out


TOOLS = [
    {
        "name": "search_prompts",
        "description": "Search 150 AI video prompts that were each actually rendered into a video with Seedance 2. Returns titles, categories and source links; use get_prompt for the full prompt text and the example video.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": 'Free text, English or Japanese (e.g. "neon street", "product commercial").'},
                "category": {"type": "string", "enum": list(CATEGORIES), "description": "Restrict to one category."},
                "needs_reference_image": {"type": "boolean", "description": "true = only image-to-video prompts that expect a reference image."},
                "limit": {"type": "number", "description": "Max results, default 10, max 50."},
            },
        },
    },
    {
        "name": "get_prompt",
        "description": "Full English and Japanese text of one prompt, plus the example video URL that this exact prompt produced.",
        "inputSchema": {"type": "object", "properties": {"slug": {"type": "string"}}, "required": ["slug"]},
    },
    {
        "name": "list_categories",
        "description": "The ten prompt categories with how many prompts each one holds.",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "check_prompt",
        "description": "Audit a draft video prompt against the seven elements measured across the 150 rendered prompts (style, scene, subject, camera, lighting, sound, timeline). Returns what is missing, why it matters, and a real prompt to copy from.",
        "inputSchema": {"type": "object", "properties": {"prompt": {"type": "string"}}, "required": ["prompt"]},
    },
    {
        "name": "build_prompt",
        "description": "Compose a structured video prompt from parts. Fills the seven elements into the bracket format the rendered prompts use, and flags the parts you left empty.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "style": {"type": "string"}, "scene": {"type": "string"}, "subject": {"type": "string"},
                "action": {"type": "string"}, "camera": {"type": "string"}, "lighting": {"type": "string"},
                "sound": {"type": "string"},
                "beats": {"type": "array", "items": {"type": "string"}, "description": 'Ordered beats, e.g. ["0-3s: the door opens"].'},
                "language": {"type": "string", "enum": ["en", "ja"], "description": "Output language, default en."},
            },
        },
    },
]

_FIELDS = ["style", "scene", "subject", "action", "camera", "lighting", "sound"]
_LABELS_EN = {"style": "Style", "scene": "Scene", "subject": "Subject", "action": "Action",
              "camera": "Camera", "lighting": "Lighting", "sound": "Sound", "beats": "Timeline"}
_LABELS_JA = {"style": "スタイル", "scene": "シーン", "subject": "登場人物・被写体", "action": "アクション",
              "camera": "カメラワーク", "lighting": "ライティング", "sound": "音", "beats": "時間軸"}


def call_tool(name: str, args: dict) -> dict:
    if name == "search_prompts":
        rows = DATA
        if args.get("category"):
            rows = [p for p in rows if p["cat"] == args["category"]]
        if args.get("needs_reference_image") is True:
            rows = [p for p in rows if p["needs_ref_image"]]
        elif args.get("needs_reference_image") is False:
            rows = [p for p in rows if not p["needs_ref_image"]]
        query = str(args.get("query") or "").lower().strip()
        if query:
            terms = query.split()
            scored = []
            for p in rows:
                hay = " ".join(str(p.get(k, "")) for k in
                               ("title", "title_en", "desc", "desc_en", "prompt_en", "prompt_ja", "cat")).lower()
                score = sum(1 for t in terms if t in hay)
                if score:
                    scored.append((score, p))
            scored.sort(key=lambda x: -x[0])
            rows = [p for _, p in scored]
        limit = max(1, min(int(args.get("limit") or 10), 50))
        return {"matches": len(rows), "results": [card(p) for p in rows[:limit]],
                "browse_all": f"{SITE}/prompt{REF}"}

    if name == "get_prompt":
        p = next((x for x in DATA if x["slug"] == args.get("slug")), None)
        if not p:
            return {"error": f'No prompt with slug "{args.get("slug")}". Use search_prompts first.'}
        out = card(p, True)
        out["note"] = (
            "This prompt expects a reference image; @Image1 / @Image2 refer to the images you "
            f"attach. Run it at {SITE}/image-to-video{REF}"
            if p["needs_ref_image"]
            else f"Text-only prompt. Run it at {SITE}/video{REF}"
        )
        return out

    if name == "list_categories":
        return {
            "total_prompts": len(DATA),
            "categories": [
                {"key": k, "label": v,
                 "count": sum(1 for p in DATA if p["cat"] == k),
                 "browse": f"{SITE}/prompt/category/{k}{REF}"}
                for k, v in CATEGORIES.items()
            ],
        }

    if name == "check_prompt":
        text = str(args.get("prompt") or "")
        if not text.strip():
            return {"error": "Pass the prompt text to audit."}
        present, missing, used = [], [], set()
        for key, label, rx, tip in _COMPILED:
            if rx.search(text):
                present.append(label)
                continue
            pool = sorted((p for p in DATA if rx.search(p["prompt_en"])), key=lambda p: len(p["prompt_en"]))
            example = next((p for p in pool if p["slug"] not in used), pool[0] if pool else None)
            item = {"element": label, "why": tip,
                    "share_of_rendered_prompts_that_specify_it": f"{_PCT[key]}%"}
            if example:
                used.add(example["slug"])
                item["example_excerpt"] = example["prompt_en"][:160]
                item["example_source"] = page_url(example["slug"])
            missing.append(item)
        return {"score": f"{len(present)}/{len(_COMPILED)}", "present": present, "missing": missing,
                "length_chars": len(text), "median_length_of_rendered_prompts": _MEDIAN_EN,
                "run_it": f"{SITE}/video{REF}"}

    if name == "build_prompt":
        labels = _LABELS_JA if args.get("language") == "ja" else _LABELS_EN
        parts = [f"【{labels[k]}】{str(args.get(k)).strip()}" for k in _FIELDS if str(args.get(k) or "").strip()]
        beats = [b for b in (args.get("beats") or []) if b]
        if beats:
            parts.append(f"【{labels['beats']}】" + " / ".join(beats))
        empty = [labels[k] for k in _FIELDS if not str(args.get(k) or "").strip()]
        return {
            "prompt": "\n".join(parts) or None,
            "empty_fields": empty,
            "hint": ("Empty fields are left to the model. Fill camera and sound first — they are "
                     "the two most often skipped.") if empty else "All seven elements are specified.",
            "run_it": f"{SITE}/video{REF}",
        }

    return {"error": f"Unknown tool: {name}"}


def _send(msg: dict) -> None:
    sys.stdout.write(json.dumps(msg, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def _handle(msg: dict) -> None:
    mid, method, params = msg.get("id"), msg.get("method"), msg.get("params") or {}
    if method == "initialize":
        proto = "2024-11-05" if params.get("protocolVersion") == "2024-11-05" else "2025-06-18"
        _send({"jsonrpc": "2.0", "id": mid, "result": {
            "protocolVersion": proto,
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "seedance-prompts", "version": __version__},
            "instructions": "Search and audit AI video prompts that were each rendered into a real "
                            "video with Seedance 2. Every result carries a source URL on emaki.ai "
                            "with the example video.",
        }})
    elif method == "tools/list":
        _send({"jsonrpc": "2.0", "id": mid, "result": {"tools": TOOLS}})
    elif method == "tools/call":
        out = call_tool(params.get("name"), params.get("arguments") or {})
        _send({"jsonrpc": "2.0", "id": mid, "result": {
            "content": [{"type": "text", "text": json.dumps(out, indent=2, ensure_ascii=False)}],
            "isError": bool(out.get("error")),
        }})
    elif method == "ping":
        _send({"jsonrpc": "2.0", "id": mid, "result": {}})
    elif method and method.startswith("notifications/"):
        return  # notifications carry no id and take no reply
    elif mid is not None:
        _send({"jsonrpc": "2.0", "id": mid,
               "error": {"code": -32601, "message": f"Method not found: {method}"}})


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            _handle(json.loads(line))
        except json.JSONDecodeError:
            _send({"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}})


if __name__ == "__main__":
    main()

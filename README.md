# Seedance Prompts MCP

**150 AI video prompts that were each actually rendered into a video.** Search them, read the
full text in English and Japanese, watch the clip the prompt produced, audit your own draft
against what the rendered prompts specify, or compose a new one — all from your MCP client.

Most "prompt library" packages ship prompts nobody ran, so you find out what a prompt does only
after you spend a generation on it. Here the clip came first: every entry links to the video that
this exact text produced, and the audit tool measures your draft against all 150 of them rather
than against someone's opinion of good prompting.

Add it to your client with the two lines below, then ask it to find you a prompt.

## Install

Node 18+. No dependencies, no API key, no network access at runtime — the prompt set is bundled.

```json
{
  "mcpServers": {
    "seedance-prompts": {
      "command": "npx",
      "args": ["-y", "seedance-prompts-mcp"]
    }
  }
}
```

Claude Desktop: `claude_desktop_config.json`. Cursor: `.cursor/mcp.json`. Any other stdio MCP
client takes the same two lines.

## Tools

| Tool | What it does |
|---|---|
| `search_prompts` | Free-text search over 150 prompts (English or Japanese), filter by category or by whether the prompt expects a reference image. |
| `get_prompt` | Full English + Japanese prompt text, the example video URL, and where to run it. |
| `list_categories` | The ten categories and how many prompts each holds. |
| `check_prompt` | Audits a draft against the seven elements measured across all 150 rendered prompts — style, scene, subject, camera, lighting, sound, timeline. Names what is missing, why it matters, and hands you a real prompt to copy from. |
| `build_prompt` | Composes those seven elements plus timeline beats into the bracket format the rendered prompts use, and tells you which fields you left to the model. |

## Why the audit is worth running

The seven elements are not a style guide someone invented — they are counted over the bundled
set at load time. Across the 150 rendered prompts, camera work is specified in half of them and
audio in far fewer: those two are where drafts most often leave the result to chance. Seedance 2
generates audio together with the video, so an unspecified soundtrack is a decision you handed
over rather than a field you skipped.

```
check_prompt("A woman turns around in a neon alley at night")
→ 2/7 · missing: camera work, lighting, sound, timeline …
  each with the reason it matters and a rendered prompt to copy the phrasing from
```

## Example

```
search_prompts({ query: "product commercial", limit: 3 })
get_prompt({ slug: "perfume-product-advertisement-generation-prompt-for-seedance-2-0" })
→ prompt_en, prompt_ja, example_video (mp4), source
```

## Where the prompts come from

They are the public prompt library of [Emaki](https://emaki.ai/prompt?utm_source=npm), a Japanese
AI video site running Seedance 2 and Seedance 2.5. Each entry there has the prompt, the settings
and the resulting clip. 32 of the 150 are image-to-video prompts that show how to address
multiple reference images (`@Image1`, `@Image2`) — the part that is hardest to guess.

Pick a prompt and run it in the browser: [text to video](https://emaki.ai/video?utm_source=npm) ·
[image to video](https://emaki.ai/image-to-video?utm_source=npm) ·
[Seedance 2.5](https://emaki.ai/seedance-2-5?utm_source=npm) (up to 30 seconds with audio in one pass).

## License

MIT. The prompt texts are published by Emaki for reuse; the example videos stay on Emaki's CDN.

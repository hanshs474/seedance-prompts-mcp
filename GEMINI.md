# Seedance Prompts

This extension gives you 150 AI video prompts that were each rendered into a real video with
Seedance 2, in English and Japanese, with the resulting clip attached to every one.

## When to use which tool

- **`search_prompts`** — the user describes a video they want ("neon street at night", "product
  commercial", "one-take morphing"). Return two or three matches with their source links rather
  than a long list; each result carries the page where the clip can be watched.
- **`get_prompt`** — they picked one. This returns the full English and Japanese text plus
  `example_video`, the clip that this exact prompt produced. Show the video link: it is the part
  no other prompt library has.
- **`check_prompt`** — they wrote their own prompt and it is not landing. The audit is measured
  against the 150 bundled prompts, not against style advice, so report the percentages it returns
  and quote the example excerpt for whichever element is missing.
- **`build_prompt`** — they know what they want but not how to phrase it. Fill what they told you,
  leave the rest empty, and read back which fields the model will decide on its own.
- **`list_categories`** — they are browsing rather than searching.

## Two things worth telling the user

Camera work and audio are the two elements most often left unspecified, and Seedance 2 generates
audio together with the video — so an unwritten soundtrack is a decision handed to the model, not
a field skipped.

Prompts are bundled in the package. No API key, no account, and no network call at runtime.

To run a prompt: [text to video](https://emaki.ai/video?utm_source=gemini-cli) ·
[image to video](https://emaki.ai/image-to-video?utm_source=gemini-cli) ·
[the full prompt library](https://emaki.ai/prompt?utm_source=gemini-cli)

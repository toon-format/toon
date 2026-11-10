# Agent Skill Files

Agent skill files, `AGENTS.md` or `SKILL.md` instructions, and prompt packs that teach a model TOON or a library's API are out of scope for this repo and the official ports.

## Why this is out of scope

A skill file is a prompt, not library code: versioned next to the encoder, it goes stale with every spec release and no test notices ([toon#311](https://github.com/toon-format/toon/issues/311#issuecomment-5082644089)). Point an agent at [`SPEC.md`](https://github.com/toon-format/spec/blob/main/SPEC.md) or [Using TOON with LLMs](https://toonformat.dev/guide/llm-prompts), which are maintained with the format, and keep agent-specific skills in that agent's setup.

## Prior requests

- toon#311 – AI skill for agents
- toon-rust#72 – coding assistant support (`AGENTS.md`, `SKILL.md`)

# Agent Skill Files

Neither this repo nor the official ports ship agent skill files, `AGENTS.md`/`SKILL.md` instructions, or prompt packs that teach a model TOON or a library's API.

## Why this is out of scope

A skill is a prompt, and a prompt versioned next to the encoder goes stale with every spec release without any test noticing:

> A skill file is a prompt, not library code – it belongs where prompts live (userland, agent-skill registries), not versioned in the encoder repo where every spec release stales it silently. This thread already demonstrates the failure mode: the option summary above lists `keyFolding` and `expandPaths`, both removed in v4.0.
> – [toon#311](https://github.com/toon-format/toon/issues/311#issuecomment-5082644089)

Ground an agent in [`SPEC.md`](https://github.com/toon-format/spec/blob/main/SPEC.md) or the docs site, which are versioned with the format. For prompting patterns, see the [LLM prompts guide](https://toonformat.dev/guide/llm-prompts). An agent can also call a TOON CLI like any other command to convert JSON before reading it. A skill that wires these into a particular agent belongs in that agent's setup.

## Prior requests

- toon#311 – AI skill for agents
- toon-rust#72 – coding assistant support (`AGENTS.md`, `SKILL.md`)

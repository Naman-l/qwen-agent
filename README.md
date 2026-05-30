# local-agent-loop

> **A sub-100-line, self-hosted AI agent you can build and run on your own machine.**

A tool-calling agent foundation backed by a **local Qwen3 model** through [Ollama](https://ollama.com) — no cloud, no API bill, no SDK lock-in. It talks to the model with the plain **OpenAI SDK**, so the *same code* swaps to OpenAI or Anthropic with one argument. Built to learn applied AI engineering in TypeScript.

![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-local-57f287)
![Model](https://img.shields.io/badge/model-qwen3%3A14b-46d6e0)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## A live agent loop

The model decides when to reach for a tool, runs it locally, reads the result, and keeps going until it has an answer. One request can chain several tool calls before a final reply:

```text
$ npx tsx src/agent.ts
agent ready · model=qwen3:14b · tools=read_file, write_file, list_files

you> write a file haiku.txt with a haiku about local LLMs
  [tool] write_file → OK: wrote 71 bytes to haiku.txt
qwen> Done — saved a three-line haiku to haiku.txt.

you> read it back and tell me how many lines it has
  [tool] read_file → Silicon dreams hum / a model runs on my desk…
qwen> haiku.txt has 3 lines.

you> /exit
```

---

## What it demonstrates

| | |
|---|---|
| **01 · Swappable providers** | Every inference call goes through one `callModel()`. Switching the model a step runs on is an *argument*, not a refactor. |
| **02 · A minimal agent loop** | The canonical **read → act → observe** cycle: send tools → run any tool calls → feed results back → repeat until done. |
| **03 · Local tool calling** | Qwen3 reads, writes, and lists *real* files — sandboxed to a single `workspace/` directory. |
| **04 · OpenAI wire format** | A local model spoken to over the standard OpenAI chat-completions API. Offline, free, and portable to any provider. |

---

## How it works

```text
  user input
      │
      ▼
┌─────────────┐   tools + messages   ┌──────────────────┐
│  agent.ts   │ ───────────────────▶ │   callModel()    │
│  (the loop) │                      │     (llm.ts)     │
└─────────────┘ ◀─────────────────── └──────────────────┘
      │            assistant message          │
      │                                        ▼
      │                          Ollama /v1 (OpenAI-compatible)
      ▼                                  → qwen3:14b
  tool_calls?
   ├── yes → run tool (tools.ts) → append result → loop again
   └── no  → print final answer → wait for next input
```

| Step | What happens |
|------|--------------|
| **›  User input** | You type a request into the CLI in `agent.ts`. |
| **ƒ  callModel()** | Messages + tool schemas go to the provider via `llm.ts`. Default target: local `qwen3:14b`. |
| **?  Tool calls?** | If the model returns `tool_calls`, each runs in `tools.ts`, the result is appended, and the loop repeats. |
| **✓  Final answer** | No more tool calls → print the reply and wait for the next turn. |

---

## Same call, different brain

The highest-leverage decision in the project: every model call is funneled through **one function**, so the loop has no idea what's behind it. Comparing a local model against a hosted one later is a one-line edit.

```ts
// default: local Qwen3 via Ollama
const reply = await callModel({ messages, tools });

// same loop, different brain — one argument changes
const reply = await callModel({ messages, tools, provider: "anthropic" });
```

Providers are declared in one place in `src/llm.ts`:

| Provider | Endpoint | Default model | Notes |
|----------|----------|---------------|-------|
| `ollama` | `http://localhost:11434/v1` | `qwen3:14b` | local · free · offline · **default** |
| `openai` | `https://api.openai.com/v1` | `gpt-4o-mini` | needs `OPENAI_API_KEY` |
| `anthropic` | `https://api.anthropic.com/v1/` | `claude-sonnet-4-6` | needs `ANTHROPIC_API_KEY` |

---

## Quick start

**Prerequisites:** Node.js 18+ and [Ollama](https://ollama.com) running. Lower on memory? Swap `qwen3:8b` in `src/llm.ts`.

```bash
# 1 · pull the model
ollama pull qwen3:14b

# 2 · install + run (with `ollama serve` in another tab)
git clone https://github.com/Naman-l/qwen-agent.git
cd qwen-agent && npm install
npx tsx src/agent.ts
```

Then talk to it — you'll see `[tool]` lines fire and real files appear in `workspace/`. Type `/exit` to quit.

---

## Tools

All tools are sandboxed: paths resolve against `workspace/`, and anything escaping it is rejected.

| Tool | Description |
|------|-------------|
| `read_file` | Read a file's contents from the workspace. |
| `write_file` | Create or overwrite a file in the workspace. |
| `list_files` | List files in a workspace directory. |

---

## A note on Qwen3 "thinking" mode

> ⚠️ Qwen3 ships with reasoning **on by default**. Through an OpenAI-style client, that reasoning either lands in a separate field or as `<think>…</think>` noise, and it adds latency to every turn. The system prompt carries `/no_think` to keep the loop fast and tool calls clean — drop it on steps where reasoning quality matters more than speed.

---

## Project structure

```text
qwen-agent/
├── src/
│   ├── agent.ts   # CLI + the read→act→observe agent loop
│   ├── llm.ts     # callModel() — the provider abstraction
│   └── tools.ts   # file tools (read / write / list), sandboxed to workspace/
├── workspace/     # the only directory the agent is allowed to touch
├── package.json
└── tsconfig.json
```

---

## Roadmap

This repo is the foundation for a **research-brief agent**. Every node below is just a `callModel()` call with a different prompt — which is exactly what the abstraction was built to make cheap.

| # | Pattern | Role |
|---|---------|------|
| 01 | **Router** | Classify the question to choose a research strategy. |
| 02 | **Orchestrator** | Decompose into 4–8 sub-questions as structured JSON. |
| 03 | **Parallel workers** | Each sub-question runs search → fetch → extract, in `Promise.all`. |
| 04 | **Synthesizer** | Merge findings into a brief: TL;DR, findings, sources. |
| 05 | **Evaluator–optimizer** | A critic scores the brief and triggers bounded revisions. |

---

<sub>Built to learn applied AI engineering · TypeScript · OpenAI SDK · Ollama · MIT</sub>

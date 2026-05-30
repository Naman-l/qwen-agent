import OpenAI from "openai";

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type Tool = OpenAI.Chat.Completions.ChatCompletionTool;
export type AssistantMsg = OpenAI.Chat.Completions.ChatCompletionMessage;
export type AssistantMsgParam = OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam;

type Provider = "ollama" | "openai" | "anthropic";

// Every provider here speaks the OpenAI wire format — that's the whole trick.
const PROVIDERS: Record<Provider, { baseURL: string; apiKey: () => string; defaultModel: string }> = {
  ollama: {
    baseURL: "http://localhost:11434/v1",
    apiKey: () => "ollama",
    defaultModel: "qwen3:14b",
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    apiKey: () => process.env.OPENAI_API_KEY ?? "",
    defaultModel: "gpt-4o-mini",
  },
  anthropic: {
    // Anthropic exposes an OpenAI-compatible endpoint; check current model strings.
    baseURL: "https://api.anthropic.com/v1/",
    apiKey: () => process.env.ANTHROPIC_API_KEY ?? "",
    defaultModel: "claude-sonnet-4-6",
  },
};

const clients = new Map<Provider, OpenAI>();
function clientFor(p: Provider): OpenAI {
  if (!clients.has(p)) {
    const cfg = PROVIDERS[p];
    clients.set(p, new OpenAI({ baseURL: cfg.baseURL, apiKey: cfg.apiKey() }));
  }
  return clients.get(p)!;
}

export interface CallOptions {
  messages: Msg[];
  tools?: Tool[];
  provider?: Provider;   // default: ollama
  model?: string;        // default: provider's defaultModel
  temperature?: number;
}

function extractAssistantMessage(
  res: OpenAI.Chat.Completions.ChatCompletion,
): AssistantMsg {
  const message = res.choices[0]?.message;
  if (!message) {
    throw new Error("Model returned no assistant message");
  }
  return message;
}

/** Normalize an API response message for the conversation history. */
export function toAssistantParam(msg: AssistantMsg): AssistantMsgParam {
  return {
    role: "assistant",
    content: msg.content,
    tool_calls: msg.tool_calls,
  };
}

/** Text content from an assistant message (null-safe). */
export function assistantText(msg: AssistantMsg): string {
  return msg.content ?? "";
}

export async function callModel(opts: CallOptions): Promise<AssistantMsg> {
  const provider = opts.provider ?? "ollama";
  const cfg = PROVIDERS[provider];
  const res = await clientFor(provider).chat.completions.create({
    model: opts.model ?? cfg.defaultModel,
    messages: opts.messages,
    tools: opts.tools,
    temperature: opts.temperature ?? 0.2,
  });
  return extractAssistantMessage(res);
}
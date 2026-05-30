import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import OpenAI from "openai";
import { toolSchemas, toolHandlers } from "./tools";

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

// ⬇️ This is the bit we extract in Phase 3.
const client = new OpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama", // required by the SDK, ignored by Ollama
});

const SYSTEM = `You are a coding agent with filesystem access via tools.
When asked to read, write, or inspect files, USE the tools — do not guess contents.
Be concise. /no_think`;

async function runAgent() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const messages: Msg[] = [{ role: "system", content: SYSTEM }];

  while (true) {
    const input = await rl.question("\nyou> ");
    if (input.trim() === "/exit") break;
    messages.push({ role: "user", content: input });

    // Inner loop: keep running tools until the model produces a final answer.
    while (true) {
      const res = await client.chat.completions.create({
        model: "qwen3:14b",
        messages,
        tools: toolSchemas,
        temperature: 0.2,
      });
      const msg = res.choices[0].message;
      messages.push(msg);

      if (!msg.tool_calls?.length) {
        console.log(`\nqwen> ${msg.content ?? ""}`);
        break;
      }

      for (const call of msg.tool_calls) {
        if (call.type !== "function") continue;
        const args = JSON.parse(call.function.arguments || "{}");
        const handler = toolHandlers[call.function.name];
        let result: string;
        try {
          result = handler ? handler(args) : `ERROR: unknown tool ${call.function.name}`;
        } catch (e) {
          result = `ERROR: ${(e as Error).message}`;
        }
        console.log(`  [tool] ${call.function.name} -> ${result.slice(0, 60)}…`);
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }
    }
  }
  rl.close();
}

runAgent();
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import OpenAI from "openai";

const ROOT = path.resolve("./workspace");

// Refuse any path that escapes the workspace dir.
function safe(p: string): string {
  const resolved = path.resolve(ROOT, p);
  if (!resolved.startsWith(ROOT)) throw new Error(`Path escapes workspace: ${p}`);
  return resolved;
}

export const toolSchemas: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file in the workspace.",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "Relative path inside the workspace" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or overwrite a file in the workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path inside the workspace" },
          content: { type: "string", description: "Full file contents to write" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files in a workspace directory.",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "Relative dir, defaults to '.'" } },
      },
    },
  },
];

// Each handler takes parsed args, returns a string the model reads back.
export const toolHandlers: Record<string, (args: any) => string> = {
  read_file: ({ path: p }) =>
    existsSync(safe(p)) ? readFileSync(safe(p), "utf8") : `ERROR: file not found: ${p}`,
  write_file: ({ path: p, content }) => {
    writeFileSync(safe(p), content, "utf8");
    return `OK: wrote ${content.length} bytes to ${p}`;
  },
  list_files: ({ path: p = "." }) => readdirSync(safe(p)).join("\n") || "(empty)",
};
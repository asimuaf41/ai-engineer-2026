// THROWAWAY: delete after running. Finds the batch size where Voyage starts answering 429, with ONE attempt per request (no retries)
// and a 65-second rest between requests so an earlier request can't count against the next. Generated filler text only.
// Prints per size: texts, estimated tokens, HTTP status, retry-after / ratelimit headers, and the first 120 chars of Voyage's own
// error "detail" (its explanation of the limit; it never contains your input). Never the key.
import { env } from "@/env";
import { EMBEDDING } from "../src/lib/ai/embedding-config";

const WORDS = ["alpha", "beta", "gamma", "delta", "router", "handler", "session", "token", "query", "cache", "stream", "render"];
function fakeChunk(seed: number): string {
  let text = `// file-${seed}.ts\nexport function fn${seed}() {\n`;
  for (let i = seed; text.length < 1200; i++) text += `  const ${WORDS[i % WORDS.length]}${i} = ${WORDS[(i * 7) % WORDS.length]}(${i});\n`;
  return text.slice(0, 1200);
}
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const apiKey = env.VOYAGE_API_KEY;
  if (!apiKey) return console.log("VOYAGE_API_KEY is not set");
  let seed = 1000;
  for (const size of [16, 24, 32, 48, 64]) {
    await sleep(65_000);
    const input = Array.from({ length: size }, () => fakeChunk(seed++));
    const started = Date.now();
    let line: string;
    try {
      const response = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ input, model: EMBEDDING.model, input_type: "document", output_dimension: EMBEDDING.dims }),
        signal: AbortSignal.timeout(60_000),
      });
      const headers = ["retry-after", "x-ratelimit-limit-tokens", "x-ratelimit-remaining-tokens", "x-ratelimit-limit-requests", "x-ratelimit-remaining-requests"]
        .map((name) => [name, response.headers.get(name)] as const)
        .filter(([, value]) => value !== null)
        .map(([name, value]) => `${name}=${value}`)
        .join(" ");
      let detail = "";
      if (!response.ok) detail = ((await response.json().catch(() => null)) as { detail?: unknown } | null)?.detail?.toString().slice(0, 200) ?? "";
      line = `status=${response.status}${headers ? ` ${headers}` : ""}${detail ? ` detail=${JSON.stringify(detail)}` : ""}`;
    } catch (error) {
      line = `no answer (${error instanceof Error ? error.name : typeof error})`;
    }
    console.log(`texts=${size} est_tokens=${Math.ceil((size * 1200) / 3.5)} | ${line} | ${Date.now() - started} ms`);
  }
}

main();

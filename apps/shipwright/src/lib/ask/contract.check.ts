// Type-only check (nothing runs). The phone and the web import AskUITools from @repo/ai/shared,
// but the server's real tools are in tools.ts. If the two drift apart, `tsc` fails right here.
// If it fails, fix AskUITools in packages/ai/src/shared/ask.ts. Never loosen this check.
import type { AskUITools } from "@repo/ai/shared";
import type { InferUITools } from "ai";
import type { askTools } from "@/lib/ask/tools";

type ServerTools = InferUITools<typeof askTools>;

// "Each side can be assigned to the other" means the two types have the same shape.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// Evaluates to `never` (a compile error) when the tools differ; otherwise to `true`.
type MustBeTrue<T extends true> = T;

export type AskContract = MustBeTrue<Same<ServerTools, AskUITools>>;

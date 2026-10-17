import { NextResponse } from "next/server";
import { z } from "zod";
import { runAudit } from "@repo/ai/audit";
import { claude } from "@/lib/claude";

export const maxDuration = 60;

const bodySchema = z.object({
  filename: z
    .string()
    .regex(
      /^[\w.-]{1,64}$/,
      "File name must be 1-64 characters: letters, numbers, dots, dashes or underscores only."
    ),
  code: z.string().min(1, "Code is required.").max(20_000, "Code must be 20,000 characters or fewer."),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request body.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { filename, code } = parsed.data;

  try {
    const result = await runAudit(
      claude,
      { [filename]: code },
      { onLog: (line) => console.log(`[audit] ${line}`) }
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "The audit failed. Check the terminal for details." }, { status: 502 });
  }
}

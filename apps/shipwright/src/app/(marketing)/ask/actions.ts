"use server";

// Saves a thumbs up/down on an answer. In memory for now.
import { z } from "zod";

export type Vote = "up" | "down" | null;

const FeedbackInput = z.object({
  messageId: z.string().min(1).max(100),
  vote: z.enum(["up", "down"]).nullable(),
});

// In memory only: Supabase on Day 11, eval data on Day 19.
const votes = new Map<string, Vote>();

export async function saveFeedback(input: unknown): Promise<{ ok: boolean }> {
  // Server actions are public endpoints: anyone can call them with anything, so we validate.
  const parsed = FeedbackInput.safeParse(input);
  if (!parsed.success) return { ok: false };

  await new Promise((resolve) => setTimeout(resolve, 600));
  votes.set(parsed.data.messageId, parsed.data.vote);
  console.info(`[feedback] ${parsed.data.messageId}: ${parsed.data.vote ?? "cleared"}`);
  return { ok: true };
}

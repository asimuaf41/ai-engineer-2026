"use server";

// Harmless demo actions for the design preview. They change nothing: they only move you to the next fake state,
// so you can click through the whole flow.
import { redirect } from "next/navigation";

export async function demoChooseRepo(): Promise<void> {
  redirect("/design/connect?state=step2");
}

export async function demoChooseProject(): Promise<void> {
  redirect("/design/connect?state=ready");
}

export async function demoDisconnect(): Promise<void> {
  redirect("/design/connect?state=not-connected");
}

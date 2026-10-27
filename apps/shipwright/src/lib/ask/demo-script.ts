// The demo "model" for the Ask chat: a script that picks tools and answers based on the question.
// No API key needed. Each model call (step) plays the next part of the story.
// repo-rules: allow-secret-samples  (the answer names the fake leaked variable on purpose)
import { finish, reasoning, text, toolCall } from "@repo/ai/scripted-model";
import type { Script } from "@repo/ai/scripted-model";

const aboutKeys = /key|secret|leak/;
const aboutPriority = /first|priorit/;
const aboutFix = /fix it|pull request|\bpr\b/;

export const demoScript: Script = ({ prompt }) => {
  // No findLast: our lib is ES2022.
  let lastUser = -1;
  for (let i = 0; i < prompt.length; i++) if (prompt[i]?.role === "user") lastUser = i;

  const lastUserMessage = prompt[lastUser];
  const question = (lastUserMessage?.role === "user" ? lastUserMessage.content : [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .toLowerCase();
  const step = prompt.slice(lastUser + 1).filter((message) => message.role === "tool").length;

  // Fix request: ask for approval first, then answer depending on what the founder chose.
  // This sits before the step-0 branch below, which would otherwise answer every question at step 0.
  if (aboutFix.test(question)) {
    if (step === 0) {
      return [
        ...reasoning("r1", "Opening a pull request changes their repo, so it needs their approval first."),
        ...toolCall("call_fix", "openFixPR", { issueId: "svc-key" }),
        finish("tool-calls"),
      ];
    }
    const denied = JSON.stringify(prompt.at(-1)).includes("execution-denied");
    return [
      ...text(
        "t3",
        denied
          ? "No problem, I didn't touch your repo. When you're ready, ask me again and I'll open the pull request."
          : "Done: **pull request #42** moves the service-role key to the server and uses the anon key in the browser.\n\nNext, **rotate the old key in Supabase** (Settings → API). The old one is already public, so the PR alone isn't enough.",
      ),
      finish("stop"),
    ];
  }

  if (step === 0) {
    return aboutKeys.test(question)
      ? [
          ...reasoning("r1", "The founder is asking about secrets. I should search the code for the service-role key."),
          ...toolCall("call-1", "searchCode", { query: "SERVICE_ROLE" }),
          finish("tool-calls"),
        ]
      : [
          ...reasoning("r1", "I need the current list of open issues before I can answer."),
          ...toolCall("call-1", "listIssues", { status: "open" }),
          finish("tool-calls"),
        ];
  }

  if (step === 1 && aboutPriority.test(question)) {
    return [
      ...text(
        "t1",
        "Fix them in this order:\n\n1. **The leaked service-role key.** Rotate it and move it to a server-only variable.\n2. **Row-level security on `orders`.** Right now customers can read each other's orders.\n3. **The Stripe webhook.** Check the signature so nobody can fake a payment.\n4. **The rate limit on `/api/chat`.** It stops surprise bills.\n\nLeave the image warning for later. It is not urgent.",
      ),
      finish("stop"),
    ];
  }

  if (step === 1) {
    return [
      ...reasoning("r2", "The code shows the key is public. Let me prove it with a live check."),
      ...toolCall("call-2", "runProof", { issueId: "svc-key" }),
      finish("tool-calls"),
    ];
  }

  return [
    ...text(
      "t2",
      "**Not yet.** Your app is not safe to launch, for three reasons:\n\n1. **The database key is public.** The live check read 1,204 orders, including emails and addresses.\n2. **The key is named `NEXT_PUBLIC_SERVICE_ROLE_KEY`.** The `NEXT_PUBLIC_` prefix ships it to every visitor's browser.\n3. **Anyone can copy it** from the page source and use it.\n\n**Fix first:** rotate the key in Supabase, then move it to a server-only variable.",
    ),
    finish("stop"),
  ];
};

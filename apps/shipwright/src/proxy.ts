import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 calls this file "proxy" (it used to be "middleware").
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything EXCEPT: static files, optimized images, the favicon, image files, and /api/chat (the proxy never touches the chat stream).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/chat|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

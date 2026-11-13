// How many free questions this visitor has left today. The Ask pages read it before the first question.
import { clientIp, getQuota, visitorKey } from "@/lib/quota";

export async function GET(req: Request) {
  try {
    return Response.json(await getQuota(visitorKey(clientIp(req))), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/quota]", error);
    return Response.json({ error: "Quota unavailable" }, { status: 503 });
  }
}

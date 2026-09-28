import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, reportPreferences } from "@repo/db";

/**
 * Progress reports off, by the token in the email (plan/progress PRG-10). POST only: the
 * confirm page's form, and mail clients' one-click unsubscribe (RFC 8058), which posts
 * `List-Unsubscribe=One-Click` to this URL. No session; the token is the permission.
 */
export async function POST(request: NextRequest) {
    const token = request.nextUrl.searchParams.get("token") ?? "";
    const [row] = token
        ? await db.update(reportPreferences).set({ frequency: "OFF", updatedAt: new Date() }).where(eq(reportPreferences.unsubscribeToken, token)).returning({ userId: reportPreferences.userId })
        : [];
    const oneClick = (request.headers.get("content-type") ?? "").includes("form") && (await request.clone().formData().catch(() => null))?.get("List-Unsubscribe") === "One-Click";
    if (oneClick) return new NextResponse(null, { status: row ? 200 : 404 });
    const back = new URL(`/unsubscribe/reports?token=${encodeURIComponent(token)}${row ? "&done=1" : ""}`, request.url);
    return NextResponse.redirect(back, 303);
}

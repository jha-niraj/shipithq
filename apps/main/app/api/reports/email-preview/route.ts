import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@repo/auth";
import { emailInput } from "@repo/db/progress";
import { renderProgressEmail } from "@repo/email/progress";
import { loadOwnReport } from "@/lib/progress/reports";
import { absoluteUrl } from "@/lib/urls";

/**
 * The email a progress report goes out as, rendered for its owner to look at
 * (plan/progress PRG-10): `/api/reports/email-preview?id=<report id>`. Sends nothing.
 */
export async function GET(request: NextRequest) {
    const session = await getSession(await headers());
    if (!session?.user?.id) return new NextResponse("Sign in first.", { status: 401 });
    const id = request.nextUrl.searchParams.get("id") ?? "";
    const report = await loadOwnReport(session.user.id, id);
    if (!report) return new NextResponse("Not found.", { status: 404 });
    const { html } = renderProgressEmail(emailInput(report.snapshot, session.user.email, {
        report: absoluteUrl(`/reports/${report.id}`),
        settings: absoluteUrl("/settings/reports"),
        unsubscribe: absoluteUrl("/unsubscribe/reports?token=preview"),
    }));
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

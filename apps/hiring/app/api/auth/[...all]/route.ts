import { auth } from "@repo/auth";
import { checkWorkEmail } from "@repo/auth/work-email";
import { toNextJsHandler } from "better-auth/next-js";

/*
 * The hiring app's auth endpoint: the shared better-auth handler, with two
 * rules of this app in front of it (plan/hiring-app HA-4, Niraj 2026-09-25).
 *
 * 1. Email and password sign-up needs a company email. A free or temporary
 *    address is refused here, on the server, before any account exists, so it
 *    holds even when the page's own check is bypassed.
 * 2. No social or passwordless sign-in: companies sign in with email and
 *    password only.
 *
 * Students never reach this route (apps/main has its own), so neither rule
 * touches them. Onboarding checks the email again before a company is created
 * or joined, because a session made elsewhere is valid here too.
 */

const handler = toNextJsHandler(auth.handler);

const refuse = (status: number, code: string, message: string) =>
    Response.json({ code, message }, { status });

export const GET = handler.GET;

export async function POST(request: Request) {
    const path = new URL(request.url).pathname;

    // Social sign-in, and the two passwordless sign-ins: each can create an
    // account without passing through the company-email check below, and this
    // app offers none of them.
    if (["/sign-in/social", "/link-social", "/sign-in/magic-link", "/sign-in/email-otp"].some((p) => path.endsWith(p))) {
        return refuse(403, "SIGN_IN_METHOD_DISABLED", "Sign in with your company email and password.");
    }

    if (path.endsWith("/sign-up/email")) {
        let email = "";
        try {
            const body = (await request.clone().json()) as { email?: unknown };
            email = typeof body.email === "string" ? body.email : "";
        } catch {
            return refuse(400, "INVALID_BODY", "Could not read the sign-up form.");
        }
        const check = checkWorkEmail(email);
        if (!check.ok) return refuse(400, "WORK_EMAIL_REQUIRED", check.message);
    }

    return handler.POST(request);
}

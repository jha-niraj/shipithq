import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db, users, accounts, sessions, verifications } from "@repo/db";
import { recordActivity } from "@repo/db/activity";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sendAuthEmail } from "@repo/email/auth";
import { generateReferralCode } from "./utils/referral";

// Sending email must never take the auth endpoint down with it: a Resend outage
// should surface as "we couldn't send the code, try resend" on the next attempt,
// not a 500 that loses the just-created account. Errors are logged and swallowed.
async function trySend(params: Parameters<typeof sendAuthEmail>[0]) {
    try {
        await sendAuthEmail(params);
    } catch (err) {
        console.error(`[auth] failed to send ${params.emailType} email:`, err);
    }
}

async function nameForEmail(email: string): Promise<string> {
    try {
        const [row] = await db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        return row?.name || "there";
    } catch {
        return "there";
    }
}

// Last resort matches `apps/main`'s dev port (see its package.json `dev` script).
// It read :4101 before, which is not a port anything in this repo listens on -
// so with an unpopulated .env, better-auth would mint OAuth redirect URIs and
// magic-link URLs pointing at a dead origin.
const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:6001";

export const auth = betterAuth({
    database: drizzleAdapter(db as unknown as Parameters<typeof drizzleAdapter>[0], {
        provider: "pg",
        schema: {
            user: users,
            session: sessions,
            account: accounts,
            verification: verifications,
        },
    }),

    // ─── Email + Password ────────────────────────────────────────────────────
    // `autoSignIn: false` - sign-up hands back an unverified account and the
    // register page immediately switches to its inline OTP step. The session is
    // minted by `emailOtp.verifyEmail`, so an unverified address can never hold
    // one.
    emailAndPassword: {
        enabled: true,
        autoSignIn: false,
        requireEmailVerification: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        password: {
            hash: (password) => bcrypt.hash(password, 10),
            verify: ({ hash, password }) => bcrypt.compare(password, hash),
        },
    },

    // ─── Social Providers ────────────────────────────────────────────────────
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: (process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET_ID)!,
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_SECRET_ID!,
        },
    },

    // ─── Account linking ─────────────────────────────────────────────────────
    // Someone who registered with email/password and later hits "Continue with
    // Google" on the same address lands on their existing account instead of a
    // duplicate. Google and GitHub both return verified emails.
    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: ["google", "github"],
        },
    },

    // ─── Custom user fields (stored on the users table) ──────────────────────
    user: {
        additionalFields: {
            role: { type: "string" as const, defaultValue: "Student", input: false },
            onboardingStep: { type: "number" as const, defaultValue: 0, input: false },
            onboardingCompleted: { type: "boolean" as const, defaultValue: false, input: false },
            username: { type: "string" as const, required: false },
            referralCode: { type: "string" as const, required: false, input: false },
            totalCredits: { type: "number" as const, defaultValue: 0, input: false },
            totalXp: { type: "number" as const, defaultValue: 0, input: false },
            currentLevel: { type: "number" as const, defaultValue: 1, input: false },
            bio: { type: "string" as const, required: false },
            headline: { type: "string" as const, required: false },
            location: { type: "string" as const, required: false },
            githubUrl: { type: "string" as const, required: false },
            linkedinUrl: { type: "string" as const, required: false },
            twitterUrl: { type: "string" as const, required: false },
            websiteUrl: { type: "string" as const, required: false },
        },
    },

    // ─── Session config ───────────────────────────────────────────────────────
    session: {
        expiresIn: 60 * 60 * 24 * 30,  // 30 days
        updateAge: 60 * 60 * 24,         // refresh daily
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5,              // 5-minute client-side cache
        },
    },

    // ─── Plugins ──────────────────────────────────────────────────────────────
    plugins: [
        // Email OTP - powers the inline verification step on /register.
        // `sendVerificationOnSignUp` mails the code from the sign-up response
        // itself, so the register page can flip straight to its OTP step without
        // a second round trip. (Deliberately NOT paired with
        // `overrideDefaultEmailVerification`: that option replaces better-auth's
        // verification sender and, in doing so, disables this on-sign-up hook.)
        emailOTP({
            otpLength: 6,
            expiresIn: 600,          // 10 minutes - matches the copy in the email
            allowedAttempts: 5,
            sendVerificationOnSignUp: true,
            // Hashed at rest: a leak of the `verification` table yields nothing
            // replayable. (Rules out "reuse" resends - a resend rotates the code.)
            storeOTP: "hashed",
            async sendVerificationOTP({ email, otp, type }) {
                await trySend({
                    email,
                    name: await nameForEmail(email),
                    emailType: type === "forget-password" ? "RESET_PASSWORD_OTP" : "VERIFY_OTP",
                    otp,
                });
            },
        }),

        // Magic link - the user types an email, we mail them a URL that hits
        // better-auth's verify endpoint. That endpoint consumes the token, sets
        // the session cookie and 302s to `callbackURL`. Middleware then sends a
        // user who hasn't onboarded to /onboarding and everyone else to /home,
        // so one callback covers both the new- and returning-user cases.
        magicLink({
            storeToken: "hashed",
            expiresIn: 600,          // 10 minutes
            disableSignUp: false,    // an unknown email signs up (already verified)
            async sendMagicLink({ email, url }) {
                await trySend({
                    email,
                    name: await nameForEmail(email),
                    emailType: "MAGIC_LINK",
                    url,
                });
            },
        }),

        // Must stay last: writes better-auth's Set-Cookie headers through
        // next/headers so server actions and route handlers both see the session.
        nextCookies(),
    ],

    // ─── Database hooks ───────────────────────────────────────────────────────
    databaseHooks: {
        user: {
            create: {
                // Every user needs a referral code, whichever door they came in
                // through (password, Google, GitHub, magic link). Doing it here
                // instead of in the register route means the social and
                // passwordless paths can't silently skip it.
                before: async (user) => {
                    const u = user as { name?: string | null; referralCode?: string | null };
                    if (u.referralCode) return { data: user };
                    try {
                        return { data: { ...user, referralCode: await generateReferralCode(u.name || "user") } };
                    } catch (err) {
                        console.error("[auth] referral code generation failed:", err);
                        return { data: user };
                    }
                },
                // Joining is the first entry in the activity ledger (plan/progress PRG-11),
                // whichever door they came in through. Never blocks the sign-up.
                after: async (user) => {
                    await recordActivity(db, user.id, { type: "SIGNUP", title: "Joined ShipItHQ", description: "Welcome aboard", key: `signup:${user.id}` });
                },
            },
            update: {
                // A social sign-in hands us an already-verified address; the OTP
                // path sets emailVerified itself. Nothing to do here - the hook
                // exists so the shape stays obvious to the next reader.
            },
        },
    },

    // ─── App config ───────────────────────────────────────────────────────────
    baseURL: APP_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    basePath: "/api/auth",

    // ─── Cross-subdomain cookies ─────────────────────────────────────────────
    // The app (app.shipithq.com) and the marketing site (shipithq.com) are
    // separate deploys. Setting AUTH_COOKIE_DOMAIN to the shared parent domain
    // (".shipithq.com") makes the session cookie readable across subdomains, so
    // the marketing navbar can show "Go to Dashboard" for a logged-in visitor.
    // Left disabled on localhost (no shared parent domain).
    advanced: {
        crossSubDomainCookies: {
            enabled: Boolean(process.env.AUTH_COOKIE_DOMAIN),
            domain: process.env.AUTH_COOKIE_DOMAIN,
        },
        cookiePrefix: "shipithq",
    },

    // Fallbacks match the `dev` ports in each app's package.json. They were wrong
    // before - web pointed at :3000 (it runs on :4100) and uni/admin were
    // swapped - which only stayed invisible because .env sets these explicitly.
    // A machine without a populated .env would have failed CSRF checks on the
    // wrong origins with no obvious cause.
    trustedOrigins: [
        process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:6005",
        process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:6001",
        process.env.NEXT_PUBLIC_UNI_URL || "http://localhost:6003",
        process.env.NEXT_PUBLIC_HIRING_URL || "http://localhost:6004",
        process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:6002",
    ].filter(Boolean) as string[],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

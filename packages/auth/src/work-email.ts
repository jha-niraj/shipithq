/**
 * Company email only, for the hiring app (plan/hiring-app HA-4, Niraj 2026-09-25).
 *
 * Plain module - no server-only imports - so the hiring app's sign-up page can
 * give early feedback with the same rule the server enforces. The server is
 * what counts: the hiring auth route refuses a free or temporary address
 * before an account is created, and onboarding refuses it again before a
 * company is created or joined. The second check matters because the session
 * cookie is shared across subdomains: a student signed in on the main app with
 * gmail arrives at the hiring app already signed in.
 *
 * Students are never affected: this runs only on hiring's paths.
 */

/** Consumer mailbox providers: a person, not a company. */
export const FREE_MAIL_DOMAINS: readonly string[] = [
    "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.co.uk", "ymail.com", "rocketmail.com",
    "outlook.com", "hotmail.com", "hotmail.co.uk", "live.com", "live.in", "msn.com", "windowslive.com",
    "icloud.com", "me.com", "mac.com", "aol.com", "aim.com",
    "proton.me", "protonmail.com", "protonmail.ch", "pm.me", "tutanota.com", "tutanota.de", "tuta.io", "tutamail.com",
    "zoho.com", "zohomail.com", "zohomail.in", "yandex.com", "yandex.ru", "ya.ru", "mail.ru", "inbox.ru", "list.ru", "bk.ru",
    "gmx.com", "gmx.de", "gmx.net", "web.de", "mail.com", "email.com", "usa.com",
    "rediffmail.com", "rediff.com", "qq.com", "163.com", "126.com", "sina.com", "naver.com", "daum.net", "hanmail.net",
    "fastmail.com", "fastmail.fm", "hey.com", "duck.com", "skiff.com", "mailfence.com", "posteo.de", "hushmail.com",
]

/** Throwaway inboxes: nobody can be reached at them later. */
export const DISPOSABLE_MAIL_DOMAINS: readonly string[] = [
    "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamailblock.com", "sharklasers.com", "grr.la",
    "10minutemail.com", "10minutemail.net", "temp-mail.org", "tempmail.com", "tempmail.net", "tempmailo.com", "tempr.email",
    "yopmail.com", "yopmail.net", "trashmail.com", "trashmail.de", "getnada.com", "nada.email", "dispostable.com",
    "maildrop.cc", "throwawaymail.com", "fakeinbox.com", "mintemail.com", "mohmal.com", "emailondeck.com", "burnermail.io",
    "moakt.com", "mailnesia.com", "spamgourmet.com", "mytemp.email", "tempinbox.com", "discard.email", "mailpoof.com",
    "inboxkitten.com", "emailfake.com", "fakemail.net", "mail.tm", "mail.gw", "tmpmail.org", "tmpmail.net", "harakirimail.com",
    "33mail.com", "anonaddy.me", "simplelogin.com", "simplelogin.io", "spambox.us", "trbvm.com", "dropmail.me", "linshiyouxiang.net",
]

const FREE = new Set(FREE_MAIL_DOMAINS)
const DISPOSABLE = new Set(DISPOSABLE_MAIL_DOMAINS)

/** The domain part of an address, lower-cased, or null when there is none. */
export function emailDomain(email: string): string | null {
    const at = email.trim().toLowerCase().lastIndexOf("@")
    if (at < 1) return null
    const domain = email.trim().toLowerCase().slice(at + 1)
    return domain.includes(".") ? domain : null
}

/** A domain or any subdomain of it ("mail.yahoo.com" is yahoo.com). */
function inList(domain: string, list: Set<string>): boolean {
    const parts = domain.split(".")
    for (let i = 0; i < parts.length - 1; i++) {
        if (list.has(parts.slice(i).join("."))) return true
    }
    return false
}

export const WORK_EMAIL_MESSAGE = "Use your company email. Free and temporary addresses can't create or join a company."

export type WorkEmailCheck = { ok: true; domain: string } | { ok: false; reason: "invalid" | "free" | "disposable"; message: string }

export function checkWorkEmail(email: string): WorkEmailCheck {
    const domain = emailDomain(email)
    if (!domain) return { ok: false, reason: "invalid", message: "Enter a valid email address." }
    if (inList(domain, DISPOSABLE)) return { ok: false, reason: "disposable", message: WORK_EMAIL_MESSAGE }
    if (inList(domain, FREE)) return { ok: false, reason: "free", message: WORK_EMAIL_MESSAGE }
    return { ok: true, domain }
}

export const isWorkEmail = (email: string): boolean => checkWorkEmail(email).ok

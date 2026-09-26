/*
 * Is this page a job posting, and what is the posting (plan/interview-prep IP-4;
 * shared with the worker by plan/job-import JI-3). Pure text rules, no network:
 * the login-wall check that stops a sign-in page being treated as a job, the
 * cleaner that drops a job board's furniture, and the title and company read
 * from a page title. Moved here unchanged from apps/main's
 * utils/jobs/extract-job-description.ts so the app and the worker judge a page
 * the same way.
 */

/**
 * What a scrape has to clear before it counts as a job description.
 *
 * ── The failure this exists to catch ──
 *
 * Exa fetched a LinkedIn jobs URL and got back LinkedIn's LOGIN PAGE:
 *
 *     "LinkedIn Login, Sign in | LinkedIn  # Sign in  Stay updated on your
 *      professional world.  Show"
 *
 * That is not empty, so the only check here - `if (!jd)` - passed, the action returned
 * `success: true`, and the login wall was pasted into the job-description box. The user
 * then had a Tailor button offering to spend 20 credits rewriting their resume against
 * the words "Sign in".
 *
 * A wall is the NORMAL outcome for LinkedIn, Glassdoor and Indeed, which all serve one to
 * anything without a session. So this is the common path, not an edge case, and it has to
 * fail loudly and say what to do instead.
 */
const WALL_MARKERS = [
    "sign in", "signin", "log in", "login", "join now", "create an account",
    "enable javascript", "captcha", "are you a robot", "access denied",
    "verify you are human", "please enable cookies", "403 forbidden",
]

/** Real postings are long. Most walls we had seen were a few hundred characters. */
const MIN_JD_CHARS = 400

/**
 * Wall text that identifies itself in the OPENING of the document, in any of the
 * languages LinkedIn serves it in.
 *
 * Two things this fixes, found 2026-08-27 by fetching a real LinkedIn job URL:
 *
 * 1. **A long wall was never checked at all.** The body-marker test below only ran
 *    when the text was under `MIN_JD_CHARS`, on the assumption above that walls are
 *    short. LinkedIn returned **4,357 characters** of sign-in wall, sailed past the
 *    length gate, had no marker in its `<title>` (LinkedIn serves the real role name
 *    there even on the wall), and was handed back as a job description with
 *    "Job description pulled in - check it before tailoring".
 * 2. **The markers were English-only.** What came back was Dutch - "Akkoord en lid
 *    worden van LinkedIn", "Door op Doorgaan te klikken om deel te nemen of u aan te
 *    melden". Not one English marker matched. Exa serves whatever localisation the
 *    edge decides, so the language of the wall is not ours to predict.
 *
 * Matched against the OPENING only, not the whole body, and that is deliberate: a
 * real posting can legitimately say "sign in to our portal" somewhere in the middle,
 * and rejecting it would be worse than the bug. No real posting OPENS by asking you
 * to agree to a user agreement and join.
 */
const WALL_OPENERS: RegExp[] = [
    // English
    /agree\s*&?\s*join linkedin/i,
    /by clicking continue to join or sign in/i,
    /join linkedin to (see|view|apply)/i,
    // Dutch - the one actually observed
    /akkoord en lid worden van linkedin/i,
    /door op doorgaan te klikken om deel te nemen of u aan te melden/i,
    // German
    /stimmen sie zu und treten sie linkedin bei/i,
    // French
    /accepter et rejoindre linkedin/i,
    // Spanish / Portuguese
    /aceptar y unirse a linkedin/i,
    /concordar e ingressar no linkedin/i,
    // Structural, language-independent: LinkedIn's wall always names its own
    // agreement documents together, and a job posting never does.
    /(user agreement|gebruikersovereenkomst|nutzungsvereinbarung|contrat d.utilisateur)[\s\S]{0,120}(privacy policy|privacybeleid|datenschutzrichtlinie|politique de confidentialit)/i,
]

/** How much of the front of the document counts as "the opening". */
const WALL_OPENER_WINDOW = 400

export function wallReason(text: string, title: string, url: string): string | null {
    const body = text.toLowerCase()
    const head = title.toLowerCase()

    // A LinkedIn SEARCH url is the wrong page even with a session - it lists jobs, it is
    // not one. Worth its own message because it is the URL people actually copy.
    if (/linkedin\.com\/jobs\/(search|search-results|collections)/i.test(url)) {
        return "That is a LinkedIn search page, not a single posting. Open the job itself - the URL looks like linkedin.com/jobs/view/1234567890 - or paste the description below."
    }

    // Checked BEFORE the length gate and regardless of length - a wall that is long
    // is still a wall, and that is exactly what slipped through before.
    if (WALL_OPENERS.some(re => re.test(text.slice(0, WALL_OPENER_WINDOW)))) {
        return "That page returned its sign-in wall rather than the posting - LinkedIn serves one to readers that are not signed in. Open the job yourself and paste the description below."
    }

    if (body.length < MIN_JD_CHARS) {
        const marker = WALL_MARKERS.find(m => body.includes(m) || head.includes(m))
        if (marker) {
            return "That page asked us to sign in, so we only got its login screen. Sites like LinkedIn, Glassdoor and Indeed block automated readers - open the posting yourself and paste the description below."
        }
        return `We only got ${body.length} characters back, which is too short to be a job description. Paste it below instead.`
    }

    // Long but still a wall: a marker in the TITLE is the giveaway, because a real
    // posting's title is the role.
    if (WALL_MARKERS.some(m => head.includes(m))) {
        return "That page returned its sign-in screen rather than the posting. Paste the description below instead."
    }
    return null
}

/**
 * Strip a job board's own furniture off a scraped page.
 *
 * ── The failure this exists to catch ──
 *
 * The wall check now lets a real LinkedIn posting through, and what comes back is the whole
 * PAGE: the posting itself, then "Similar jobs" with twenty-five other listings, then
 * "People also viewed", then twenty-five "Similar Searches" links, then a footer. On the
 * reported fetch the actual advert was about a tenth of the text.
 *
 * That text is not just untidy - it is the INPUT to gpt-4o for both ATS scoring and
 * tailoring, and both are priced. Scoring a resume against twenty-five unrelated adverts is
 * what returned 0/100 with "missing keywords" like "based in Bangalore", "immediate
 * joiners" and "2 to 6 years of experience": recruiter boilerplate and other companies'
 * roles, none of which belongs on anyone's resume. The user was being charged 5 credits for
 * an answer computed from noise, and offered a 20-credit rewrite against the same noise.
 *
 * ── How it cuts ──
 *
 * Everything from the first TRAILER marker onward is dropped: those headings only ever
 * appear after the advert has ended. Whole-line chrome goes, inline fragments like
 * "Over 200 applicants" are removed from otherwise-real lines, and the role and company
 * headings that LinkedIn repeats three times are de-duplicated.
 *
 * Conservative by design: an unrecognised layout keeps its text. Losing part of a real
 * posting is worse than leaving some boilerplate in, because the user can see and delete
 * boilerplate but cannot restore a requirement that was silently cut.
 */
const JD_TRAILERS = [
    "similar jobs", "people also viewed", "similar searches", "explore top content",
    "referrals increase your chances", "get notified about new", "sign in to create job alert",
    "show more jobs like this", "more searches", "related jobs", "recommended for you",
    "jobs you may be interested in", "you may also like", "set alert for similar jobs",
]

/** Whole lines that are chrome wherever they appear. Tested AFTER the markdown marker is stripped. */
const JD_NOISE_LINES = [
    /^agree & join linkedin$/i, /^by clicking continue to join or sign in/i,
    /^apply$/i, /^easy apply$/i, /^save$/i, /^show more show less$/i,
    /^show more$/i, /^show less$/i, /^see who you know$/i, /^sign in$/i,
    /^join now$/i, /^continue$/i, /^\d+ (days?|weeks?|months?|hours?) ago$/i,
    /^over \d+ applicants$/i,
    /^(seniority level|employment type|job function|industries|base pay range|benefits found in job post)$/i,
]

/** Fragments that ride along inside a line that is otherwise worth keeping. */
const JD_NOISE_INLINE = [
    /\bsee who .{0,60}? has hired for this role\b/gi,
    /\bover \d+ applicants\b/gi,
    /\b\d+ (days?|weeks?|months?|hours?) ago\b/gi,
    /\bshow more show less\b/gi,
]

export function cleanJobDescription(text: string, pageTitle: string): string {
    const titleBare = pageTitle.trim().toLowerCase()
    const out: string[] = []

    for (const line of text.split("\n")) {
        let t = line.trim()
        const bare = t.replace(/^#{1,6}\s*/, "").replace(/^[-*]\s+/, "").trim()
        const low = bare.toLowerCase()

        if (JD_TRAILERS.some(m => low === m || low.startsWith(m))) break
        if (!t) { if (out.length && out[out.length - 1] !== "") out.push(""); continue }
        if (JD_NOISE_LINES.some(re => re.test(bare))) continue
        // The page <title>, which Exa also emits as the first body line.
        if (titleBare && low === titleBare) continue

        for (const re of JD_NOISE_INLINE) t = t.replace(re, " ")
        t = t.replace(/\s{2,}/g, " ").trim()
        if (!t || t.replace(/^#{1,6}\s*/, "").trim() === "") continue
        out.push(t)
    }

    // LinkedIn prints the role and the company as headings three times over. Keep the first.
    const seen = new Set<string>()
    const kept: string[] = []
    for (const l of out) {
        const bare = l.replace(/^#{1,6}\s*/, "").trim().toLowerCase()
        if (bare && bare.length < 140 && seen.has(bare)) continue
        if (bare) seen.add(bare)
        kept.push(l)
    }
    return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

/**
 * The ROLE, out of a page title.
 *
 * `res.title` was being written straight into the Job Title field, so it read
 * "Founding Backend Engineer at Mopid <emdash> Bengaluru, Karnataka, India | LinkedIn Jobs" -
 * and that whole string was then sent to the tailoring model as the job being applied for.
 *
 * The dash class is written with escapes on purpose: an em or en dash is banned in this
 * codebase's source, but scraped titles are full of them and the pattern has to match one.
 */
export function cleanJobTitle(raw: string): string {
    let t = (raw ?? "").trim()
    t = t.replace(/\s*[|·]\s*(linkedin|indeed|glassdoor|wellfound|naukri|ziprecruiter)[^|]*$/i, "")
    t = t.split(/\s+[\u2014\u2013-]\s+/)[0] ?? t   // " - Bengaluru, Karnataka, India"
    t = t.split(/\s+\bat\b\s+/i)[0] ?? t           // " at Mopid"
    t = t.replace(/\s*[|·]\s*.*$/, "")
    return t.trim().slice(0, 120)
}

/** The COMPANY, if the title says "<role> at <company>". */
export function companyFromTitle(raw: string): string {
    const m = /\s+\bat\b\s+([^|\u2014\u2013]+)/i.exec(raw ?? "")
    if (!m?.[1]) return ""
    return (m[1].split(/\s+[\u2014\u2013-]\s+/)[0] ?? "").trim().slice(0, 80)
}

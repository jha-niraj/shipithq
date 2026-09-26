/**
 * Scrape a job posting into a usable job description.
 *
 * Lifted out of `actions/(main)/ai/cover-letter.action.ts`, unchanged, because a
 * second feature now needs the identical scrape: Pathfinder generates interview
 * questions from a job description (plan/interview-prep/). Copying it instead is
 * exactly how this codebase ended up with three mock-interview implementations
 * and three copies of the pathfinder category union.
 *
 * NOTE THE ABSENCE OF `"use server"`. This file is a plain module, deliberately.
 * In a `"use server"` file every exported async function becomes a callable
 * endpoint, so moving these here under that directive would have published the
 * scraper - and its Exa key usage - as a public action. Authentication stays in
 * the server actions that call this.
 */

import Exa from "exa-js";


// ── Exa client (lazy singleton) ──────────────────────────────────────────────
let _exa: Exa | null = null
const exa = new Proxy({} as Exa, {
    get(_, prop) {
        if (!_exa) _exa = new Exa(process.env.EXA_API_KEY!)
        return Reflect.get(_exa, prop)
    }
})

import { cleanJobDescription, cleanJobTitle, companyFromTitle, wallReason } from "@repo/exa/job-page"

/**
 * Fetch a URL and return a job description, or a reason it is not one.
 *
 * Callers must do their own auth first. This function does none.
 */
export async function scrapeJobDescription(url: string): Promise<
    | { success: true; description: string; title: string; company: string }
    | { success: false; error: string }
> {
    try {
        const result = await exa.getContents([url], {
            text: true,
            livecrawlTimeout: 8000,
        })

        if (!result?.results?.length) {
            return { success: false, error: "Failed to extract job description. Try pasting it manually." };
        }

        const firstResult = result.results[0]
        const jd = firstResult?.text?.trim() || ""
        const title = firstResult?.title || ""

        if (!jd) {
            return { success: false, error: "Extracted content was empty. Try pasting the job description manually." };
        }

        // Refuse a wall rather than handing it back as a description. Returning it would
        // put a login page in front of a 20-credit Tailor button.
        const reason = wallReason(jd, title, url)
        if (reason) return { success: false, error: reason }

        // Strip the board's own furniture. What is left is what gets priced.
        const description = cleanJobDescription(jd, title)
        if (description.length < 200) {
            // Cleaning took almost everything, which means the layout was not what it looked
            // like. Hand back the raw text rather than a stub - the user can edit it.
            return { success: true, description: jd, title: cleanJobTitle(title), company: companyFromTitle(title) }
        }

        return {
            success: true,
            description,
            title: cleanJobTitle(title),
            company: companyFromTitle(title),
        }
    } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : "Failed to extract job description." };
    }
}

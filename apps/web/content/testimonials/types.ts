/**
 * One testimonial on a TestimonialWall (plan/web/revamp REV-14).
 *
 * Only real people who agreed to be quoted. No stock photos, no invented names, no
 * paraphrase dressed as a quote (plan/web/polish definition of done, line 2). A wall
 * renders only once its audience has MIN_TESTIMONIALS entries, so filling half a file
 * never ships a thin wall.
 *
 * How to add one:
 *   1. Save the avatar (square, at least 96px, jpg or webp) to
 *      apps/web/public/testimonials/<handle-or-name>.jpg. Local files only: no hotlinks.
 *   2. Add an entry to the audience's file:
 *      {
 *        name: "Asha Rao",
 *        handle: "asharao",            // without the @; omit if none
 *        role: "Final year, IIT Madras", // who they are, one line
 *        avatar: "/testimonials/asharao.jpg",
 *        text: "Exact words, as posted.",
 *        source: "x",                  // "x" | "linkedin" | "email"
 *        url: "https://x.com/...",     // the original post; omit for email
 *        date: "2026-09-12",           // when they said it
 *      }
 */
export interface Testimonial {
    name: string
    handle?: string
    role: string
    /** A local image under /testimonials. Omitted: initials on a pastel circle. */
    avatar?: string
    text: string
    source: "x" | "linkedin" | "email"
    url?: string
    date: string
    /** Shown large at the top of the wall (REV-117). The first featured entry wins; none: the first entry. */
    featured?: boolean
}

export const MIN_TESTIMONIALS = 6

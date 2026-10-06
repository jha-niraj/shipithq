import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og"

/** The social card for /incidents (plan/web/story ST-6), from the same builder as the blog's. */

export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = "ShipItHQ Incidents: real production failures you play"

export default async function IncidentsOgImage() {
    return ogImage({
        eyebrow: "ShipItHQ Incidents",
        title: "Learn production from the day it broke",
        footer: "Real failures as cases you play, with an AI incident lead",
    })
}

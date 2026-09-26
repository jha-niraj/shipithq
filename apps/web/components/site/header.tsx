import { AnnouncementBar } from "./announcement-bar"
import { SiteNavbar } from "./navbar"

/**
 * The top of every page: the announcement strip (scrolls away), then the sticky
 * navbar. Both are in the page flow, so no page pads its top to clear them.
 */
export function SiteHeader() {
    return (
        <>
            <AnnouncementBar />
            <SiteNavbar />
        </>
    )
}

export default SiteHeader

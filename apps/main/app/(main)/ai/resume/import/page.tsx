import { redirect } from "next/navigation"

/**
 * AI Import is a sheet on the hub now (plan/resume RES-23). This address stays so
 * existing links and bookmarks still land somewhere: the hub opens the sheet for
 * `?import=1` and then removes the flag from the URL.
 */
export default function ImportPage() {
    redirect("/ai/resume?import=1")
}

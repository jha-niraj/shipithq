import { redirect } from "next/navigation"

// Moved into the Explore page's "mine" tab (plan/projects, PJ-4). Kept as a
// redirect because these URLs are in people's history and in older links.
export default function Page() {
    redirect("/projects/explore?tab=mine")
}

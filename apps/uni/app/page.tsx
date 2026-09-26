import { redirect } from "next/navigation"

// uni.shipithq.com opens on sign-in (plan/web/revamp REV-32), as the hiring app does.
// The marketing page for universities lives on the website at shipithq.com/uni. A
// signed-in visitor never reaches this: middleware.ts sends them on first.
export default function Root() {
    redirect("/signin")
}

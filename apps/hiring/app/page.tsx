import { redirect } from "next/navigation"

// hire.shipithq.com opens on sign-in (plan/hiring-app HA-3). The marketing page
// for companies lives on the website at shipithq.com/hire. A signed-in visitor
// never reaches this: middleware.ts sends them to /home (or /onboarding) first.
export default function Root() {
    redirect("/signin")
}

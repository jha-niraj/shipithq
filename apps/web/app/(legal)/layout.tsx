import { ReactNode } from "react";
import SiteHeader from "@/components/site/header";
import SiteFooter from "@/components/site/footer";

// The legal pages used to render bare - no navbar, no footer - so landing on
// /privacypolicy from a search result dropped you into a dead end with no way back
// into the site. Giving the (legal) group a layout puts the same chrome around them
// as every other public page, with no change to the page components themselves.
//
// Server component: the only interactive parts (navbar, footer) are already client
// components, so there is no reason to opt the legal tree into client JS.
export default function LegalLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-white dark:bg-neutral-950">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
        </div>
    );
}

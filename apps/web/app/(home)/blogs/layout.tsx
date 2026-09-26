import { ReactNode } from "react"
import SiteHeader from "@/components/site/header";
import { FooterForPath } from "@/components/site/footer-for-path";

// Server component on purpose: the navbar is the only interactive part, and passing
// `children` through it keeps the blog pages server-rendered. The footer lives here,
// not in the index, so posts and topic hubs have it too (plan/web/revamp REV-73).
export default function BlogsLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-h-screen w-full flex-col bg-white dark:bg-neutral-950">
			<SiteHeader />
			<main className="flex-1">{children}</main>
			<FooterForPath />
		</div>
	)
}

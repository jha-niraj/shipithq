import type { Metadata, Viewport } from "next";
import { AnnouncementHideScript } from "@/components/site/announcement-bar";
import "@repo/ui/styles/globals.css";
import { RevealObserver } from "@/components/reveal-observer";
import { ThemeProvider } from "@repo/ui/components/themeprovider";
import { Geist, Space_Grotesk, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { Toaster as SonnerToaster } from "@repo/ui/components/ui/sonner";
import { SoundEffects } from "@repo/ui/components/ui/sounds";
import { Providers } from "@/app/providers";
import { SITE, BRAND } from "@/lib/site";
import { organizationSchema, websiteSchema, serviceSchema, jsonLd } from "@/lib/schema";

// No analytics component is rendered here on purpose. This site deploys to Cloudflare
// Workers, where Cloudflare Web Analytics is injected by the platform automatically - it
// needs no package and no <script> in the tree. (`@vercel/analytics` used to be mounted
// here; on a non-Vercel host its beacon 404s on every page load, which shows up as a
// console error and a Lighthouse Best-Practices deduction.) Enable it under
// Cloudflare dashboard -> Web Analytics for the shipithq.com hostname.

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
	display: "swap",
});
const spaceGrotesk = Space_Grotesk({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
	display: "swap",
	variable: "--font-space-grotesk",
});
const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
	display: "swap",
});

const bricolage = Bricolage_Grotesque({
	subsets: ["latin"],
	// NO `weight` array, deliberately. Bricolage is a variable face (wght 200-800);
	// naming the seven weights pins next/font to those instances instead of
	// letting one variable file cover the range.
	//
	// `axes` is the other half, and the reason this face was chosen: Bricolage
	// carries an optical-size axis, and next/font only requests axes you name.
	// Without opsz the large headings lose the automatic optical sizing that makes
	// them look right at display size.
	//
	// Worth knowing when checking this: a .woff2 is Brotli-compressed, so grepping
	// the file for "fvar" or "opsz" finds nothing whether or not the axes are
	// there. The table DIRECTORY is uncompressed, so `fvar` is detectable from it;
	// the axis tags are not, without decompressing. Confirm opsz in DevTools
	// (Network -> the font -> the request URL Google was asked for).
	axes: ["opsz"],
	display: "swap",
	// Registered as --font-display, which globals.css maps to the `font-display`
	// utility - so every h1/h2 and the sidebar pick it up without each app
	// restating the stack.
	variable: "--font-display",
});

const DEFAULT_TITLE = `${BRAND.name} - ${BRAND.tagline}`;
const DEFAULT_DESCRIPTION =
	"AI-powered career tools for CS students and software engineers. Practise mock interviews and DSA, build a portfolio that gets read, and land your next engineering role.";

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
	],
};

export const metadata: Metadata = {
	title: {
		default: DEFAULT_TITLE,
		template: `%s | ${BRAND.name}`,
	},
	description: DEFAULT_DESCRIPTION,
	applicationName: BRAND.name,
	keywords: [
		"software engineering portfolio", "mock technical interview", "system design prep",
		"DSA practice", "open source contribution tracker", "AI resume builder",
		"cover letter generator", "coding interview prep", "cs student platform",
		"developer career tools", "ShipItHQ", "engineering intelligence suite",
	],
	authors: [{ name: "Niraj Kumar Jha", url: `${SITE}/aboutus` }],
	creator: BRAND.name,
	publisher: BRAND.name,
	metadataBase: new URL(SITE),
	alternates: {
		canonical: "/",
	},
	openGraph: {
		type: "website",
		locale: "en_US",
		url: SITE,
		siteName: BRAND.name,
		title: DEFAULT_TITLE,
		description: DEFAULT_DESCRIPTION,
		images: [
			{
				url: "/og/home.webp",
				width: 1200,
				height: 630,
				alt: `${BRAND.name} - ${BRAND.tagline}`,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: DEFAULT_TITLE,
		description: DEFAULT_DESCRIPTION,
		images: ["/og/home.webp"],
		creator: "@shipithq",
		site: "@shipithq",
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
};

// Site-wide structured data lives in `lib/schema.ts`, declared once and referenced by
// `@id` everywhere else. It used to be three literals here, and then the landing page
// declared `WebSite` a second time with the SAME `@id` - two competing definitions of one
// entity, where which one wins is not something you get to choose.
//
// `serviceSchema` replaced a `SoftwareApplication` node that failed Google validation on
// every page inheriting this layout. The reasoning, and the condition for ever adding an
// aggregateRating, are in that file.

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	// Native scrolling only (Lenis removed, plan/web/revamp REV-70): the browser's own
	// smooth scroll for anchor jumps, off under reduced motion.
	//
	// Two fixes for "the page lands a little below the hero" (Niraj, 2026-09-26, REV-87):
	//   - `data-scroll-behavior="smooth"` tells Next to switch smooth scrolling off while
	//     it scrolls a new page into view, so a navigation jumps instead of gliding;
	//   - `scroll-pt-16` reserves the sticky navbar's 64px, so when Next scrolls the new
	//     page segment into view its top is not tucked under the bar.
	return (
		<html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className="scroll-smooth scroll-pt-16 motion-reduce:scroll-auto">
			<head>
				<script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(organizationSchema)} />
				<script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(websiteSchema)} />
				<script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(serviceSchema)} />
				<AnnouncementHideScript />
			</head>
			<body
				className={`${spaceGrotesk.className} ${bricolage.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				{/* One observer for every scroll reveal on the site - see reveal.tsx. */}
				<RevealObserver />
				<Providers>
					<ThemeProvider
						attribute="class"
						// Light only (plan/web/revamp REV-1, Niraj 2026-09-25). forcedTheme wins over
						// a stored "dark" from before, and there is no toggle anywhere on web. The
						// `dark:` classes stay in the code on purpose, untouched.
						forcedTheme="light"
						defaultTheme="light"
						// NOT disableTransitionOnChange: that injects `* { transition: none !important }`
						// around the class swap, which cancels the colour crossfade that
						// packages/ui/src/lib/theme-transition.ts installs for the switch. With it
						// on, the theme snapped between states instead of animating - the flicker.
					>
						{children}
						{/* Position, close button and styling are the shared defaults in
						    @repo/ui - deliberately not set per app, so all five stay in sync. */}
						<SonnerToaster />
						{/* Interface sounds, on by default; the sidebar's speaker mutes them (plan/ui-sounds). */}
						<SoundEffects />
					</ThemeProvider>
				</Providers>
			</body>
		</html>
	);
}

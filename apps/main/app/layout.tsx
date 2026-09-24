import type { Metadata } from "next";
import "@repo/ui/styles/globals.css";
import { ThemeProvider } from "@repo/ui/components/themeprovider";
import { Geist, Space_Grotesk, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { Toaster as SonnerToaster } from "@repo/ui/components/ui/sonner";
import { SoundEffects } from "@repo/ui/components/ui/sounds";
import { Providers } from "@/app/providers/providers";
import { AppProvider } from "./context/usercontext";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
	display: "swap",
});
const spaceGrotesk = Space_Grotesk({
	subsets: ['latin'],
	weight: ['300', '400', '500', '600', '700'],
	display: 'swap',
	variable: '--font-space-grotesk',
})
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

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.shipithq.com'

export const metadata: Metadata = {
	title: {
		default: "ShipItHQ - The Engineering Intelligence Suite",
		template: "%s | ShipItHQ"
	},
	description: "AI-powered platform for CS students and software engineers. Build your portfolio, ace technical interviews, practice DSA, and land your dream engineering job.",
	keywords: [
		"software engineering portfolio", "mock technical interview", "system design prep",
		"DSA practice", "open source contribution tracker", "AI resume builder",
		"cover letter generator", "coding interview prep", "cs student platform",
		"developer career tools", "ShipItHQ", "engineering intelligence suite"
	],
	authors: [{ name: "Niraj Jha", url: BASE_URL }],
	creator: "Shunya Tech",
	publisher: "Shunya Tech",
	metadataBase: new URL(BASE_URL),
	alternates: {
		canonical: "/",
	},
	openGraph: {
		type: "website",
		locale: "en_US",
		url: BASE_URL,
		siteName: "ShipItHQ",
		title: "ShipItHQ - The Engineering Intelligence Suite",
		description: "AI-powered platform for CS students and software engineers. Build your portfolio, ace interviews, practice DSA, and land your dream engineering job.",
		images: [
			{
				url: "/og/home.webp",
				width: 1200,
				height: 630,
				alt: "ShipItHQ - The Engineering Intelligence Suite for Developers",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "ShipItHQ - The Engineering Intelligence Suite",
		description: "AI-powered platform for CS students and software engineers. Build your portfolio, ace interviews, practice DSA, and land your dream engineering job.",
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
	verification: {
		// Add when domain is verified in Google Search Console
		// google: "your-google-verification-code",
	},
	other: {
		"theme-color": "#0a0a0a",
	},
};

const organizationSchema = {
	"@context": "https://schema.org",
	"@type": "Organization",
	"name": "ShipItHQ",
	"url": BASE_URL,
	"logo": `${BASE_URL}/icon-512.png`,
	"description": "AI-powered engineering intelligence platform for CS students and software engineers.",
	"sameAs": [
		"https://twitter.com/shipithq",
		"https://github.com/shipithq",
		"https://linkedin.com/company/shipithq"
	],
	"foundingDate": "2024",
	"founders": [{ "@type": "Person", "name": "Niraj Jha" }],
}

const websiteSchema = {
	"@context": "https://schema.org",
	"@type": "WebSite",
	"name": "ShipItHQ",
	"url": BASE_URL,
	"description": "AI-powered platform for CS students and software engineers.",
	"potentialAction": {
		"@type": "SearchAction",
		"target": {
			"@type": "EntryPoint",
			"urlTemplate": `${BASE_URL}/search?q={search_term_string}`
		},
		"query-input": "required name=search_term_string"
	}
}

const softwareAppSchema = {
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	"name": "ShipItHQ",
	"url": BASE_URL,
	"applicationCategory": "DeveloperApplication",
	"operatingSystem": "Web",
	"description": "AI-powered engineering intelligence suite: resume builder, mock interviews, DSA practice, system design prep, and open source tracking - all in one platform.",
	"offers": {
		"@type": "Offer",
		"price": "0",
		"priceCurrency": "USD",
		"description": "Free to use"
	},
	"aggregateRating": {
		"@type": "AggregateRating",
		"ratingValue": "4.8",
		"ratingCount": "120",
		"bestRating": "5"
	}
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
				/>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
				/>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
				/>
			</head>
			{/* `spaceGrotesk.variable` (not just its className) so components in
			    @repo/ui - the loader wordmark, notably - can reference the display
			    face as `var(--font-space-grotesk)` instead of hardcoding a stack. */}
			<body className={`
				${spaceGrotesk.className} ${bricolage.variable} ${spaceGrotesk.variable} ${geistSans.variable} ${geistMono.variable} antialiased
			`}>
                <Analytics/>
				<Providers>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						// NOT disableTransitionOnChange: that injects `* { transition: none !important }`
						// around the class swap, which cancels the colour crossfade that
						// packages/ui/src/lib/theme-transition.ts installs for the switch. With it
						// on, the theme snapped between states instead of animating - the flicker.
					>
						<AppProvider>
							{children}
						</AppProvider>
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

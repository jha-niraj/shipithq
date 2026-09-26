/**
 * Canonical credit pricing.
 *
 * This is the single source of truth for what a credit pack costs. Both the
 * marketing site (apps/web) and the checkout (apps/main) read from here, so a
 * price quoted on the pricing page is by construction the price charged at
 * checkout. Editing a number here changes both.
 *
 * Nothing in this package may import from an app, and it must stay free of
 * React and Node built-ins - apps/web renders it statically and the app runs it
 * on the Workers runtime.
 */

export type Currency = "INR" | "USD";

export interface CreditPackage {
	/** Stable identifier used in URLs. Never reuse a slug for a different pack. */
	slug: string;
	credits: number;
	inr: number;
	usd: number;
	/** Pre-discount price, when the pack is presented as a saving. */
	originalInr?: number;
	originalUsd?: number;
	note: string;
	popular?: boolean;
	badge: string;
	/** Marketing copy for the pricing page - what this pack unlocks. */
	highlights: string[];
	color: string;
}

export interface PricingConfig {
	baseRateINR: number;
	baseRateUSD: number;
	packages: CreditPackage[];
	minCredits: number;
	maxCredits: number;
}

/**
 * The welcome grant for a new account, in credits. Decided in
 * `plan/credits/overview.md`. Lives here so the marketing site quotes the number the
 * app actually grants (apps/main/lib/credits/grant.ts re-exports it).
 */
export const SIGNUP_GRANT_CREDITS = 100;

// Base rates for custom credit calculations
const baseRateINR = 0.5; // Price per credit in INR
const baseRateUSD = 0.006; // Price per credit in USD

export const creditPackages: CreditPackage[] = [
	{
		slug: "free",
		credits: 20,
		inr: 1,
		usd: 0.012,
		originalInr: 15,
		originalUsd: 0.015,
		note: "Perfect for trying premium features",
		popular: false,
		badge: "Free",
		highlights: [
			"20 credits to spend anywhere on the platform",
			"AI project ideas and feedback",
			"Community access",
		],
		color: "from-neutral-900/80 to-neutral-800/80",
	},
	{
		slug: "starter",
		credits: 25,
		inr: 12,
		usd: 0.15,
		originalInr: 15,
		originalUsd: 0.18,
		note: "Perfect for trying premium features",
		popular: false,
		badge: "Starter",
		highlights: [
			"25 credits to spend anywhere on the platform",
			"AI project ideas and feedback",
			"Pathfinder skill assessments",
		],
		color: "from-neutral-900/80 to-neutral-800/80",
	},
	{
		slug: "popular",
		credits: 50,
		inr: 22,
		usd: 0.27,
		originalInr: 30,
		originalUsd: 0.36,
		note: "Best value for regular users",
		popular: true,
		badge: "Most Popular",
		highlights: [
			"50 credits to spend anywhere on the platform",
			"Everything in Starter",
			"Full project generation runs",
			"Priority generation queue",
		],
		color: "from-neutral-900/80 to-neutral-800/80",
	},
	{
		slug: "pro",
		credits: 75,
		inr: 30,
		usd: 0.36,
		originalInr: 45,
		originalUsd: 0.54,
		note: "Great for active learners",
		popular: false,
		badge: "Pro",
		highlights: [
			"75 credits to spend anywhere on the platform",
			"Everything in Most Popular",
			"Unlimited resume tailoring",
		],
		color: "from-neutral-900/80 to-neutral-800/80",
	},
	{
		slug: "max",
		credits: 100,
		inr: 35,
		usd: 0.42,
		originalInr: 60,
		originalUsd: 0.72,
		note: "Maximum credits package",
		popular: false,
		badge: "Max",
		highlights: [
			"100 credits to spend anywhere on the platform",
			"Everything in Pro",
			"Best price per credit",
		],
		color: "from-neutral-900/80 to-red-500/80",
	},
];

export const paymentConfig: PricingConfig = {
	baseRateINR,
	baseRateUSD,
	packages: creditPackages,
	minCredits: 20,
	maxCredits: 1000,
};

/** Price for a custom credit amount, at the base rate. */
export function calculatePrice(credits: number, currency: Currency): number {
	const rate = currency === "INR" ? baseRateINR : baseRateUSD;
	return Math.round(credits * rate * 100) / 100;
}

export function getPackageByCredits(credits: number): CreditPackage | null {
	return creditPackages.find((pkg) => pkg.credits === credits) ?? null;
}

export function getPackageBySlug(slug: string): CreditPackage | null {
	return creditPackages.find((pkg) => pkg.slug === slug) ?? null;
}

/** Price of a pack in the given currency. */
export function packagePrice(pkg: CreditPackage, currency: Currency): number {
	return currency === "INR" ? pkg.inr : pkg.usd;
}

/** Pre-discount price, if the pack has one. */
export function packageOriginalPrice(
	pkg: CreditPackage,
	currency: Currency
): number | undefined {
	return currency === "INR" ? pkg.originalInr : pkg.originalUsd;
}

/**
 * Discount off the original price, as a whole percentage.
 *
 * Derived rather than stored: a hardcoded "save 20%" silently becomes a lie the
 * first time someone edits a price, which is exactly how the old table ended up
 * advertising 20% off a pack that was actually 93% off.
 */
export function packageSavings(
	pkg: CreditPackage,
	currency: Currency
): number | null {
	const original = packageOriginalPrice(pkg, currency);
	const price = packagePrice(pkg, currency);
	if (!original || original <= price) return null;
	return Math.round(((original - price) / original) * 100);
}

export const CURRENCY_SYMBOL: Record<Currency, string> = {
	INR: "₹",
	USD: "$",
};

/** Format a price for display, trimming trailing zeros on whole amounts. */
export function formatPrice(amount: number, currency: Currency): string {
	const symbol = CURRENCY_SYMBOL[currency];
	const value = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
	return `${symbol}${value}`;
}

/** Convert an amount to the minor unit Razorpay expects (paise / cents). */
export function convertToPaise(amount: number, _currency: Currency): number {
	return Math.round(amount * 100);
}

/* -------------------------------------------------------------------------- */
/*  Checkout handoff (marketing site → app)                                    */
/* -------------------------------------------------------------------------- */

/** Query parameter names shared by the pricing page and the checkout page. */
export const CHECKOUT_PARAMS = {
	credits: "credits",
	currency: "currency",
	plan: "plan",
} as const;

export interface CheckoutIntent {
	pkg: CreditPackage;
	currency: Currency;
}

export function isCurrency(value: unknown): value is Currency {
	return value === "INR" || value === "USD";
}

/**
 * Read a checkout intent out of a URL's query string.
 *
 * Deliberately accepts only `credits`/`plan` and a currency - never a price.
 * The amount charged is always looked up from `creditPackages` here, so a
 * hand-edited `?price=1` in the address bar has nothing to attach to.
 *
 * Returns null when the URL carries no usable selection, which the checkout
 * page treats as "no preselection" rather than an error.
 */
export function parseCheckoutIntent(
	params: URLSearchParams | Record<string, string | string[] | undefined>
): CheckoutIntent | null {
	const read = (key: string): string | undefined => {
		if (typeof (params as URLSearchParams).get === "function") {
			return (params as URLSearchParams).get(key) ?? undefined;
		}
		const value = (params as Record<string, string | string[] | undefined>)[key];
		return Array.isArray(value) ? value[0] : value;
	};

	const rawCurrency = read(CHECKOUT_PARAMS.currency)?.toUpperCase();
	const currency: Currency = isCurrency(rawCurrency) ? rawCurrency : "INR";

	const slug = read(CHECKOUT_PARAMS.plan);
	if (slug) {
		const pkg = getPackageBySlug(slug);
		if (pkg) return { pkg, currency };
	}

	const rawCredits = read(CHECKOUT_PARAMS.credits);
	if (rawCredits) {
		const credits = Number.parseInt(rawCredits, 10);
		if (Number.isFinite(credits)) {
			const pkg = getPackageByCredits(credits);
			if (pkg) return { pkg, currency };
		}
	}

	return null;
}

/**
 * Path (relative to the app) that opens checkout with a pack preselected.
 * Relative so it can be embedded in a callbackUrl without a host mismatch.
 */
export function checkoutPath(pkg: CreditPackage, currency: Currency): string {
	const query = new URLSearchParams({
		[CHECKOUT_PARAMS.plan]: pkg.slug,
		[CHECKOUT_PARAMS.credits]: String(pkg.credits),
		[CHECKOUT_PARAMS.currency]: currency,
	});
	return `/purchase?${query.toString()}`;
}

/**
 * Absolute checkout URL for the marketing site to link to.
 *
 * `appUrl` is the app origin (apps/web passes its NEXT_PUBLIC_APP_URL). The
 * signed-out case is handled by the app itself, which bounces to /register with
 * a callbackUrl back to this path - so the same link works either way.
 */
export function checkoutUrl(
	appUrl: string,
	pkg: CreditPackage,
	currency: Currency
): string {
	return `${appUrl.replace(/\/$/, "")}${checkoutPath(pkg, currency)}`;
}

export * from "./hiring";
export * from "./hiring-plans";
export * from "./uni-plans";

'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@repo/ui/lib/utils';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import { CheckIcon, SparklesIcon, Zap, Gift, ArrowRight } from 'lucide-react';
import { CountUp } from './ui/count-up';

/** Symbols for the prefix, so CountUp animates only the digits. */
const CURRENCY_SYMBOL: Record<Currency, string> = { INR: '\u20B9', USD: '$' };
import {
    creditPackages,
    formatPrice,
    packagePrice,
    packageOriginalPrice,
    packageSavings,
    type CreditPackage,
    type Currency,
} from '@repo/pricing';

/**
 * The credit-pack grid, shared by the marketing site and the in-app checkout.
 *
 * Both used to keep their own copy with hardcoded tiers, which is how the site
 * ended up advertising 50 credits at ₹49 while the app charged ₹22. Everything
 * rendered here comes from `@repo/pricing`, so the two cannot disagree.
 *
 * Callers supply behaviour, not data:
 *   - `onSelect` renders each CTA as a button (in-app checkout).
 *   - `hrefFor` renders each CTA as a link (marketing site → app checkout).
 * Exactly one is needed; `onSelect` wins if both are passed.
 */

// ── Entrance ────────────────────────────────────────────────────────────────
// The cards used to appear fully formed, which on the marketing site meant the
// whole price grid arrived in one blink. `whileInView` with `once` so it plays
// on arrival and never again while the user scrolls back over it, and a stagger
// so the row reads left to right instead of flashing as a block.
//
// `y: 16` and not more: this is a row of four, and a tall travel makes the
// last card still climbing while the first is already still.
const CARD_ENTER = {
    hidden: { opacity: 0, y: 16 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] as const },
    }),
};

function FilledCheck({ className }: { className?: string }) {
    return (
        <div className={cn('rounded-full bg-neutral-900 p-0.5 text-white', className)}>
            <CheckIcon className="size-3" strokeWidth={3} />
        </div>
    );
}

interface PricingCardProps {
    pkg: CreditPackage;
    currency: Currency;
    className?: string;
    onSelect?: (pkg: CreditPackage) => void;
    hrefFor?: (pkg: CreditPackage) => string;
    /** Position in the row, used only to stagger the entrance. */
    index?: number;
    /**
     * Show this currency's price too, under the first, with its own checkout link
     * (apps/web /pricing, plan/web/story ST-10: both prices at once instead of a toggle).
     */
    second?: { currency: Currency; hrefFor: (pkg: CreditPackage) => string };
}

function PricingCard({ pkg, currency, className, onSelect, hrefFor, index = 0, second }: PricingCardProps) {
    // Honour the OS setting rather than animating regardless. `reduce` skips the
    // entrance and the hover lift both - a card that jumps under the cursor is
    // exactly the motion this setting exists to turn off.
    const reduce = useReducedMotion();
    const amount = packagePrice(pkg, currency);
    const original = packageOriginalPrice(pkg, currency);
    const savings = packageSavings(pkg, currency);
    const cta = `Get ${pkg.credits} Credits`;

    // The symbol is split off the number so `CountUp` can animate the digits
    // while the symbol stays put. `formatPrice` returns them joined, so the
    // symbol is taken from the currency directly.
    const symbol = CURRENCY_SYMBOL[currency];
    // INR is whole rupees; USD carries cents. Counting a rupee price through
    // two decimal places just makes it look uncertain.
    const decimals = currency === 'USD' ? 2 : 0;

    return (
        <motion.div
            custom={index}
            variants={CARD_ENTER}
            initial={reduce ? false : 'hidden'}
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            whileHover={reduce ? undefined : { y: -4 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className={cn(
                'relative overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900',
                // Border and shadow stay on a CSS transition; only the lift is
                // framer's. Handing colour to framer too would mean restating
                // every dark: variant as a JS value.
                'transition-colors duration-300 hover:border-neutral-300 hover:shadow-xl dark:hover:border-neutral-700',
                'flex flex-col',
                className,
            )}
        >
            <div className="flex items-center gap-3 p-5">
                <Badge
                    variant="secondary"
                    className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                >
                    {pkg.badge.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="ml-auto text-xs">
                    <Zap className="mr-1 size-3 text-neutral-900 dark:text-white" />
                    <CountUp value={pkg.credits} />
                    {/* A margin, not a space: the badge is a flex row, which drops edge whitespace. */}
                    <span className="ml-1">Credits</span>
                </Badge>
            </div>

            <div className="flex items-end gap-2 px-5 py-3">
                <CountUp
                    value={amount}
                    prefix={symbol}
                    decimals={decimals}
                    className="font-mono text-4xl font-bold tracking-tight text-neutral-900 dark:text-white"
                />
                <span className="pb-1 text-sm text-neutral-500 dark:text-neutral-400">/one-time</span>
                {original !== undefined && savings !== null && (
                    <span className="pb-1 text-sm text-neutral-600 line-through dark:text-neutral-500">
                        {formatPrice(original, currency)}
                    </span>
                )}
            </div>

            {second && (
                <p className="flex flex-wrap items-baseline gap-x-2 px-5 pb-1 text-sm text-neutral-700 dark:text-neutral-300">
                    <span className="font-mono font-semibold text-neutral-900 dark:text-white">{formatPrice(packagePrice(pkg, second.currency), second.currency)}</span>
                    <span>in {second.currency}</span>
                    <a href={second.hrefFor(pkg)} className="font-medium text-neutral-900 underline underline-offset-2 hover:no-underline dark:text-white">
                        Pay in {second.currency}
                    </a>
                </p>
            )}

            {savings !== null && (
                <p className="px-5 pb-1 text-sm font-medium text-neutral-900 dark:text-white">
                    Save {savings}%
                </p>
            )}

            {/* CTA above the features, not below them.
                Two reasons. The price is the decision and the button is the action, so they
                belong together - a feature list between them makes the reader travel back up.
                And on a tall card the button fell below the fold, which is what made these
                look like they had no button at all.

                The colour was the other half of that: it was `bg-neutral-900` with no dark
                variant, on a `dark:bg-neutral-900` card. Identical to its own background, so
                it only appeared when hover flipped it to neutral-800 - which reads as "the
                button appears on hover" and is exactly how Niraj described it. Inverted in
                dark mode now, like every other primary button in the product. */}
            <div className="px-5 pb-4">
                {onSelect ? (
                    <Button
                        onClick={() => onSelect(pkg)}
                        className="w-full cursor-pointer border-0 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                    >
                        {cta}
                        <ArrowRight className="ml-2 size-4" />
                    </Button>
                ) : (
                    <Button asChild variant="outline" className="w-full cursor-pointer">
                        <a href={hrefFor?.(pkg) ?? '#'}>
                            {cta}
                            <ArrowRight className="ml-2 size-4" />
                        </a>
                    </Button>
                )}
            </div>

            <ul className="grid flex-1 gap-3 px-5 pb-5 text-sm text-neutral-600 dark:text-neutral-400">
                {pkg.highlights.map((f) => (
                    <li key={f} className="flex items-center gap-3">
                        <FilledCheck />
                        <span>{f}</span>
                    </li>
                ))}
            </ul>
        </motion.div>
    );
}

/**
 * No column spans any more.
 *
 * This used to be a true bento: the popular pack took 5 of 8 columns as a wide
 * `FeaturedCard`, and `CARD_SPANS` dealt the rest 3, 4, 4, 8. The result was
 * five cards of four different widths, with the last one stretched across the
 * full row - so the eye had to re-learn the layout at every step and the prices
 * could not be compared down a column.
 *
 * Every card is now identical and the grid is uniform, which is what makes a
 * price list readable: the only thing that varies between cards is the content
 * being compared. The popular pack is marked with a ring and its badge rather
 * than by being a different SIZE.
 */

export interface PricingBentoProps {
    currency?: Currency;
    /** In-app: render CTAs as buttons and hand the chosen pack back. */
    onSelect?: (pkg: CreditPackage) => void;
    /** Marketing site: render CTAs as links to the app's checkout. */
    hrefFor?: (pkg: CreditPackage) => string;
    showFreeCredits?: boolean;
    onRequestFreeCredits?: () => void;
    /** Where "Claim Free Credits" points when no handler is supplied. */
    freeCreditsHref?: string;
    /** Each card also shows this currency's price and link (see PricingCard). */
    second?: { currency: Currency; hrefFor: (pkg: CreditPackage) => string };
}

export function PricingBento({
    currency = 'INR',
    onSelect,
    hrefFor,
    showFreeCredits = true,
    onRequestFreeCredits,
    freeCreditsHref = '/purchase',
    second,
}: PricingBentoProps) {
    if (creditPackages.length === 0) return null;

    // `items-stretch` so every card is the height of the tallest. Without it a
    // pack with two highlights sits shorter than one with four, and the row of
    // CTAs no longer lines up - which is the thing the eye actually scans.
    return (
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
            {creditPackages.map((pkg, i) => (
                <PricingCard
                    key={pkg.slug}
                    index={i}
                    pkg={pkg}
                    currency={currency}
                    className={
                        pkg.popular
                            ? 'ring-1 ring-neutral-900 dark:ring-white'
                            : undefined
                    }
                    onSelect={onSelect}
                    hrefFor={hrefFor}
                    second={second}
                />
            ))}

            {showFreeCredits && (
                <motion.div
                    custom={creditPackages.length}
                    variants={CARD_ENTER}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.2 }}
                    className={cn(
                        'relative w-full overflow-hidden rounded-2xl border',
                        'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40',
                        'md:col-span-2 xl:col-span-4',
                        'transition-all duration-300 hover:shadow-xl',
                    )}
                >
                    <div className="flex flex-col items-center justify-between gap-4 p-6 md:flex-row">
                        <div className="flex items-center gap-4">
                            <div className="rounded-xl bg-neutral-900 p-3 dark:bg-white">
                                <Gift className="size-6 text-white dark:text-neutral-900" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                                    Get Free Credits!
                                </h3>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                    Share about us on LinkedIn or Twitter and earn up to 50 free credits
                                </p>
                            </div>
                        </div>
                        {onRequestFreeCredits ? (
                            <Button
                                onClick={onRequestFreeCredits}
                                className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                            >
                                <Gift className="mr-2 size-4" />
                                Claim Free Credits
                            </Button>
                        ) : (
                            <Button
                                asChild
                                className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                            >
                                <a href={freeCreditsHref}>
                                    <Gift className="mr-2 size-4" />
                                    Claim Free Credits
                                </a>
                            </Button>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
}

export default PricingBento;

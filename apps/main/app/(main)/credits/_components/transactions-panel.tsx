"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useSession } from '@repo/auth/client';
import {
	Card, CardContent, CardHeader, CardTitle
} from "@repo/ui/components/ui/card"
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { Badge } from "@repo/ui/components/ui/badge"
import {
	Tabs, TabsContent, TabsList, TabsTrigger
} from "@repo/ui/components/ui/tabs"
import { Button } from "@repo/ui/components/ui/button"
import {
	Receipt, ArrowUpRight, ArrowDownLeft, Calendar, Clock, ExternalLink,
	RefreshCw, CreditCard, Gift
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { getMyReferrals } from "@/actions/(main)/user/referral.action"
import { REFERRAL_XP, type ReferralSummary } from "@/lib/referrals"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"
import { cn } from '@repo/ui/lib/utils'

interface CreditTransaction {
	id: string
	amount: number
	type: "PURCHASE" | "SPEND" | "BONUS" | "REWARD"
	currency: "INR" | "USD" | "NA"
	description: string
	createdAt: string
}

/**
 * A purchase that did NOT grant credits.
 *
 * These live in `payments`, not `credit_transaction`, because nothing was
 * granted - and that is exactly why they have to be shown here. A ledger of
 * successful grants cannot answer "I tried to pay and got nothing", which is
 * the question that sends someone to their history in the first place.
 */
interface PaymentAttempt {
	id: string
	credits: number
	amount: string
	currency: "INR" | "USD" | "NA"
	status: "FAILED" | "CANCELLED" | "REFUNDED"
	createdAt: string
	notes?: { reason?: string } | null
}

/** One row of the merged list: a real ledger entry, or a failed attempt. */
type LedgerRow =
	| { kind: "txn"; at: number; txn: CreditTransaction }
	| { kind: "attempt"; at: number; attempt: PaymentAttempt }

const ATTEMPT_COPY: Record<PaymentAttempt["status"], string> = {
	FAILED: "Payment failed",
	CANCELLED: "Checkout closed before payment",
	REFUNDED: "Purchase refunded",
}

/**
 * `embedded` drops the page chrome so this can live inside the History panel on /purchase.
 *
 * The panel is ~520px of a page that is already a card, so the full-page dressing - the grid
 * backdrop, `min-h-screen`, the centred `max-w-5xl` container and the 4xl display heading -
 * is all wrong there: it would centre a 5xl container inside a 520px column and stack a
 * second big title under the panel's own header.
 *
 * A prop rather than a second component, because everything BELOW the header is identical and
 * a copy would drift the first time either changed.
 */
export default function TransactionsPage({ embedded = false }: { embedded?: boolean } = {}) {
	// Entrance animations are for a PAGE arriving. Inside the History panel the panel itself
	// is the animation, and running four staggered fade-ups inside something that is already
	// sliding in is the flicker Niraj saw: the skeleton clears, then every block fades from
	// zero opacity again, one after another, while the container is still moving.
	//
	// `false` disables framer's initial state without removing the motion elements, so the
	// standalone /transactions page keeps its entrance exactly as it was.
	const enter = embedded ? false : { opacity: 0, y: 20 }
	const enterFade = embedded ? false : { opacity: 0 }
	const { data: session, isPending } = useSession()
	const [transactions, setTransactions] = useState<CreditTransaction[]>([])
	const [attempts, setAttempts] = useState<PaymentAttempt[]>([])

	// Two ledgers, not one.
	//
	// They answer different questions and mixing them made both harder to read:
	// "where did my credits go" is a list of spends, while "what have I paid for"
	// is a list of money. A PURCHASE row belongs to the second - it is the credit
	// side of a payment - and a failed attempt only makes sense there too.
	const byTime = (a: LedgerRow, b: LedgerRow) => b.at - a.at
	const asRow = (txn: CreditTransaction): LedgerRow => ({ kind: "txn", at: new Date(txn.createdAt).getTime(), txn })

	// Usage: what credits were spent on, and every grant that was not bought.
	const usageRows: LedgerRow[] = transactions.filter((t) => t.type !== "PURCHASE").map(asRow).sort(byTime)

	// Purchases: money. Successful buys alongside the attempts that failed or
	// were abandoned, so a failure sits directly above the retry that worked.
	const purchaseRows: LedgerRow[] = [
		...transactions.filter((t) => t.type === "PURCHASE").map(asRow),
		...attempts.map((attempt) => ({ kind: "attempt" as const, at: new Date(attempt.createdAt).getTime(), attempt })),
	].sort(byTime)
	const [referrals, setReferrals] = useState<ReferralSummary | null>(null)
	const [copied, setCopied] = useState(false)

	// Read once, on mount. `useSearchParams` would need a Suspense boundary around this
	// component for no benefit - the tab only matters on first render.
	const [initialTab] = useState(() => {
		if (typeof window === "undefined") return "transactions"
		const tab = new URLSearchParams(window.location.search).get("tab")
		return tab === "referrals" || tab === "purchases" ? tab : "transactions"
	})
	const [isLoading, setIsLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)

	const fetchData = async () => {
		try {
			setRefreshing(true)

			// Fetch transactions
			const transactionsRes = await fetch('/api/transactions')
			if (transactionsRes.ok) {
				const transactionsData = await transactionsRes.json()
				setTransactions(transactionsData.transactions || [])
				setAttempts(transactionsData.attempts || [])
			}

			// Referrals replaced the platform-transfer fetch. A server action rather than a
			// route handler because there is no third party involved - it reads this user's
			// own rows and mints their code if they never got one.
			const referralRes = await getMyReferrals()
			if (referralRes.success) setReferrals(referralRes.data)
		} catch (error) {
			console.error('Error fetching data:', error)
		} finally {
			setIsLoading(false)
			setRefreshing(false)
		}
	}

	useEffect(() => {
		if (session && !isPending) {
			fetchData()
		}
	}, [session, isPending])

	const getTransactionIcon = (type: string) => {
		switch (type) {
			case "PURCHASE":
				return <CreditCard className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
			case "SPEND":
				return <ArrowUpRight className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
			case "BONUS":
				return <ArrowDownLeft className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
			case "REWARD":
				return <ArrowDownLeft className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
			default:
				return <Receipt className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
		}
	}

	const getTransactionColor = (type: string) => {
		switch (type) {
			case "PURCHASE":
				return "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
			case "SPEND":
				return "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
			case "BONUS":
				return "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
			case "REWARD":
				return "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
			default:
				return "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
		}
	}


	const formatDate = (dateString: string) => {
		try {
			return format(new Date(dateString), "MMM dd, yyyy 'at' hh:mm a")
		} catch (error) {
			console.log("Error occurred while formatting date: " + error);
			return "Invalid date"
		}
	}

	// One place decides the chrome, so the three return paths below cannot disagree about it.
	//
	// EMBEDDED is a column with a definite height, not a plain padded box. Inside
	// the history panel the whole thing scrolled as one, so the title, the Refresh
	// button and the tab bar all slid away and you could not switch tabs without
	// scrolling back up. `h-full` + `min-h-0` lets the header and tabs stay put
	// while only the list moves - see the ScrollArea on each TabsContent below.
	// The list scrolls, the card header and the tab bar above it do not.
	//
	// This was a bare `overflow-y-auto` on CardContent, which works but gives the
	// OS scrollbar - a wide grey slab against a 520px panel, and the only one in
	// the app, since everything else scrolls in a ScrollArea. The comment above
	// already claimed there was a ScrollArea here; now there is.
	//
	// `min-h-0` alongside `flex-1` is load-bearing and not decoration: a flex
	// child's `min-height` is `auto`, so without it the ScrollArea refuses to
	// shrink below its content, grows past the panel, and scrolls nothing. The
	// bound must never go on the root as `max-h` either - Radix's viewport is
	// `h-full`, which against an auto-height parent resolves to auto and CLIPS
	// the overflow with no scrollbar to admit it.
	const ListScroll = ({ children, className }: { children: React.ReactNode; className?: string }) =>
		embedded ? (
			<ScrollArea reflow className={cn('min-h-0 min-w-0 flex-1', className)}>
				{children}
			</ScrollArea>
		) : (
			<>{children}</>
		)

	// One card, rendered by both ledger tabs. The row markup used to live inline
	// in the transactions tab; a second tab would have meant a second copy, and
	// the first divergence between them would have been a bug nobody could see
	// from either file alone.
	const LedgerCard = ({ items, title, icon, emptyTitle, emptyBody }: {
		items: LedgerRow[]
		title: string
		icon: React.ReactNode
		emptyTitle: string
		emptyBody: string
	}) => (
		<Card className={cn("border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm rounded-xl overflow-hidden", embedded && "flex min-h-0 flex-1 flex-col")}>
			<CardHeader className="shrink-0 border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
				<CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
					{icon}
					{title}
					<Badge variant="secondary" className="ml-auto bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono text-xs">
						{items.length}
					</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent className={cn("p-0", embedded && "flex min-h-0 flex-1 flex-col overflow-hidden")}>
				<ListScroll>
				{items.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-20 text-center px-6">
						<div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-center mb-5">
							<Receipt className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
						</div>
						<p className="text-neutral-900 dark:text-white font-medium mb-1">{emptyTitle}</p>
						<p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-xs">{emptyBody}</p>
						<Button asChild variant="outline" className="border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900">
							<Link href="/purchase">Buy Credits</Link>
						</Button>
					</div>
				) : (
					<div className="divide-y divide-neutral-100 dark:divide-neutral-800">
										{items.map((row, index) => row.kind === "attempt" ? (
											/* An attempt granted nothing, so it gets no +/- figure -
												printing "0" next to a real charge reads as a charge of
												zero rather than as no charge at all. The money amount
												is shown instead, muted, with the reason underneath. */
											<div
												key={`attempt-${row.attempt.id}`}
												className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
											>
												<div className="flex items-center gap-4">
													<div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg flex items-center justify-center flex-shrink-0">
														<Receipt className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
													</div>
													<div className="min-w-0">
														<p className="text-sm font-medium text-neutral-900 dark:text-white">
															{ATTEMPT_COPY[row.attempt.status]}
														</p>
														<p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
															{row.attempt.credits} credits
															{row.attempt.notes?.reason ? ` - ${row.attempt.notes.reason}` : ""}
														</p>
														<div className="flex items-center gap-1.5 mt-0.5">
															<Calendar className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
															<span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
																{formatDate(row.attempt.createdAt)}
															</span>
														</div>
													</div>
												</div>
												<div className="text-right flex flex-col items-end gap-1.5">
													<span className="font-mono text-sm text-neutral-500 dark:text-neutral-400">
														{row.attempt.currency === "USD" ? "$" : "\u20B9"}{row.attempt.amount}
													</span>
													<Badge className="text-xs px-2 py-0 bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
														{row.attempt.status}
													</Badge>
												</div>
											</div>
										) : (
											(() => { const transaction = row.txn; return (
											<motion.div
												key={transaction.id}
												// No motion at all when embedded, and `initial={false}`
												// alone was not enough: Radix unmounts the inactive tab,
												// so switching back REMOUNTS these rows and the staggered
												// `animate` replays from the top - six rows fading in one
												// after another, which is the flashing on every tab switch.
												// A zero duration leaves the values applied with nothing
												// to play.
												initial={embedded ? false : { opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												transition={embedded ? { duration: 0 } : { delay: index * 0.05 }}
												className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
											>
												<div className="flex items-center gap-4">
													<div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg flex items-center justify-center flex-shrink-0">
														{getTransactionIcon(transaction.type)}
													</div>
													<div>
														<p className="text-sm font-medium text-neutral-900 dark:text-white">
															{transaction.description}
														</p>
														<div className="flex items-center gap-1.5 mt-0.5">
															<Calendar className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
															<span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
																{formatDate(transaction.createdAt)}
															</span>
														</div>
													</div>
												</div>
												<div className="text-right flex flex-col items-end gap-1.5">
													<span className={`font-bold font-mono text-sm ${
														transaction.type === 'PURCHASE' || transaction.type === 'BONUS' || transaction.type === 'REWARD'
															? 'text-neutral-900 dark:text-white'
															: 'text-neutral-500 dark:text-neutral-400'
													}`}>
														{/* `Math.abs`, because the SIGN IS ALREADY IN THE VALUE.
															SPEND rows are stored negative (`-3`), and prefixing
															another minus rendered "--3". The prefix is chosen from
															`type` and the magnitude printed separately, so the two
															can never contradict each other. */}
														{transaction.type === 'PURCHASE' || transaction.type === 'BONUS' || transaction.type === 'REWARD' ? '+' : '-'}
														{Math.abs(transaction.amount).toLocaleString()}
													</span>
													<div className="flex items-center gap-2">
														{transaction.currency !== 'NA' && (
															<span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">{transaction.currency}</span>
														)}
														<Badge className={`text-xs px-2 py-0 ${getTransactionColor(transaction.type)}`}>
															{transaction.type}
														</Badge>
													</div>
												</div>
											</motion.div>
											) })()
										))}
									
					</div>
				)}
				</ListScroll>
			</CardContent>
		</Card>
	)

	const Shell = ({ children }: { children: React.ReactNode }) =>
		embedded ? (
			<div className="flex h-full min-h-0 flex-col px-5 pt-5">{children}</div>
		) : (
			<div className="min-h-screen relative">
				<div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
				<div className="container mx-auto px-6 py-16 max-w-5xl relative z-10">{children}</div>
			</div>
		)

	if (isPending || isLoading) {
		return (
			<Shell>
				<div>
					<div className="animate-pulse space-y-6">
						<div className="h-6 bg-neutral-100 dark:bg-neutral-800 rounded w-1/4"></div>
						<div className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded w-1/2"></div>
						<div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-1/3"></div>
						<div className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded w-full mt-8"></div>
						<div className="space-y-3 mt-4">
							{[1, 2, 3, 4].map((i) => (
								<div key={i} className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded"></div>
							))}
						</div>
					</div>
				</div>
			</Shell>
		)
	}

	if (!session && !isPending) {
		return (
			<Shell>
				<div>
					<div className="flex flex-col items-center justify-center py-32 text-center">
						<div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-center mb-6">
							<Receipt className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
						</div>
						<h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
							Authentication Required
						</h1>
						<p className="text-neutral-500 dark:text-neutral-400 mb-8 max-w-sm">
							Please sign in to view your transactions and transfers.
						</p>
						<Button asChild variant="outline" className="border-neutral-200 dark:border-neutral-800">
							<Link href="/signin">Sign In</Link>
						</Button>
					</div>
				</div>
			</Shell>
		)
	}

	return (
		<Shell>
			{/* This wrapper HAS to be a flex column when embedded, and it was a bare
				`<div>`. `Shell` is `flex flex-col`, so this div was its one flex item
				and grew to the full height - but inside it there was no flex context,
				so `Tabs`'s `flex-1` and `min-h-0` had nothing to act in and the list
				never got a bounded height to scroll inside. One unstyled div, three
				levels of correct flex classes doing nothing. */}
			<div className={embedded ? 'flex min-h-0 flex-1 flex-col' : undefined}>
				{/* Page Header */}
				<div
					className={cn(
						'flex flex-col sm:flex-row sm:items-end justify-between gap-6',
						// 48px of air under the header is right on a full page and far
						// too much in a 520px panel, where it pushed the tabs a third of
						// the way down.
						embedded ? 'shrink-0 mb-4' : 'mb-12'
					)}
				>
					<motion.div
						initial={enter}
						animate={{ opacity: 1, y: 0 }}
					>
						<h1 className={cn(
							'font-bold tracking-tight text-neutral-900 dark:text-white',
							embedded ? 'text-lg mb-0.5' : 'text-4xl mb-2'
						)}>
							Transaction History
						</h1>
						<p className={cn(
							'text-neutral-600 dark:text-neutral-400',
							embedded ? 'text-xs' : 'font-light'
						)}>
							Track your credit purchases, spending, and transfers
						</p>
					</motion.div>
					<motion.div
						initial={enterFade}
						animate={{ opacity: 1 }}
						transition={embedded ? { duration: 0 } : { delay: 0.15 }}
					>
						<Button
							onClick={fetchData}
							disabled={refreshing}
							variant="outline"
							size={embedded ? 'sm' : 'default'}
							className="cursor-pointer gap-2 border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
						>
							{refreshing ? <InlineLoader size="sm" /> : <RefreshCw className="h-4 w-4" />}
							Refresh
						</Button>
					</motion.div>
				</div>

				{/* Tabs */}
				{/* `?tab=referrals` opens straight onto that tab, which is what the sidebar's
					Referrals entry links to. `defaultValue` rather than a controlled `value`:
					the param picks the STARTING tab and then the user is free to switch, which
					is the behaviour you want from a deep link. */}
				<Tabs
					defaultValue={initialTab}
					className={embedded ? 'flex min-h-0 flex-1 flex-col gap-4' : 'space-y-6'}
				>
					{/* No className on the list or the triggers: the shared TabsList already
						draws the surface and the sliding pill, and per-trigger backgrounds under
						it made three things animate for one click. The wrapper only keeps the
						strip from shrinking in the embedded flex column. */}
					<div className="shrink-0">
						<TabsList size={embedded ? 'sm' : 'default'}>
							<TabsTrigger value="transactions" icon={<CreditCard />}>Usage</TabsTrigger>
							<TabsTrigger value="purchases" icon={<Receipt />}>Purchases</TabsTrigger>
							<TabsTrigger value="referrals" icon={<Gift />}>Referrals</TabsTrigger>
						</TabsList>
					</div>

					{/* ── Usage ──
						Spends and grants. The SCROLL REGION in embedded mode: `min-h-0`
						is load-bearing, because a flex child defaults to
						`min-height: auto` and refuses to shrink below its content, so
						the column grows instead of scrolling and the header slides
						away. On the standalone page there is no bounded height to
						scroll inside, so it stays a plain block and the page scrolls. */}
					<TabsContent
						value="transactions"
						className={embedded ? 'mt-0 flex min-h-0 flex-1 flex-col overflow-hidden' : undefined}
					>
						<LedgerCard
							items={usageRows}
							title="Credit Usage"
							icon={<CreditCard className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />}
							emptyTitle="No usage yet"
							emptyBody="Credits you spend on features, and any grants or bonuses, will appear here."
						/>
					</TabsContent>

					{/* ── Purchases ──
						Money, kept apart from usage on purpose: "what have I paid for"
						and "where did my credits go" are different questions, and a
						single merged list answered neither cleanly. Failed and
						abandoned attempts belong here rather than in usage - they
						granted nothing, so they are not usage, but they are very much
						part of the payment record. */}
					<TabsContent
						value="purchases"
						className={embedded ? 'mt-0 flex min-h-0 flex-1 flex-col overflow-hidden' : undefined}
					>
						<LedgerCard
							items={purchaseRows}
							title="Purchases"
							icon={<Receipt className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />}
							emptyTitle="No purchases yet"
							emptyBody="Credit packs you buy show up here, along with any payment that failed or was cancelled."
						/>
					</TabsContent>

					{/* ── Referrals ──
						Replaces the Platform Transfers tab. That showed credits sent out to
						TrueFool, which is a dropped concept - the table, the API route and this
						panel all went with it.

						Referrals are the opposite situation: the write side has worked for a
						long time (signup calls `processReferral`, which inserts the row, awards
						the referrer 300 XP and bumps `referralCount`) and there was simply
						nowhere to SEE it. The feature ran silently. */}
					<TabsContent
						value="referrals"
						className={embedded ? 'mt-0 flex min-h-0 flex-1 flex-col overflow-hidden' : undefined}
					>
						<Card className={cn("border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm rounded-xl overflow-hidden", embedded && "flex min-h-0 flex-1 flex-col")}>
							<CardHeader className="shrink-0 border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
								<CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
									<Gift className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
									Referrals
									<Badge variant="secondary" className="ml-auto bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono text-xs">
										{referrals?.count ?? 0}
									</Badge>
								</CardTitle>
							</CardHeader>
							<CardContent className={cn("p-0", embedded ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "p-6")}>
								<ListScroll className="[&_[data-radix-scroll-area-viewport]>div]:space-y-6 [&_[data-radix-scroll-area-viewport]>div]:p-6">
								{/* The link, and one button to copy it. This is the whole point of
									the tab - everything below is evidence that it worked. */}
								<div>
									<p className="text-xs font-semibold text-neutral-600 dark:text-neutral-500">
										Your referral link
									</p>
									<div className="mt-2 flex flex-wrap items-center gap-2">
										<code className="min-w-0 flex-1 truncate rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
											{referrals?.link ?? "…"}
										</code>
										<Button
											variant="outline"
											size="sm"
											className="cursor-pointer shrink-0"
											disabled={!referrals?.link}
											onClick={() => {
												if (!referrals?.link) return
												void navigator.clipboard.writeText(referrals.link)
												setCopied(true)
												setTimeout(() => setCopied(false), 1600)
											}}
										>
											{copied ? "Copied" : "Copy link"}
										</Button>
									</div>
									<p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
										Anyone who signs up with this link earns you {REFERRAL_XP} XP.
									</p>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
										<p className="text-xs text-neutral-500 dark:text-neutral-400">People referred</p>
										<p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900 dark:text-white">
											{referrals?.count ?? 0}
										</p>
									</div>
									<div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
										<p className="text-xs text-neutral-500 dark:text-neutral-400">XP earned</p>
										<p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900 dark:text-white">
											{referrals?.xpEarned ?? 0}
										</p>
									</div>
								</div>

								{referrals && referrals.referred.length > 0 ? (
									<div className="divide-y divide-neutral-100 dark:divide-neutral-800">
										{referrals.referred.map((r) => (
											<div key={r.id} className="flex items-center gap-3 py-3">
												<div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-xs font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
													{(r.name ?? "?").charAt(0).toUpperCase()}
												</div>
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
														{r.name ?? "A developer"}
													</p>
													<p className="text-xs text-neutral-500 dark:text-neutral-400">
														Joined {new Date(r.joinedAt).toLocaleDateString()}
													</p>
												</div>
												<span className="shrink-0 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
													+{REFERRAL_XP} XP
												</span>
											</div>
										))}
									</div>
								) : (
									<div className="py-10 text-center">
										<p className="text-sm font-medium text-neutral-900 dark:text-white">
											No referrals yet
										</p>
										<p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
											Share your link. You earn {REFERRAL_XP} XP each time someone joins with it.
										</p>
									</div>
								)}
								</ListScroll>
							</CardContent>
						</Card>
					</TabsContent>

				</Tabs>
			</div>
		</Shell>
	)
}

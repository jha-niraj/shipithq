"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { signIn, useSession } from '@repo/auth/client';
import {
	Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@repo/ui/components/ui/dialog"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Separator } from "@repo/ui/components/ui/separator"
import { useAuthDialog } from "./use-auth-dialog"
import {
	Mail, Eye, EyeOff, LogIn, XCircle, CircleHelp
} from "lucide-react"
import type { ReadonlyURLSearchParams } from "next/navigation"
import { Label } from "@repo/ui/components/ui/label"
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

export function AuthDialog() {
	const { data: session } = useSession()
	const sp = useSearchParams()
	const pathname = usePathname()
	const router = useRouter()
	const { open, callbackUrl, openAuth, closeAuth } = useAuthDialog()
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [showPw, setShowPw] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [submitting, setSubmitting] = useState(false)

	const resolvedCallback = useMemo(() => {
		if (callbackUrl) return callbackUrl
		const cbFromUrl = sp.get("callbackUrl")
		return cbFromUrl || `${pathname}${makeSearchWithout(sp, ["auth", "callbackUrl"])}`
	}, [callbackUrl, sp, pathname])

	// Auto-open dialog when ?auth=1 is present
	useEffect(() => {
		const shouldOpen = sp.get("auth") === "1"
		const cb = sp.get("callbackUrl")
		if (shouldOpen) {
			openAuth({ callbackUrl: cb || `${pathname}${makeSearchWithout(sp, ["auth", "callbackUrl"])}` })
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sp, pathname])

	// When session becomes authenticated, close modal and redirect
	useEffect(() => {
		if (session && open) {
			dismissFromUrl()
			// If there's a callback URL, redirect to it
			if (resolvedCallback && resolvedCallback !== pathname) {
				router.push(resolvedCallback)
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session, open, resolvedCallback, pathname, router])

	function dismissFromUrl() {
		closeAuth()
		// remove ?auth and ?callbackUrl but preserve other params
		const params = new URLSearchParams(window.location.search)
		params.delete("auth")
		params.delete("callbackUrl")
		router.replace(`${pathname}${params.toString() ? "?" + params.toString() : ""}`)
	}

	async function onCredentialsSignIn(e: React.FormEvent) {
		e.preventDefault()
		setSubmitting(true)
		setError(null)
		try {
			await signIn.email({
				email,
				password,
				callbackURL: resolvedCallback || "/",
			})
		} catch (err) {
			console.log("Error while signin in:" + err);
			setError("Unable to sign in. Please try again.")
			setSubmitting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={(o) => (o ? openAuth({ callbackUrl: resolvedCallback }) : dismissFromUrl())}>
			<DialogContent
				className="max-w-md w-full p-0 border-0 bg-transparent shadow-none"
			>
				<div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />

				<div className="relative z-50 mx-auto">
					<div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-2xl">
						<div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl pointer-events-none" />
						<div className="relative p-8">
							<DialogHeader className="text-center mb-8">
								<DialogTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
									Welcome back
								</DialogTitle>
								<DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
									Sign in to your account to continue
								</DialogDescription>
							</DialogHeader>

							{
								error && (
									<div className="mb-6 flex items-center gap-3 p-4 bg-red-50/80 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-xl text-red-700 dark:text-red-400 text-sm backdrop-blur-sm">
										<XCircle className="w-5 h-5 flex-shrink-0" />
										<span>{error}</span>
									</div>
								)
							}
							<div className="space-y-6">
								<Button
									type="button"
									variant="outline"
									className="w-full h-12 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 font-medium transition-all duration-200 backdrop-blur-sm"
									onClick={() =>
										signIn.social({ provider: "google", callbackURL: resolvedCallback || `${pathname}${window.location.search}` })
									}
								>
									<svg viewBox="0 0 48 48" className="w-5 h-5 mr-3" aria-hidden="true">
										<path
											fill="#FFC107"
											d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
											c0-6.627,5.373-12,12-12c3.059,0,5.842,1.153,7.961,3.039l5.657-5.657C33.642,6.053,29.083,4,24,4C12.955,4,4,12.955,4,24
											c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
										/>
										<path
											fill="#FF3D00"
											d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,14,24,14c3.059,0,5.842,1.153,7.961,3.039l5.657-5.657
											C33.642,6.053,29.083,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
										/>
										<path
											fill="#4CAF50"
											d="M24,44c5.176,0,9.86-1.977,13.409-5.197l-6.197-5.238C29.201,35.091,26.715,36,24,36
											c-5.197,0-9.607-3.317-11.287-7.946l-6.532,5.036C9.505,39.556,16.227,44,24,44z"
										/>
										<path
											fill="#1976D2"
											d="M43.611,20.083H42V20H24v8h11.303c-0.793,2.237-2.231,4.166-4.094,5.566c0.001-0.001,0.002-0.001,0.003-0.002
											l6.197,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
										/>
									</svg>
									Continue with Google
								</Button>

								<div className="relative my-6">
									<Separator className="bg-gray-200/50 dark:bg-gray-700/50" />
									<span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-4 text-sm text-gray-500 dark:text-gray-400">
										or
									</span>
								</div>

								<form onSubmit={onCredentialsSignIn} className="space-y-5">
									<div className="space-y-2">
										<Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
											Email address
										</Label>
										<div className="relative">
											<Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
											<Input
												id="email"
												type="email"
												value={email}
												onChange={(e) => setEmail(e.target.value)}
												className="pl-11 h-12 bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/50 backdrop-blur-sm text-gray-900 dark:text-gray-100"
												placeholder="Enter your email"
												required
											/>
										</div>
									</div>
									<div className="space-y-2">
										<Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
											Password
										</Label>
										<div className="relative">
											<Input
												id="password"
												type={showPw ? "text" : "password"}
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												className="pr-11 h-12 bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/50 backdrop-blur-sm text-gray-900 dark:text-gray-100"
												placeholder="Enter your password"
												required
											/>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 h-8 w-8 p-0 rounded-lg"
												onClick={() => setShowPw((v) => !v)}
												aria-label={showPw ? "Hide password" : "Show password"}
											>
												{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
											</Button>
										</div>
									</div>
									<Button
										type="submit"
										disabled={submitting}
										className="w-full h-12 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{
											submitting ? (
												<div className="flex items-center gap-2">
													<InlineLoader size="sm" />
													Signing in...
												</div>
											) : (
												<>
													<LogIn className="w-4 h-4 mr-2" />
													Sign in
												</>
											)
										}
									</Button>
								</form>
								<div className="flex items-start gap-3 p-4 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
									<CircleHelp className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
									<p className="text-sm text-gray-600 dark:text-gray-400">
										New to our platform? You&apos;ll be able to create an account after signing in with Google, or use the signup link below.
									</p>
								</div>
								<div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
									<div className="text-center space-y-4">
										<p className="text-sm text-gray-600 dark:text-gray-400">
											Don&apos;t have an account yet?
										</p>
										<Button
											variant="outline"
											className="w-full h-12 bg-transparent hover:bg-white/50 dark:hover:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 font-medium transition-all duration-200 backdrop-blur-sm"
											onClick={() => {
												// Was `/signup`, which is not a route - this app registers at
												// /register, so the button 404'd. Relative too: an in-app
												// navigation never needed an absolute URL, and building one
												// from window.location.origin only added a browser dependency.
												const params = new URLSearchParams()
												if (resolvedCallback) params.set('callbackUrl', resolvedCallback)
												const query = params.toString()
												router.push(`/register${query ? `?${query}` : ''}`)
												closeAuth()
											}}
										>
											Create new account
										</Button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

function makeSearchWithout(sp: ReadonlyURLSearchParams, keys: string[]) {
	const p = new URLSearchParams(sp.toString())
	keys.forEach((k) => p.delete(k))
	const s = p.toString()
	return s ? `?${s}` : ""
}
"use client"

import * as React from "react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"

/**
 * ONE TOOLTIP FOR EVERY `data-tip` (Niraj, 2026-10-20, R4-12: "anywhere we are using the native there we should use the
 * shadcn tooltip").
 *
 * Native `title=` tooltips are slow, unstyled and ignore the theme. Instead of wrapping each of a few hundred buttons in
 * <Tooltip>, an element says `data-tip="Delete"` and this one layer, mounted once at the app root, shows the shadcn
 * Tooltip for it: on hover after a short delay, and on keyboard focus straight away. It positions the tooltip against an
 * invisible box laid exactly over the element, so the element itself is never re-rendered or re-parented.
 *
 * Gone on: pointer leaving, blur, scroll, Escape, or any press (a click usually changes what the button means).
 * Touch: nothing (no hover); the element's aria-label still names it.
 */
const OPEN_DELAY_MS = 350

type Tip = { text: string; rect: DOMRect; side: "top" | "bottom" }

function tipOf(target: EventTarget | null): HTMLElement | null {
	if (!(target instanceof Element)) return null
	const el = target.closest<HTMLElement>("[data-tip]")
	if (!el) return null
	const text = el.getAttribute("data-tip")
	return text && text.trim() ? el : null
}

function place(el: HTMLElement): Tip {
	const rect = el.getBoundingClientRect()
	// Prefer above; go below when there isn't room for a line of text.
	const side = rect.top < 44 ? "bottom" : "top"
	return { text: el.getAttribute("data-tip") ?? "", rect, side }
}

export function TipLayer() {
	const [tip, setTip] = React.useState<Tip | null>(null)
	const timer = React.useRef<number | null>(null)
	const current = React.useRef<HTMLElement | null>(null)

	React.useEffect(() => {
		const clear = () => {
			if (timer.current !== null) window.clearTimeout(timer.current)
			timer.current = null
		}
		const hide = () => {
			clear()
			current.current = null
			setTip(null)
		}
		const show = (el: HTMLElement, now: boolean) => {
			clear()
			current.current = el
			if (now) {
				setTip(place(el))
				return
			}
			timer.current = window.setTimeout(() => {
				if (current.current === el && el.isConnected) setTip(place(el))
			}, OPEN_DELAY_MS)
		}
		const onOver = (e: PointerEvent) => {
			if (e.pointerType === "touch") return
			const el = tipOf(e.target)
			if (el && el !== current.current) show(el, false)
			if (!el && current.current) hide()
		}
		const onOut = (e: PointerEvent) => {
			const to = tipOf(e.relatedTarget)
			if (current.current && to !== current.current) hide()
		}
		const onFocus = (e: FocusEvent) => {
			const el = tipOf(e.target)
			// Keyboard focus only - a mouse press also focuses the button, and that should not pop a tooltip.
			if (el && el.matches(":focus-visible")) show(el, true)
		}
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") hide()
		}
		document.addEventListener("pointerover", onOver, true)
		document.addEventListener("pointerout", onOut, true)
		document.addEventListener("focusin", onFocus, true)
		document.addEventListener("focusout", hide, true)
		document.addEventListener("pointerdown", hide, true)
		document.addEventListener("keydown", onKey, true)
		window.addEventListener("scroll", hide, true)
		window.addEventListener("resize", hide)
		return () => {
			clear()
			document.removeEventListener("pointerover", onOver, true)
			document.removeEventListener("pointerout", onOut, true)
			document.removeEventListener("focusin", onFocus, true)
			document.removeEventListener("focusout", hide, true)
			document.removeEventListener("pointerdown", hide, true)
			document.removeEventListener("keydown", onKey, true)
			window.removeEventListener("scroll", hide, true)
			window.removeEventListener("resize", hide)
		}
	}, [])

	if (!tip) return null
	return (
		<TooltipProvider delayDuration={0}>
			<Tooltip open>
				<TooltipTrigger asChild>
					<span
						aria-hidden
						style={{
							position: "fixed",
							left: tip.rect.left,
							top: tip.rect.top,
							width: tip.rect.width,
							height: tip.rect.height,
							pointerEvents: "none",
						}}
					/>
				</TooltipTrigger>
				<TooltipContent side={tip.side} className="z-[100] max-w-xs text-xs">
					{tip.text}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

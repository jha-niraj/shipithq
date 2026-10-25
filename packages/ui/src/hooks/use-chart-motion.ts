'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

/**
 * The house chart load animation (Niraj, 2026-10-20: "check if we have animation on this charts ... when page loads
 * then this looks more awesome"). Every chart used to pass `isAnimationActive={false}`, so nothing moved.
 *
 * Spread `motion` onto each recharts mark (`<Area {...motion}>`, `<Bar {...motion}>`, `<Line {...motion}>`):
 * lines and areas draw in left to right, bars grow from the baseline. Give the ONE amber datum dot `popClass` so it
 * pops in after the line has arrived (the CSS lives in globals.css, `.gk-chart-pop`).
 *
 * Once per mount: after the first run settles, animation switches off, so a refetch, a filter change or a hover
 * never replays it. Under prefers-reduced-motion nothing animates and the chart is drawn at rest straight away.
 * Recharts never draws on the server (the container has no size there), so there is no SSR state to get stuck in.
 */

const QUERY = '(prefers-reduced-motion: reduce)'
const BEGIN_MS = 120
const DURATION_MS = 750
const POP_MS = 380

function subscribe(onChange: () => void) {
	const m = window.matchMedia(QUERY)
	m.addEventListener('change', onChange)
	return () => m.removeEventListener('change', onChange)
}

export interface ChartMotion {
	isAnimationActive: boolean
	animationBegin: number
	animationDuration: number
	animationEasing: 'ease-out'
}

export function useChartMotion(): { motion: ChartMotion; popClass: string } {
	const reduced = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false)
	const [settled, setSettled] = useState(false)

	useEffect(() => {
		const t = window.setTimeout(() => setSettled(true), BEGIN_MS + DURATION_MS + POP_MS + 200)
		return () => window.clearTimeout(t)
	}, [])

	const active = !reduced && !settled
	return {
		motion: {
			isAnimationActive: active,
			animationBegin: BEGIN_MS,
			animationDuration: DURATION_MS,
			animationEasing: 'ease-out',
		},
		popClass: active ? 'gk-chart-pop' : '',
	}
}

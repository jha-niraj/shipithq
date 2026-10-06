"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Which step of a story is active (plan/web/story ST-3, the Story Playbook's mechanics): the one
 * whose centre is nearest the middle of the viewport, read at most once per animation frame. The
 * steps really scroll; nothing is pinned, so the page never feels stuck.
 */
export function useNearestStep(count: number) {
    const refs = useRef<(HTMLElement | null)[]>([])
    const [active, setActive] = useState(0)
    useEffect(() => {
        let raf = 0
        const read = () => {
            raf = 0
            const mid = window.innerHeight / 2
            let best = 0
            let dist = Number.POSITIVE_INFINITY
            refs.current.forEach((el, i) => {
                if (!el) return
                const r = el.getBoundingClientRect()
                const d = Math.abs(r.top + r.height / 2 - mid)
                if (d < dist) { dist = d; best = i }
            })
            setActive((a) => (a === best ? a : best))
        }
        const on = () => { if (!raf) raf = requestAnimationFrame(read) }
        read()
        window.addEventListener("scroll", on, { passive: true })
        window.addEventListener("resize", on)
        return () => {
            window.removeEventListener("scroll", on)
            window.removeEventListener("resize", on)
            cancelAnimationFrame(raf)
        }
    }, [count])
    return { refs, active }
}

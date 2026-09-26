"use client"

import { useEffect, useRef, useState } from "react"

/**
 * A number that counts up once, the first time it scrolls into view
 * (plan/web/revamp REV-79). The real value is in the server HTML, so crawlers and
 * no-JS readers see it; the count only animates after hydration, and not at all
 * under reduced motion.
 */
export function CountUp({ value, duration = 1200 }: { value: number; duration?: number }) {
    const ref = useRef<HTMLSpanElement>(null)
    const [shown, setShown] = useState(value)

    useEffect(() => {
        const el = ref.current
        if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
        let raf = 0
        const io = new IntersectionObserver(([entry]) => {
            if (!entry?.isIntersecting) return
            io.disconnect()
            const start = performance.now()
            const tick = (now: number) => {
                const p = Math.min(1, (now - start) / duration)
                setShown(Math.round(value * (1 - Math.pow(1 - p, 3))))
                if (p < 1) raf = requestAnimationFrame(tick)
            }
            setShown(0)
            raf = requestAnimationFrame(tick)
        }, { threshold: 0.4 })
        io.observe(el)
        return () => {
            io.disconnect()
            cancelAnimationFrame(raf)
        }
    }, [value, duration])

    return <span ref={ref}>{shown.toLocaleString("en-IN")}</span>
}

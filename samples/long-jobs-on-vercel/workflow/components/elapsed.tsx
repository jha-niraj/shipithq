"use client"

import { useEffect, useState } from "react"

/** Seconds since `since`, ticking once a second. */
export function Elapsed({ since }: { since: number }) {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [])
    return <>{Math.max(0, Math.round((now - since) / 1000))} s</>
}

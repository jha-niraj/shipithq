"use client"

import { useMemo } from "react"
import {
    motion,
    useReducedMotion,
    type HTMLMotionProps,
    type Variants,
} from "framer-motion"
import { cn } from "../lib/utils"

/** Smooth decelerating ease (matches main roadmap section). */
export const scrollRevealEase: [number, number, number, number] = [0.16, 1, 0.3, 1]

const defaultViewport = { once: true, margin: "-10% 0px" as const }

export type ScrollRevealProps = HTMLMotionProps<"div"> & {
    /** Extra delay before this block animates (seconds). */
    delay?: number
    /** Starting vertical offset in px. */
    y?: number
}

export function ScrollReveal({
    children,
    className,
    delay = 0,
    y = 40,
    ...props
}: ScrollRevealProps) {
    const reduced = useReducedMotion()
    const initial = reduced ? { opacity: 1, y: 0 } : { opacity: 0, y }
    const transition = useMemo(
        () =>
            reduced
                ? { duration: 0 }
                : { duration: 0.65, ease: scrollRevealEase, delay },
        [reduced, delay],
    )

    return (
        <motion.div
            initial={initial}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={defaultViewport}
            transition={transition}
            className={cn(className)}
            {...props}
        >
            {children}
        </motion.div>
    )
}

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 32 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.55, ease: scrollRevealEase },
    },
}

const reducedItemVariants: Variants = {
    hidden: { opacity: 1, y: 0 },
    show: { opacity: 1, y: 0, transition: { duration: 0 } },
}

export type ScrollRevealStaggerProps = HTMLMotionProps<"div"> & {
    stagger?: number
    delayChildren?: number
}

export function ScrollRevealStagger({
    children,
    className,
    stagger = 0.085,
    delayChildren = 0.06,
    ...props
}: ScrollRevealStaggerProps) {
    const reduced = useReducedMotion()

    const variants = useMemo<Variants>(
        () =>
            reduced
                ? {
                      hidden: {},
                      show: {
                          transition: { staggerChildren: 0, delayChildren: 0 },
                      },
                  }
                : {
                      hidden: {},
                      show: {
                          transition: { staggerChildren: stagger, delayChildren },
                      },
                  },
        [reduced, stagger, delayChildren],
    )

    return (
        <motion.div
            className={cn(className)}
            initial="hidden"
            whileInView="show"
            viewport={defaultViewport}
            variants={variants}
            {...props}
        >
            {children}
        </motion.div>
    )
}

export type ScrollRevealItemProps = HTMLMotionProps<"div">

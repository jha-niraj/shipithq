"use client"

import { useEffect, useRef } from "react"

import { cn } from "../lib/utils"

/*
 * Cards whose border lights up where the pointer is (from @ncdai/glow-card-grid; plan/
 * ui-pass UI-20). The light is the card's own art: a blurred, enlarged copy of it moves
 * with the pointer behind the card, and the border is a backdrop filter over that copy.
 * So the glow is the colour of the art. On ShipItHQ the art is ink and white (the
 * monochrome palette, Niraj 2026-09-28), so the glow is a white light in dark mode and
 * an ink shade in light mode.
 *
 * `GlowCardGrid` tracks the pointer for every card inside it (one listener for the
 * grid). `GlowCard` is the generic card: any `art`, any content; `glow={false}` draws
 * the same card flat. `BadgeCard` (badge-card.tsx) is built on it.
 */

export type GlowCardGridProps = React.ComponentPropsWithoutRef<"div"> & {
  cardRadius?: number
  /** The blurred art behind the card. */
  iconBlur?: number
  iconSaturate?: number
  iconBrightness?: number
  iconScale?: number
  iconOpacity?: number
  /** The lit border. */
  borderWidth?: number
  borderBlur?: number
  borderSaturate?: number
  borderBrightness?: number
  borderContrast?: number
  children: React.ReactNode
}

export function GlowCardGrid({
  cardRadius = 16,

  iconBlur = 25,
  iconSaturate = 5.0,
  iconBrightness = 1.3,
  iconScale = 4,
  iconOpacity = 0.3,

  borderWidth = 3,
  borderBlur = 10,
  borderSaturate = 4.2,
  borderBrightness = 2.5,
  borderContrast = 2.5,

  className,
  style,
  ...props
}: GlowCardGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Nothing moves for someone who asked for less motion: the cards stay unlit.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let frame = 0
    const handlePointerMove = (event: PointerEvent) => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!gridRef.current) return
        const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-slot='glow-card'][data-glow='on']")
        cards.forEach((card) => {
          const rect = card.getBoundingClientRect()
          const x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
          const y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
          card.style.setProperty("--pointer-x", x.toFixed(3))
          card.style.setProperty("--pointer-y", y.toFixed(3))
        })
      })
    }

    document.addEventListener("pointermove", handlePointerMove)
    return () => {
      document.removeEventListener("pointermove", handlePointerMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      ref={gridRef}
      className={cn("grid w-full gap-4 sm:grid-cols-2 md:grid-cols-3", className)}
      style={
        {
          "--card-radius": `${cardRadius}px`,
          "--card-icon-blur": `${iconBlur}px`,
          "--card-icon-saturate": iconSaturate,
          "--card-icon-brightness": iconBrightness,
          "--card-icon-scale": iconScale,
          "--card-icon-opacity": iconOpacity,
          "--card-border-width": `${borderWidth}px`,
          "--card-border-blur": `${borderBlur}px`,
          "--card-border-saturate": borderSaturate,
          "--card-border-brightness": borderBrightness,
          "--card-border-contrast": borderContrast,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export type GlowCardProps = Omit<React.ComponentPropsWithoutRef<"div">, "children"> & {
  /**
   * What lights the card: shown by the content (or not, see `children`) and, blurred and
   * enlarged, behind it as the glow. Keep it decorative (`aria-hidden`); the text is in
   * `children`.
   */
  art: React.ReactNode
  /** Off draws the same card flat, with no light behind it and no lit border. */
  glow?: boolean
  children: React.ReactNode
}

export function GlowCard({ art, glow = true, className, children, ...props }: GlowCardProps) {
  return (
    <div
      data-slot="glow-card"
      data-glow={glow ? "on" : "off"}
      className={cn(
        "relative w-full overflow-hidden rounded-(--card-radius) ring-1 ring-border select-none",
        className
      )}
      {...props}
    >
      <div className="flex size-full overflow-hidden rounded-(--card-radius) [clip-path:inset(0_round_var(--card-radius))]">
        {glow && (
          // The size container is this layer, not the card: `inset-0` gives it the card's
          // size, so the glow moves in the card's cqi/cqh while the card itself still
          // grows with its content (a size container on the card would not). Written as
          // `container-type` because `@container-size` needs Tailwind 4.2; we have 4.1.
          <div aria-hidden className="pointer-events-none absolute inset-0 [container-type:size]">
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center",
                "translate-x-[calc(var(--pointer-x,-10)*50cqi)] translate-y-[calc(var(--pointer-y,-10)*50cqh)] translate-z-0 scale-(--card-icon-scale)",
                "blur-(--card-icon-blur) brightness-(--card-icon-brightness) saturate-(--card-icon-saturate)",
                "opacity-(--card-icon-opacity) will-change-[transform,filter]"
              )}
            >
              <div className="size-20">{art}</div>
            </div>
          </div>
        )}
        <div className="relative z-1 flex flex-1 flex-col">{children}</div>
      </div>

      {glow && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 translate-z-0 rounded-(--card-radius)",
            "border-(length:--card-border-width) border-solid border-transparent",
            "backdrop-blur-(--card-border-blur) backdrop-brightness-(--card-border-brightness) backdrop-contrast-(--card-border-contrast) backdrop-saturate-(--card-border-saturate)",
            "[clip-path:inset(0_round_var(--card-radius))]"
          )}
          style={
            {
              maskImage: "linear-gradient(#fff 0 100%), linear-gradient(#fff 0 100%)",
              maskOrigin: "border-box, padding-box",
              maskClip: "border-box, padding-box",
              maskComposite: "exclude",
              WebkitMaskComposite: "xor",
            } as React.CSSProperties
          }
        />
      )}
    </div>
  )
}

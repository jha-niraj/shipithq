'use client'

import type { SoundPatch } from '@web-kits/audio'
import { SoundProvider, usePatch } from '@web-kits/audio/react'
import { useEffect, useId, useRef, useSyncExternalStore } from 'react'

import { cn } from '../../lib/utils'
import { TOAST_EVENT } from './toast'

/*
 * Interface sounds (plan/ui-sounds, Niraj 2026-09-24): short synthesised cues on
 * buttons, toggles, menus and toasts, across every app. Brought in by Niraj and
 * adapted here: our `cn`, neutral colours, `shipithq-` storage keys guarded
 * against private windows, and toasts chiming on success and error.
 *
 * ON by default (Niraj's call); the SoundToggle mutes, per browser, shared
 * across tabs. Built on `@web-kits/audio` (MIT, Raphael Salaja), which
 * synthesises in the browser - no audio files. Pinned: it is at 0.2, so an
 * upgrade gets re-checked by ear.
 */

const STORAGE_KEY = 'shipithq-sound-muted'
const VOLUME_KEY = 'shipithq-sound-volume'
const DEFAULT_VOLUME = 0.5

/* Storage can be missing or throw (private windows, blocked site data). */
function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* not remembered; the sounds still follow the in-memory choice until reload */
  }
}

const PATCH = {
  name: 'shipithq-ui',
  sounds: {

    tap: {
      source: { type: 'sine', frequency: 1300, fm: { ratio: 0.5, depth: 100 } },
      envelope: { attack: 0, decay: 0.015, sustain: 0, release: 0.005 },
      gain: 0.2,
    },

    select: {
      source: { type: 'triangle', frequency: { start: 900, end: 780 } },
      envelope: { attack: 0.001, decay: 0.055 },
      gain: 0.26,
    },

    toggleOn: {
      source: { type: 'sine', frequency: { start: 520, end: 880 } },
      envelope: { attack: 0.002, decay: 0.085 },
      gain: 0.3,
    },
    toggleOff: {
      source: { type: 'sine', frequency: { start: 780, end: 420 } },
      envelope: { attack: 0.002, decay: 0.085 },
      gain: 0.28,
    },

    open: {
      source: { type: 'triangle', frequency: { start: 320, end: 620 } },
      filter: { type: 'lowpass', frequency: 2600 },
      envelope: { attack: 0.006, decay: 0.13 },
      gain: 0.24,
    },
    close: {
      source: { type: 'triangle', frequency: { start: 560, end: 300 } },
      filter: { type: 'lowpass', frequency: 2200 },
      envelope: { attack: 0.004, decay: 0.11 },
      gain: 0.22,
    },

    tick: {
      source: { type: 'square', frequency: 1400 },
      filter: { type: 'lowpass', frequency: 3000 },
      envelope: { decay: 0.014 },
      gain: 0.1,
    },

    sliderTick: {
      source: { type: 'triangle', frequency: 1050 },
      filter: { type: 'lowpass', frequency: 2400 },
      envelope: { attack: 0.0004, decay: 0.011 },
      gain: 0.045,
    },

    destructive: {
      layers: [
        {
          source: { type: 'triangle', frequency: { start: 300, end: 170 } },
          filter: { type: 'lowpass', frequency: 1400 },
          envelope: { attack: 0.002, decay: 0.12 },
          gain: 0.32,
        },
        {
          source: { type: 'noise', color: 'brown' },
          filter: { type: 'bandpass', frequency: 700, resonance: 1.1 },
          envelope: { decay: 0.05 },
          gain: 0.06,
        },
      ],
    },

    key: {
      layers: [
        {
          source: { type: 'sine', frequency: { start: 1000, end: 900 } },
          envelope: { attack: 0.001, decay: 0.028 },
          gain: 0.14,
        },
        {
          source: { type: 'noise', color: 'white' },
          filter: { type: 'bandpass', frequency: 3200, resonance: 2 },
          envelope: { decay: 0.01 },
          gain: 0.035,
        },
      ],
    },

    success: {
      layers: [
        {
          source: { type: 'triangle', frequency: 784 },
          envelope: { attack: 0.004, decay: 0.16 },
          gain: 0.22,
        },
        {
          source: { type: 'triangle', frequency: 1175 },
          envelope: { attack: 0.004, decay: 0.22 },
          gain: 0.18,
          delay: 0.075,
        },
      ],
    },
    error: {
      layers: [
        {
          source: { type: 'triangle', frequency: 300 },
          filter: { type: 'lowpass', frequency: 1200 },
          envelope: { attack: 0.003, decay: 0.13 },
          gain: 0.26,
        },
        {
          source: { type: 'triangle', frequency: 224 },
          filter: { type: 'lowpass', frequency: 1000 },
          envelope: { attack: 0.003, decay: 0.2 },
          gain: 0.24,
          delay: 0.09,
        },
      ],
    },

    warning: {
      layers: [
        {
          source: { type: 'triangle', frequency: 622 },
          filter: { type: 'lowpass', frequency: 2800 },
          envelope: { attack: 0.003, decay: 0.14 },
          gain: 0.2,
        },
        {
          source: { type: 'triangle', frequency: 622 },
          filter: { type: 'lowpass', frequency: 2800 },
          envelope: { attack: 0.003, decay: 0.18 },
          gain: 0.17,
          delay: 0.085,
        },
      ],
    },

    copy: {
      layers: [
        {
          source: { type: 'sine', frequency: 1200 },
          envelope: { attack: 0, decay: 0.015, sustain: 0, release: 0.006 },
          gain: 0.16,
        },
        {
          source: { type: 'sine', frequency: 1400 },
          envelope: { attack: 0, decay: 0.015, sustain: 0, release: 0.006 },
          delay: 0.04,
          gain: 0.14,
        },
      ],
    },

    notification: {
      layers: [
        {
          source: { type: 'triangle', frequency: 523 },
          envelope: { attack: 0.008, decay: 0.3, sustain: 0.03, release: 0.12 },
          gain: 0.14,
        },
        {
          source: { type: 'triangle', frequency: 784 },
          envelope: { attack: 0.008, decay: 0.25, sustain: 0.02, release: 0.1 },
          delay: 0.12,
          gain: 0.12,
        },
      ],
    },

    swoosh: {
      source: { type: 'sine', frequency: { start: 300, end: 2000 } },
      envelope: { attack: 0.008, decay: 0.12, sustain: 0, release: 0.04 },
      gain: 0.12,
    },

    chirp: {
      source: { type: 'sine', frequency: { start: 1200, end: 1500 } },
      envelope: { attack: 0, decay: 0.03, sustain: 0, release: 0.01 },
      gain: 0.08,
    },

    command: {
      layers: [
        {
          source: { type: 'triangle', frequency: { start: 1046, end: 784 } },
          envelope: { attack: 0.001, decay: 0.075 },
          gain: 0.2,
        },
        {
          source: { type: 'sine', frequency: 1568 },
          envelope: { attack: 0.001, decay: 0.045 },
          gain: 0.06,
          delay: 0.018,
        },
      ],
    },

    blocked: {
      source: { type: 'sine', frequency: 180 },
      filter: { type: 'lowpass', frequency: 700 },
      envelope: { attack: 0.004, decay: 0.06 },
      gain: 0.16,
    },
  },
} as const satisfies SoundPatch

export type SoundName = keyof (typeof PATCH)['sounds']

type Cue = { sound: SoundName; detune?: number; velocity?: number }

const JITTER: Record<SoundName, number> = {
  tap: 26,
  select: 22,
  toggleOn: 14,
  toggleOff: 14,
  open: 10,
  close: 10,
  tick: 18,
  sliderTick: 10,
  key: 20,
  destructive: 12,
  blocked: 30,

  chirp: 24,

  command: 8,

  copy: 6,

  notification: 3,

  swoosh: 14,

  success: 5,
  error: 5,
  warning: 5,
}

function jitter(cents: number) {
  return (Math.random() * 2 - 1) * cents
}

function play(patch: { play: (name: string, opts?: object) => unknown }, cue: Cue) {
  patch.play(cue.sound, {
    detune: (cue.detune ?? 0) + jitter(JITTER[cue.sound]),

    velocity: (cue.velocity ?? 1) * (0.9 + Math.random() * 0.1),
  })
}

/*
 * Sounds are for OCCASIONAL moments only (Niraj, 2026-09-24: a click happens
 * too often to deserve a sound). So nothing here listens to clicks, keys,
 * toggles, menus or sliders any more. What plays:
 *  - a toast that says done (success) or failed (error);
 *  - the swoosh when sounds are turned back on;
 *  - any element that asks for a sound explicitly, `data-sound="<name>"`, when
 *    it is pressed - for the rare moment worth marking.
 */
function SoundEffectListener() {
  const patch = usePatch(PATCH)
  const muted = useSoundMuted()

  const wasMuted = useRef(muted)
  useEffect(() => {
    const cameBack = wasMuted.current && !muted
    wasMuted.current = muted
    if (cameBack) play(patch, { sound: 'swoosh' })
  }, [muted, patch])

  useEffect(() => {
    if (!patch.ready) return

    const onToast = (event: Event) => {
      const state = (event as CustomEvent<{ state?: string }>).detail?.state
      if (state === 'success') play(patch, { sound: 'success' })
      else if (state === 'error') play(patch, { sound: 'error' })
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !(event.target instanceof Element)) return
      const el = event.target.closest<HTMLElement>('[data-sound]')
      const named = el?.dataset.sound
      if (!el || !named || !(named in PATCH.sounds)) return
      if (el.matches(':disabled, [aria-disabled="true"], [data-disabled]')) return
      play(patch, { sound: named as SoundName })
    }

    window.addEventListener(TOAST_EVENT, onToast)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [patch])

  return null
}

const listeners = new Set<() => void>()

function subscribeMuted(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

function notify() {
  for (const onChange of listeners) onChange()
}

export function setSoundMuted(muted: boolean) {
  writeStorage(STORAGE_KEY, muted ? '1' : '0')
  notify()
}

export function useSoundMuted() {
  return useSyncExternalStore(
    subscribeMuted,
    () => readStorage(STORAGE_KEY) === '1',
    () => false,
  )
}

export function setSoundVolume(volume: number) {
  writeStorage(VOLUME_KEY, String(volume))
  notify()
}

export function useSoundVolume() {
  return useSyncExternalStore(
    subscribeMuted,
    () => {
      const stored = Number(readStorage(VOLUME_KEY))

      return Number.isFinite(stored) && stored > 0 && stored <= 1 ? stored : DEFAULT_VOLUME
    },
    () => DEFAULT_VOLUME,
  )
}

/**
 * Mount once per app (each root layout does, beside the toaster). It listens
 * at the document, so it does not need to wrap the page.
 */
export function SoundEffects({ children }: { children?: React.ReactNode }) {
  const muted = useSoundMuted()
  const volume = useSoundVolume()

  return (
    <SoundProvider enabled={!muted} volume={volume}>
      <SoundEffectListener />
      {children}
    </SoundProvider>
  )
}

const SPEAKER =
  'M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z'
const WAVE_INNER = 'M16 9a5 5 0 0 1 0 6'
const WAVE_OUTER = 'M19.364 18.364a9 9 0 0 0 0-12.728'
const SLASH = 'M2 2 22 22'

export function SoundToggle({ className, onClick, ...props }: React.ComponentProps<'button'>) {

  const muted = useSoundMuted()
  const maskId = useId()

  return (
    <button
      type="button"
      aria-label={muted ? 'Unmute interface sounds' : 'Mute interface sounds'}
      aria-pressed={muted}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) setSoundMuted(!muted)
      }}

      data-sound="swoosh"
      {...props}
      className={cn(
        'sound-toggle flex size-7 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition-[transform,background-color,color] duration-100 ease-out outline-none hover:bg-neutral-900/5 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] motion-reduce:transition-none dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white',
        className,
      )}
    >
      <svg
        data-muted={muted}
        viewBox="0 0 24 24"
        width={17}
        height={17}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >

        <mask id={maskId}>
          <rect width="24" height="24" fill="white" />
          <path className="sound-slash" d={SLASH} pathLength={1} stroke="black" strokeWidth={4} />
        </mask>
        <g mask={`url(#${maskId})`}>
          <path className="sound-speaker" d={SPEAKER} />
          <path className="sound-wave sound-wave-inner" d={WAVE_INNER} />
          <path className="sound-wave sound-wave-outer" d={WAVE_OUTER} />
        </g>
        <path className="sound-slash" d={SLASH} pathLength={1} />
      </svg>
    </button>
  )
}


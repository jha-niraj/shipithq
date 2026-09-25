/** Name of the cookie mirroring whether the person unpinned the sidebar ("1" = unpinned).
 *
 *  A cookie, not localStorage: the server layout reads it so the sidebar renders at the
 *  right state on the FIRST frame. Read in an effect, an unpinned sidebar would paint
 *  pinned and then slide away on every load.
 *
 *  Plain module - no 'use client' / 'server-only' - so both sides can import the name.
 *  Ported from gurukulhq (plan/practice-ui, UI-7). */
export const SIDEBAR_UNPINNED_COOKIE = "shipithq-sidebar-unpinned"

'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

/**
 * A place in a page header that a panel further down can draw into (Niraj, 2026-10-23: the Usage tab's period picker
 * sits beside the tabs, not on a row of its own). The page puts `<HeaderSlot id="x" />` in its header; the panel that
 * owns the control keeps its own state and renders `<IntoHeaderSlot id="x">...</IntoHeaderSlot>`.
 *
 * The slot is in the server-rendered header, so it exists before any streamed panel mounts. Nothing is drawn until
 * mount (a portal needs the node), so the slot is empty for one paint - keep the control small.
 */
export function HeaderSlot({ id, className }: { id: string; className?: string }) {
    return <div id={id} data-header-slot="" className={cn('flex items-center gap-2 empty:hidden', className)} />;
}

export function IntoHeaderSlot({ id, children }: { id: string; children: ReactNode }) {
    const [node, setNode] = useState<HTMLElement | null>(null);
    useEffect(() => { setNode(document.getElementById(id)); }, [id]);
    return node ? createPortal(children, node) : null;
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Bell, CheckCircle2, Info, XCircle } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { NotificationsPanel as SharedNotificationsPanel, type NotificationView } from '@repo/ui/components/ui/notifications-panel';
import { cn } from '@repo/ui/lib/utils';
import { getNotifications, markAllAsRead, markAsRead } from '@/actions/(main)/notifications/notification.action';

// ─────────────────────────────────────────────────────────────────────────────
// The sidebar's notifications: a bell with an unread badge that opens the
// shared panel (ported from gurukulhq's navigation, 2026-09-22). This file is
// the ShipItHQ data side: it maps `notification` rows onto the panel's view.
// ─────────────────────────────────────────────────────────────────────────────

type Row = { id: string; title: string; message?: string | null; read?: boolean; type?: string; actionUrl?: string | null; createdAt: Date | string };

function iconFor(type: string) {
    const cls = 'h-4 w-4';
    switch (type) {
        case 'SUCCESS': return <CheckCircle2 className={cn(cls, 'text-neutral-900 dark:text-neutral-100')} />;
        case 'WARNING': return <AlertTriangle className={cn(cls, 'text-neutral-700 dark:text-neutral-300')} />;
        case 'ERROR': return <XCircle className={cn(cls, 'text-red-600 dark:text-red-400')} />;
        default: return <Info className={cn(cls, 'text-neutral-500')} />;
    }
}

/** The module filter: taken from where the notification points ("/projects/..." -> "Projects"). */
function moduleOf(actionUrl: string | null | undefined): string {
    const seg = (actionUrl ?? '').split('?')[0]?.split('/').filter(Boolean)[0];
    if (!seg) return 'General';
    const names: Record<string, string> = { ai: 'AI tools', knowme: 'KnowMe', mock: 'Mock interviews', pathfinder: 'Pathfinder' };
    return names[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
}

/** Shared unread count, so the sidebar's badge and the panel agree. */
export function useNotifications(enabled: boolean) {
    const [items, setItems] = useState<Row[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await getNotifications(1, 50);
            const data = (r as { data?: { notifications?: Row[]; totalUnread?: number } }).data;
            if (r.success && data?.notifications) {
                setItems(data.notifications);
                setUnread(data.totalUnread ?? data.notifications.filter((n) => !n.read).length);
            }
        } catch {
            // The bell is chrome; a failed load never breaks the sidebar.
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { if (enabled) void load(); }, [enabled, load]);

    return { items, setItems, unread, setUnread, loading, reload: load };
}

export function NotificationsPanel({
    externalOpen,
    onExternalClose,
    enabled,
}: {
    externalOpen?: boolean;
    onExternalClose?: () => void;
    enabled: boolean;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const { items, setItems, unread, setUnread, loading, reload } = useNotifications(enabled);

    useEffect(() => { if (externalOpen) setOpen(true); }, [externalOpen]);
    // Refresh whenever the panel opens, so it is never showing a stale list.
    useEffect(() => { if (open) void reload(); }, [open, reload]);

    const views = useMemo<NotificationView[]>(
        () => items.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.message ?? '',
            createdAt: n.createdAt,
            readAt: n.read ? n.createdAt : null,
            module: moduleOf(n.actionUrl),
            icon: iconFor(n.type ?? 'INFO'),
            href: n.actionUrl ?? null,
        })),
        [items],
    );

    const handleItemClick = async (v: NotificationView) => {
        if (!v.readAt) {
            setItems((prev) => prev.map((x) => (x.id === v.id ? { ...x, read: true } : x)));
            setUnread((c) => Math.max(0, c - 1));
            void markAsRead(v.id);
        }
        if (v.href) {
            setOpen(false);
            router.push(v.href);
        }
    };

    const handleMarkAll = async () => {
        await markAllAsRead();
        setItems((prev) => prev.map((x) => ({ ...x, read: true })));
        setUnread(0);
    };

    const badge = Math.min(unread, 99);

    return (
        <>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(true)}
                className="relative h-9 w-9 rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                aria-label={badge > 0 ? `Notifications, ${badge} unread` : 'Notifications'}
            >
                <Bell className="h-5 w-5" />
                {badge > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-neutral-950">
                        {badge > 9 ? '9+' : badge}
                    </span>
                )}
            </Button>
            <SharedNotificationsPanel
                open={open}
                onOpenChange={(o) => { setOpen(o); if (!o) onExternalClose?.(); }}
                notifications={views}
                loading={loading}
                onItemClick={handleItemClick}
                onMarkAllRead={handleMarkAll}
                title="Notifications"
                subtitle="Project reviews, credits, and account updates."
                emptyBody="Project reviews, credits, and account updates will appear here."
            />
        </>
    );
}

'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Search, X, type LucideIcon } from 'lucide-react';
import {
    Tree, TreeItem, TreeItemLabel, useTree, syncDataLoaderFeature, selectionFeature, hotkeysCoreFeature,
} from './tree';
import { ScrollArea } from './scroll-area';
import { Input } from './input';
import { cn } from '../../lib/utils';

/**
 * One node of a navigator tree. The tree only NAVIGATES: selecting a node calls `onSelect`, and the screen opens its
 * existing sheet or panel for it. No editing lives in a row (a switch or button inside a treeitem is a button inside
 * a button, and its keys would also drive the tree).
 */
export interface NavTreeNode {
    id: string;
    name: string;
    /** Child ids in display order. A node with children is a folder. */
    children?: string[];
    icon?: LucideIcon;
    /** Small trailing text - a count, a page range. */
    meta?: ReactNode;
    /** Switched off / not in use: drawn dimmed, never hidden. */
    dim?: boolean;
    /** Extra text the filter matches on (a code, a teacher's name) besides `name`. */
    searchText?: string;
}

const ROOT = '__nav_root__';

/**
 * A ReUI Tree (headless-tree) used as a navigator: filter box, keyboard navigation (arrows, Home/End, Enter), expand
 * state remembered for the browser session under `storageKey`, and a bounded height that scrolls inside.
 * While filtering, the matches are tinted amber and their parents are opened; clearing the filter restores the
 * remembered expand state.
 */
export function NavTree({
    label, nodes, rootIds, selectedId, onSelect, storageKey,
    maxHeightClass = 'max-h-[31rem]', searchPlaceholder = 'Filter...', emptyText = 'Nothing here yet.', className,
}: {
    /** The tree's accessible name. */
    label: string;
    nodes: Record<string, NavTreeNode>;
    rootIds: string[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    /** sessionStorage key for the expanded ids. */
    storageKey: string;
    /** The scroll ceiling, on the ScrollArea VIEWPORT. */
    maxHeightClass?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    className?: string;
}) {
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();

    // Expand state: per browser session. Read after mount (sessionStorage does not exist on the server, and reading
    // it in the initialiser would hydrate differently from the server render).
    const [expanded, setExpanded] = useState<string[]>([]);
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(storageKey);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            if (Array.isArray(parsed)) setExpanded(parsed.filter((x): x is string => typeof x === 'string'));
        } catch { /* private window or blocked storage: start collapsed */ }
    }, [storageKey]);
    const persist = (next: string[]) => {
        setExpanded(next);
        try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* not remembered, still works */ }
    };

    // The filter: keep every match, its ancestors and (for a matching folder) everything under it. Folders with a
    // match strictly below them are opened.
    const filter = useMemo(() => {
        if (!q) return null;
        const keep = new Set<string>();
        const matches = new Set<string>();
        const open: string[] = [];
        const keepAll = (id: string) => {
            keep.add(id);
            for (const c of nodes[id]?.children ?? []) keepAll(c);
        };
        const visit = (id: string): boolean => {
            const n = nodes[id];
            if (!n) return false;
            const self = n.name.toLowerCase().includes(q) || (n.searchText ?? '').toLowerCase().includes(q);
            if (self) { matches.add(id); keepAll(id); }
            let below = false;
            for (const c of n.children ?? []) if (visit(c)) below = true;
            if (below) { keep.add(id); open.push(id); }
            return self || below;
        };
        for (const id of rootIds) visit(id);
        return { keep, matches, open };
    }, [q, nodes, rootIds]);

    // While filtering, a toggle changes only the filter's own expand set, so the remembered one survives the search.
    const [filterExpanded, setFilterExpanded] = useState<{ q: string; ids: string[] }>({ q: '', ids: [] });
    const shownExpanded = useMemo(
        () => (!filter ? expanded : filterExpanded.q === q ? filterExpanded.ids : filter.open),
        [filter, expanded, filterExpanded, q],
    );
    const selectedItems = useMemo(() => (selectedId ? [selectedId] : []), [selectedId]);

    const tree = useTree<NavTreeNode | null>({
        rootItemId: ROOT,
        getItemName: (item) => item.getItemData()?.name ?? '',
        isItemFolder: (item) => item.getId() === ROOT || (item.getItemData()?.children?.length ?? 0) > 0,
        dataLoader: {
            getItem: (id) => nodes[id] ?? null,
            getChildren: (id) => (id === ROOT ? rootIds : nodes[id]?.children ?? [])
                .filter((c) => !!nodes[c] && (!filter || filter.keep.has(c))),
        },
        state: { expandedItems: shownExpanded, selectedItems },
        setExpandedItems: (u) => {
            const next = typeof u === 'function' ? u(shownExpanded) : u;
            if (filter) setFilterExpanded({ q, ids: next });
            else persist(next);
        },
        // Selection is the screen's (it follows the open sheet), so the tree's own write is ignored.
        setSelectedItems: () => {},
        onPrimaryAction: (item) => { if (item.getId() !== ROOT) onSelect(item.getId()); },
        features: [syncDataLoaderFeature, selectionFeature, hotkeysCoreFeature],
    });

    // New data or a new filter: the tree's item cache is rebuilt from the loader.
    useEffect(() => { tree.rebuildTree(); }, [tree, nodes, rootIds, filter]);

    const items = tree.getItems();

    return (
        <div className={cn('flex min-w-0 flex-col gap-2', className)}>
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        // Down from the filter box moves into the tree, so the keyboard never has to tab through.
                        if (e.key === 'ArrowDown' && items.length > 0) {
                            e.preventDefault();
                            items[0]?.setFocused();
                            tree.updateDomFocus();
                        }
                        if (e.key === 'Escape') setQuery('');
                    }}
                    placeholder={searchPlaceholder}
                    aria-label={`Filter ${label.toLowerCase()}`}
                    className="h-9 rounded-xl pl-9 pr-8 text-sm"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                        aria-label="Clear filter"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
            <ScrollArea orientation="vertical" className="min-w-0" viewportClassName={maxHeightClass}>
                <Tree tree={tree} indent={16} aria-label={label} className="pr-1">
                    {items.map((item) => {
                        const n = item.getItemData();
                        if (!n) return null;
                        const Icon = n.icon;
                        const match = !!filter && filter.matches.has(n.id);
                        return (
                            <TreeItem key={item.getId()} item={item} className="w-full text-left" data-search-match={match ? 'true' : undefined}>
                                <TreeItemLabel className={cn('min-w-0 gap-2', n.dim && 'opacity-50')}>
                                    {Icon && <Icon className="size-4 text-neutral-500 dark:text-neutral-400" />}
                                    <span className="min-w-0 flex-1 truncate">{n.name}</span>
                                    {n.meta != null && (
                                        <span className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{n.meta}</span>
                                    )}
                                </TreeItemLabel>
                            </TreeItem>
                        );
                    })}
                </Tree>
                {items.length === 0 && (
                    <p className="px-2 py-6 text-center text-xs text-neutral-600 dark:text-neutral-300">
                        {q ? 'Nothing matches that filter.' : emptyText}
                    </p>
                )}
            </ScrollArea>
        </div>
    );
}

'use client';

import * as React from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    useDraggable,
    useDroppable,
    pointerWithin,
    type DragStartEvent,
    type DragEndEvent,
} from '@dnd-kit/core';
import { cn } from '@repo/ui/lib/utils';
import { ScrollArea } from './ui/scroll-area';

export interface KanbanColumn<T> {
    /** Stable column id - used as the droppable id. */
    id: string;
    /** Items belonging to this column, in display order. */
    items: T[];
    /** Optional arbitrary metadata the consumer can read in render callbacks. */
    meta?: unknown;
}

export interface KanbanMove {
    itemId: string;
    fromColumnId: string;
    toColumnId: string;
    fromIndex: number;
    toIndex: number;
}

export interface KanbanBoardProps<T> {
    columns: KanbanColumn<T>[];
    /** Stable id for an item - used as the draggable id. Must be globally unique. */
    getItemId: (item: T) => string;
    /** Render a card. `isDragging` is true while this card is being dragged. */
    renderItem: (item: T, isDragging: boolean) => React.ReactNode;
    /** Fired when a card is dropped in a different column. No-op drops are filtered out. */
    onMove: (move: KanbanMove) => void;
    renderColumnHeader?: (column: KanbanColumn<T>) => React.ReactNode;
    renderColumnFooter?: (column: KanbanColumn<T>) => React.ReactNode;
    /**
     * Shown inside a column that has no cards. Rendered INSIDE the droppable, so the column stays
     * a valid drop target - an empty column that renders nothing is an empty column you cannot drop
     * into, which is the one place a kanban most needs to accept a card.
     *
     * Defaults to a muted "Nothing here" line.
     */
    renderColumnEmpty?: (column: KanbanColumn<T>) => React.ReactNode;
    /** Disable dropping into a column (e.g. past dates). */
    isColumnDropDisabled?: (columnId: string) => boolean;
    /** Disable dragging a specific item. */
    isItemDragDisabled?: (item: T) => boolean;
    /** Class for the columns wrapper - set your grid/flex layout here. Put the `min-w-[...]`
     *  that keeps columns usable at narrow widths on this element. */
    className?: string;
    /** Class for each column wrapper. */
    columnClassName?: string;
    /** Class for the droppable card area inside a column. */
    columnBodyClassName?: string;
    /** Extra class applied to the card area while a draggable is hovering over it. */
    droppingClassName?: string;
    /** Class for the outer horizontal ScrollArea. Bound the board's height here - normally
     *  `flex-1 min-h-0` inside a `h-[var(--gk-page-h)]` page column. */
    boardClassName?: string;
    /** Class for each column's own vertical ScrollArea (its card list). Cap a column here,
     *  e.g. `max-h-[60vh]`, when the board is not already height-bounded by its parent. */
    columnScrollClassName?: string;
    /** Opt out of the board's own horizontal ScrollArea. Only for a consumer that already
     *  supplies one around the board - nesting two horizontal scrollers gives two bars that
     *  fight each other. */
    scrollBoard?: boolean;
    /** Opt out of the per-column vertical ScrollArea. Only for a board that is genuinely short
     *  and must grow with the page (a week view with 2-3 cards per day). Prefer leaving this on. */
    scrollColumns?: boolean;
}

/**
 * Generic horizontal kanban board with drag-and-drop between columns.
 *
 * ## Why @dnd-kit and not @hello-pangea/dnd
 *
 * This was built on `@hello-pangea/dnd` (the maintained fork of react-beautiful-dnd) and had to be
 * migrated, because that library has a hard, documented constraint this layout cannot satisfy.
 * From its own `docs/api/droppable.md`:
 *
 *   > "We currently only support a single scroll parent."
 *   > Supported: the Droppable is itself a scroll container with NO scrollable parents, OR the
 *   > Droppable has exactly ONE scrollable parent.
 *
 * A kanban of this shape unavoidably has three scrollable ancestors:
 *
 *   app shell ScrollArea -> board horizontal ScrollArea -> column vertical ScrollArea -> Droppable
 *
 * and every one is detected, because the library marks any element whose *computed* `overflow-x/y`
 * is `scroll` or `auto` as a scroll container - it does not check whether that element actually
 * overflows. None of the three can be dropped: the shell is shared by every page, the horizontal
 * scroller is what stops columns being crushed at narrow widths, and the per-column scroller is
 * what lets one column hold 50 cards without dragging every other column down with it.
 *
 * It also got WORSE after a correct layout fix, which is the part worth remembering: before that
 * fix the column's `h-full` never resolved (a percentage height cannot resolve through Radix's
 * `display: table` viewport wrapper), so the column ScrollArea was not really a scroll container
 * and there were effectively only two. Making the layout right made the third one real and pushed
 * the library past what it supports.
 *
 * `@dnd-kit` has no single-scroll-parent restriction, and its auto-scroll walks every scrollable
 * ancestor - which also replaces the hand-rolled horizontal auto-scroll this component carried.
 *
 * ## Scrolling contract (unchanged - see the Kanban section in the root CLAUDE.md)
 *  - the column strip scrolls HORIZONTALLY in one ScrollArea, so columns keep a usable width via
 *    the `min-w-[...]` on `className` instead of being crushed;
 *  - each column scrolls VERTICALLY in its OWN ScrollArea;
 *  - header and footer sit OUTSIDE the column's ScrollArea so they never scroll away from the
 *    cards they label.
 *
 * The board must never grow the page: bound `boardClassName` with `flex-1 min-h-0` inside a
 * `h-[var(--gk-page-h)]` column, or cap each column via `columnScrollClassName`.
 */
export function KanbanBoard<T>({
    columns,
    getItemId,
    renderItem,
    onMove,
    renderColumnHeader,
    renderColumnFooter,
    renderColumnEmpty,
    isColumnDropDisabled,
    isItemDragDisabled,
    className,
    columnClassName,
    columnBodyClassName,
    droppingClassName = 'bg-muted/50',
    boardClassName,
    columnScrollClassName,
    scrollBoard = true,
    scrollColumns = true,
}: KanbanBoardProps<T>) {
    const [activeId, setActiveId] = React.useState<string | null>(null);
    // Measured from the real card at drag start, so the floating copy is exactly the size of the
    // card you picked up. A fixed width prop would be wrong for any board whose columns are not
    // the width someone happened to hardcode - the schedule board's are a sixth of the viewport.
    const [overlayWidth, setOverlayWidth] = React.useState<number | undefined>(undefined);

    // An 8px activation distance so a CLICK on a control inside a card is still a click. Without it
    // every mousedown begins a drag and the card's own buttons ("Send link", "Invite") stop firing.
    // PointerSensor only - see the note on `tabIndex: -1` in KanbanCard for why a KeyboardSensor
    // is deliberately not registered on cards that contain their own buttons.
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    );

    const itemIndex = React.useMemo(() => {
        const map = new Map<string, { item: T; columnId: string; index: number }>();
        for (const col of columns) {
            col.items.forEach((item, index) => {
                map.set(getItemId(item), { item, columnId: col.id, index });
            });
        }
        return map;
    }, [columns, getItemId]);

    const activeEntry = activeId ? itemIndex.get(activeId) : undefined;

    const handleDragStart = React.useCallback((event: DragStartEvent) => {
        setActiveId(String(event.active.id));
        setOverlayWidth(event.active.rect.current.initial?.width);
    }, []);

    const handleDragEnd = React.useCallback(
        (event: DragEndEvent) => {
            setActiveId(null);
            const { active, over } = event;
            if (!over) return;

            const from = itemIndex.get(String(active.id));
            if (!from) return;

            // `over.id` is always a COLUMN id: only columns are registered as droppables, because
            // the board deliberately does not support reordering within a column. Both consumers
            // derive order from data (a date), so honouring an intra-column drag would be a lie.
            const toColumnId = String(over.id);
            if (toColumnId === from.columnId) return;

            const toColumn = columns.find((c) => c.id === toColumnId);
            onMove({
                itemId: String(active.id),
                fromColumnId: from.columnId,
                toColumnId,
                fromIndex: from.index,
                toIndex: toColumn ? toColumn.items.length : 0,
            });
        },
        [columns, itemIndex, onMove],
    );

    const body = (column: KanbanColumn<T>) => (
        <KanbanDroppable
            column={column}
            className={columnBodyClassName}
            droppingClassName={droppingClassName}
            disabled={isColumnDropDisabled?.(column.id) ?? false}
            renderEmpty={renderColumnEmpty}
        >
            {column.items.map((item) => {
                const id = getItemId(item);
                return (
                    <KanbanCard key={id} id={id} disabled={isItemDragDisabled?.(item) ?? false}>
                        {(isDragging) => renderItem(item, isDragging)}
                    </KanbanCard>
                );
            })}
        </KanbanDroppable>
    );

    const strip = (
        <div className={className}>
            {columns.map((column) => (
                <div key={column.id} className={columnClassName}>
                    {/* Header and footer stay outside the card scroller so they never scroll away
                        from the cards they belong to. */}
                    {renderColumnHeader?.(column)}
                    {scrollColumns ? (
                        <ScrollArea
                            orientation="vertical"
                            className={cn('min-h-0 flex-1', columnScrollClassName)}
                            // Radix wraps viewport children in a `min-width:100%; display:table`
                            // div, and a percentage height does not resolve through a table box
                            // (the same trap the root CLAUDE.md documents for pages). Without
                            // forcing `block`, the droppable cannot be `h-full`, so an EMPTY
                            // column's drop zone is only as tall as its padding - a ~10px strip
                            // nobody can realistically aim at. With it, the droppable fills the
                            // column and the whole column is the target.
                            viewportClassName="[&>div]:!block [&>div]:h-full"
                        >
                            {body(column)}
                        </ScrollArea>
                    ) : (
                        body(column)
                    )}
                    {renderColumnFooter?.(column)}
                </div>
            ))}
        </div>
    );

    return (
        <DndContext
            sensors={sensors}
            // pointerWithin rather than the default rectangle intersection: columns are tall and
            // adjacent, and rectangle intersection resolves to whichever column overlaps the
            // dragged card's BOX the most - frequently not the one under the cursor. The cursor is
            // what the user believes they are aiming with.
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
        >
            {scrollBoard ? (
                <ScrollArea
                    orientation="horizontal"
                    className={boardClassName}
                    viewportClassName="[&>div]:!block [&>div]:h-full"
                >
                    {strip}
                </ScrollArea>
            ) : (
                strip
            )}

            {/* The dragged card renders in an overlay portalled to the body, so it is never clipped
                by the column's or the board's `overflow: hidden`. Without one, dragging a card
                towards another column makes it vanish at the column edge. */}
            <DragOverlay dropAnimation={null}>
                {activeEntry ? (
                    <div style={{ width: overlayWidth }} className="cursor-grabbing opacity-95">
                        {renderItem(activeEntry.item, true)}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

/** A column's card area. Columns are the only droppables, so a drop always resolves to a column. */
function KanbanDroppable<T>({
    column,
    className,
    droppingClassName,
    disabled,
    renderEmpty,
    children,
}: {
    column: KanbanColumn<T>;
    className?: string;
    droppingClassName?: string;
    disabled: boolean;
    renderEmpty?: (column: KanbanColumn<T>) => React.ReactNode;
    children: React.ReactNode;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: column.id, disabled });

    return (
        <div ref={setNodeRef} className={cn(className, isOver && !disabled && droppingClassName)}>
            {children}
            {/* Empty state sits INSIDE the droppable so the column is still a drop target while it
                reads as empty. `pointer-events-none` so it never intercepts the drag. Hidden while
                a card hovers, otherwise "Nothing here" sits under the card you are about to drop
                and reads as a contradiction. */}
            {column.items.length === 0 && !isOver && (
                <div className="pointer-events-none flex min-h-[72px] flex-1 items-center justify-center px-3 py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
                    {renderEmpty?.(column) ?? 'Nothing here'}
                </div>
            )}
        </div>
    );
}

/** A draggable card. The original dims while dragging; the DragOverlay draws the moving copy. */
function KanbanCard({
    id,
    disabled,
    children,
}: {
    id: string;
    disabled: boolean;
    children: (isDragging: boolean) => React.ReactNode;
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id,
        disabled,
        attributes: {
            // dnd-kit defaults a draggable to `role="button"` with `tabIndex={0}`. These cards
            // CONTAIN real buttons ("Send link", "Invite", the overflow menu), and a button
            // containing buttons is invalid - screen readers flatten it and the inner controls
            // become unreachable. `group` describes what the card actually is.
            role: 'group',
            // Not a tab stop, and no KeyboardSensor is registered (see the DndContext), because
            // Space/Enter on an inner button would bubble to the card and start a drag at the same
            // time as activating the button. Keyboard users are not stranded: every board here
            // exposes the same state change through a menu action, which is the accessible path.
            tabIndex: -1,
            roleDescription: 'Draggable card',
        },
    });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            // No transform on the original on purpose - the DragOverlay renders the card that
            // follows the cursor, and transforming this one too would show two moving cards.
            className={cn(
                !disabled && 'cursor-grab active:cursor-grabbing',
                isDragging && 'opacity-40',
            )}
        >
            {children(isDragging)}
        </div>
    );
}

'use client';

/**
 * SortableList - the ONE way to reorder a list in Gurukul (AGENTS.md s6: "Reordering is drag and drop").
 *
 * Built on `@dnd-kit/core` (the drag library @repo/ui already ships - see `dnd.tsx`). Each row is both a
 * draggable and a drop target; dropping on a row puts the dragged item at that row's index, through the
 * pure `moveItem` helper in `@repo/core/list/move-item`. Only the grip handle starts a drag, so inputs,
 * buttons and text inside a row keep working.
 *
 * Keyboard: Tab to a handle, Space picks the item up, Arrow up/down move it, Space drops, Escape cancels.
 * Inside a ScrollArea the viewport auto-scrolls while dragging (dnd-kit finds scrollable ancestors).
 *
 *   <SortableList
 *       items={sections}
 *       getId={(s) => s.id}
 *       onReorder={setSections}
 *       renderItem={(s, { handle }) => <div className="flex items-center gap-2">{handle}{s.title}</div>}
 *   />
 */

import * as React from 'react';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
    type Modifier,
    type UniqueIdentifier,
} from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { moveItem } from '@repo/core/list/move-item';
import { cn } from '@repo/ui/lib/utils';

export { moveItem };

export interface SortableRenderState {
    /** The grip button that starts a drag. Place it anywhere in the row. */
    handle: React.ReactNode;
    /** True for the floating copy under the pointer while a drag is live. */
    dragging: boolean;
    /** The item's current index in `items`. */
    index: number;
}

export interface SortableListProps<T> {
    items: readonly T[];
    /**
     * Unique id per item within this list. Prefer a stable id; for a list of plain strings that may repeat
     * (choices being typed), return `String(index)` - ids only need to hold still for the length of one drag.
     */
    getId: (item: T, index: number) => string;
    /** Fired ONCE on drop with the reordered array. Not fired for a drop in place or a cancelled drag. */
    onReorder: (next: T[], move: { from: number; to: number }) => void;
    renderItem: (item: T, state: SortableRenderState) => React.ReactNode;
    /** Turn dragging off for the whole list (e.g. while saving). Handles render disabled. */
    disabled?: boolean;
    /** Turn dragging off for one item. */
    isItemDisabled?: (item: T) => boolean;
    /** Class for the list wrapper (spacing between rows goes here, e.g. `space-y-2`). */
    className?: string;
    /** Class for each row wrapper. */
    itemClassName?: string;
    /**
     * Let a pointer drag start anywhere on the row, not just the grip - presses on inputs, textareas, selects,
     * buttons, links, switches and editable text are ignored so they keep working. Keyboard still goes through the grip.
     */
    rowDrag?: boolean;
    /** Accessible label for each handle. Defaults to "Drag to reorder". */
    handleLabel?: (item: T) => string;
}

/** Presses that land on these never start a whole-row drag (the grip is a button but carries its own listeners). */
const INTERACTIVE =
    'input, textarea, select, button, a, label, [role="switch"], [role="combobox"], [role="checkbox"], [role="slider"], [contenteditable="true"], [data-no-drag]';

/** Keep the floating copy on the vertical axis - this is a vertical list. */
const restrictToVertical: Modifier = ({ transform }) => ({ ...transform, x: 0 });

export function SortableList<T>({
    items,
    getId,
    onReorder,
    renderItem,
    disabled = false,
    isItemDisabled,
    className,
    itemClassName,
    rowDrag = false,
    handleLabel,
}: SortableListProps<T>) {
    const sensors = useSensors(
        // A small distance so a click on the handle is not a drag.
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor),
    );
    // dnd-kit numbers its accessibility ids from a module counter, which differs between the server render and the
    // browser when a page holds several lists (Page copy mounts eight) - a hydration mismatch. A useId is the same on both.
    const dndId = React.useId();
    const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);
    const [overId, setOverId] = React.useState<UniqueIdentifier | null>(null);

    const ids = React.useMemo(() => items.map((item, i) => getId(item, i)), [items, getId]);
    const activeIndex = activeId == null ? -1 : ids.indexOf(String(activeId));
    const overIndex = overId == null ? -1 : ids.indexOf(String(overId));
    const activeItem = activeIndex >= 0 ? items[activeIndex] : undefined;

    const reset = () => {
        setActiveId(null);
        setOverId(null);
    };

    const handleStart = (e: DragStartEvent) => {
        setActiveId(e.active.id);
        setOverId(e.active.id);
    };

    const handleEnd = (e: DragEndEvent) => {
        const from = ids.indexOf(String(e.active.id));
        const to = e.over ? ids.indexOf(String(e.over.id)) : -1;
        reset();
        if (from < 0 || to < 0 || from === to) return;
        onReorder(moveItem(items, from, to), { from, to });
    };

    return (
        <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVertical]}
            onDragStart={handleStart}
            onDragOver={(e) => setOverId(e.over?.id ?? null)}
            onDragEnd={handleEnd}
            onDragCancel={reset}
        >
            <div className={className}>
                {items.map((item, index) => {
                    const id = ids[index] as string;
                    // Where the dragged item would land: a hairline above the target when moving up,
                    // below it when moving down.
                    const indicator =
                        activeIndex >= 0 && overIndex === index && overIndex !== activeIndex
                            ? overIndex < activeIndex
                                ? 'before'
                                : 'after'
                            : null;
                    return (
                        <SortableRow
                            key={id}
                            id={id}
                            index={index}
                            disabled={disabled || (isItemDisabled?.(item) ?? false)}
                            indicator={indicator}
                            className={itemClassName}
                            rowDrag={rowDrag}
                            label={handleLabel?.(item) ?? 'Drag to reorder'}
                        >
                            {(handle) => renderItem(item, { handle, dragging: false, index })}
                        </SortableRow>
                    );
                })}
            </div>
            <DragOverlay dropAnimation={null}>
                {activeItem !== undefined ? (
                    <div inert className="cursor-grabbing rounded-lg bg-white shadow-lg ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-700">
                        {renderItem(activeItem, {
                            handle: <HandleGlyph />,
                            dragging: true,
                            index: activeIndex,
                        })}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

function SortableRow({
    id,
    index,
    disabled,
    indicator,
    className,
    rowDrag,
    label,
    children,
}: {
    rowDrag: boolean;
    id: string;
    index: number;
    disabled: boolean;
    indicator: 'before' | 'after' | null;
    className?: string;
    label: string;
    children: (handle: React.ReactNode) => React.ReactNode;
}) {
    const drag = useDraggable({ id, disabled, data: { index } });
    const drop = useDroppable({ id, disabled: false, data: { index } });

    const setRef = React.useCallback(
        (node: HTMLDivElement | null) => {
            drag.setNodeRef(node);
            drop.setNodeRef(node);
        },
        [drag.setNodeRef, drop.setNodeRef],
    );

    const handle = (
        <button
            type="button"
            ref={drag.setActivatorNodeRef}
            {...drag.attributes}
            {...drag.listeners}
            aria-label={label}
            disabled={disabled}
            className={cn(
                'inline-flex h-7 w-5 shrink-0 touch-none items-center justify-center rounded text-neutral-400 transition-colors',
                'hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
                disabled ? 'cursor-not-allowed opacity-40' : 'cursor-grab active:cursor-grabbing',
            )}
        >
            <GripVertical className="h-4 w-4" aria-hidden />
        </button>
    );

    // Whole-row drag: forward the pointer press to dnd-kit unless it landed on something interactive.
    const rowPointerDown = rowDrag && !disabled
        ? (e: React.PointerEvent<HTMLDivElement>) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest(INTERACTIVE)) return;
            drag.listeners?.onPointerDown?.(e);
        }
        : undefined;

    return (
        <div
            ref={setRef}
            onPointerDown={rowPointerDown}
            className={cn('relative', rowDrag && !disabled && 'cursor-grab', drag.isDragging && 'opacity-40', className)}
        >
            {indicator === 'before' && (
                <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-1 h-0.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
            )}
            {children(handle)}
            {indicator === 'after' && (
                <span aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
            )}
        </div>
    );
}

/** The grip as drawn on the floating copy (not interactive). */
function HandleGlyph() {
    return (
        <span className="inline-flex h-7 w-5 shrink-0 items-center justify-center text-neutral-500">
            <GripVertical className="h-4 w-4" aria-hidden />
        </span>
    );
}

/**
 * Move one entry of a list from `from` to `to`, returning a NEW array (the input is never mutated).
 * `to` is the index the item ends up at in the result. Out-of-range or equal indices return a copy
 * unchanged, so a drop outside the list or onto itself is a harmless no-op.
 *
 * The one reorder helper behind `SortableList` (@repo/ui/components/sortable-list) - every list that
 * used to swap neighbours with up/down buttons now moves through this.
 */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
    const next = list.slice();
    if (
        from === to ||
        !Number.isInteger(from) ||
        !Number.isInteger(to) ||
        from < 0 ||
        to < 0 ||
        from >= list.length ||
        to >= list.length
    ) {
        return next;
    }
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item as T);
    return next;
}

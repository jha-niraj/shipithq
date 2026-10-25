'use client';

/**
 * The drag-and-drop library this repo ships, re-exported for apps (question-paper-fold 3.2: the Paper panel's groups
 * are drag only). `@dnd-kit/core` is a dependency of @repo/ui alone - apps import it through here, so there is one
 * copy and no app lists it. The keyboard sensor comes with it: Space picks an item up, arrows move it, Space drops.
 */
export {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    pointerWithin,
    rectIntersection,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type CollisionDetection,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';

"use client";

import { AIGlyph } from "@repo/ui/components/ui/ai-mark";
import { cn } from "@repo/ui/lib/utils";
import { useAIPanelStore } from "@/app/store/aiPanelStore";

/**
 * Floating launcher for the AI panel. Hides itself while the panel is open -
 * the panel has its own close button, so a second control in the same corner
 * would just be a target the panel is already covering.
 */
export function AITriggerButton({ className }: { className?: string }) {
	const { isOpen, open } = useAIPanelStore();

	if (isOpen) return null;

	return (
		<button
			type="button"
			onClick={open}
			aria-label="Open ShipItHQ AI"
			className={cn(
				"fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full",
				"bg-neutral-900 dark:bg-white px-4 py-3 text-sm font-semibold text-white dark:text-neutral-900 shadow-lg",
				"transition-all hover:bg-neutral-800 hover:shadow-xl active:scale-95 cursor-pointer",
				className,
			)}
		>
			<AIGlyph size={16} />
			<span className="hidden sm:inline">Ask AI</span>
		</button>
	);
}

export default AITriggerButton;

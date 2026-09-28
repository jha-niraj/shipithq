"use client";
import Link from "next/link";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StudioViewer } from "./viewer/studio-viewer";
import { AIInputPanel } from "./ui/ai-input-panel";
import { Button } from "@repo/ui/components/ui/button";
import { ConfirmDialog } from "@repo/ui/components/ui/confirm-dialog";
import {
	ArrowLeft, MoreVertical, Trash2
} from "lucide-react";
import {
	DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
	DropdownMenuSeparator
} from "@repo/ui/components/ui/dropdown-menu";
import { deleteStudio } from "@/actions/(main)/studios/studio.actions";
import toast from "@repo/ui/components/ui/sonner";
import type { StudioWithSteps } from "@/types/studios";
import { useStudioStore } from "@/app/store/studioStore";

interface StudioContainerProps {
	studio: StudioWithSteps;
	backUrl?: string;
	backLabel?: string;
}

export function StudioContainer({
	studio,
	backUrl = "/studio",
}: StudioContainerProps) {
	const router = useRouter();
	const [confirmDelete, setConfirmDelete] = useState(false);

	// Initialize the Zustand store with the studio data
	const initialize = useStudioStore((s) => s.initialize);
	const storeStudio = useStudioStore((s) => s.studio);

	useEffect(() => {
		initialize(studio);
	}, [studio, initialize]);

	const displayStudio = storeStudio || studio;

	const handleDelete = async () => {
		const result = await deleteStudio(displayStudio.id);
		if (result.success) {
			toast.success("Studio deleted");
			router.push(backUrl);
		} else {
			toast.error(result.error || "Failed to delete studio");
		}
	};

	const getSourceLabel = () => {
		switch (displayStudio.source) {
			case "PATHFINDER":
				return "From Pathfinder Goal";
			case "SPACE":
				return "From Learning Space";
			default:
				return "Personal Studio";
		}
	};

	return (
		<div className="flex flex-col h-dvh bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
			{/* Header */}
			<div className="flex-shrink-0 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
				<div className="max-w-4xl mx-auto px-6 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<Button variant="ghost" size="icon" className="shrink-0" asChild><Link href={backUrl}>
								<ArrowLeft className="h-4 w-4" />
							</Link></Button>

							<div>
								<div className="flex items-center gap-3">
									{displayStudio.emoji && (
										<span className="text-2xl">{displayStudio.emoji}</span>
									)}
									<h1 className="text-xl font-bold text-neutral-900 dark:text-white">
										{displayStudio.title}
									</h1>
								</div>
								{displayStudio.description && (
									<p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
										{displayStudio.description}
									</p>
								)}
								<div className="flex items-center gap-2 mt-2">
									<span className="text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900/30 text-neutral-700 dark:text-neutral-100">
										{getSourceLabel()}
									</span>
									<span className="text-xs text-neutral-500 dark:text-neutral-400">
										{displayStudio.stepCount} {displayStudio.stepCount === 1 ? "step" : "steps"}
									</span>
								</div>
							</div>
						</div>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon">
									<MoreVertical className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => toast.info("Settings coming soon")}>
									Settings
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() => setConfirmDelete(true)}
									className="text-red-600 dark:text-red-400"
								>
									<Trash2 className="h-4 w-4 mr-2" />
									Delete Studio
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<ConfirmDialog
							open={confirmDelete}
							onOpenChange={setConfirmDelete}
							title="Delete this studio?"
							description="The studio and all its steps are deleted. This cannot be undone."
							confirmLabel="Delete studio"
							tone="danger"
							onConfirm={handleDelete}
						/>
					</div>
				</div>
			</div>

			{/* Content viewer */}
			<div className="flex-1 overflow-hidden">
				<StudioViewer studio={displayStudio} className="h-full" />
			</div>

			{/* AI Input Panel */}
			<div className="flex-shrink-0">
				<AIInputPanel studioId={displayStudio.id} />
			</div>
		</div>
	);
}

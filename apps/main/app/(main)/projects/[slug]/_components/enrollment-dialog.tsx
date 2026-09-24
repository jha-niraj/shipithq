"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
	DialogTitle
} from "@repo/ui/components/ui/dialog";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { ENROLL_CREDIT_COST } from "@/lib/credits/pricing";
import {
	CheckCircle2, Coins, FileCode, ListChecks, Sparkles, AlertCircle, PartyPopper
} from "lucide-react";
import { enrollInProject } from "@/actions/(main)/projects/project.action";
import toast from "@repo/ui/components/ui/sonner";
import { InlineLoader } from "@repo/ui/components/ui/inline-loader"

interface EnrollmentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projectId: string;
	projectTitle: string;
	projectSlug?: string;
	tasksCount: number;
	userCredits: number;
	/** A platform-seeded project costs nothing to start (plan/projects, PJ-11). */
	isFree?: boolean;
}

type EnrollmentStep = "confirm" | "processing" | "success" | "error";

export function EnrollmentDialog({
	open,
	onOpenChange,
	projectId,
	projectTitle,
	projectSlug,
	tasksCount,
	userCredits,
	isFree = false,
}: EnrollmentDialogProps) {
	const router = useRouter();
	const [step, setStep] = useState<EnrollmentStep>("confirm");
	const [error, setError] = useState<string>("");
	interface EnrollmentData {
		projectTitle: string;
		tasksCount: number;
		creditsSpent: number;
	}

	const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
	const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Where "Start Building" goes. Enrolling makes a COPY with its own slug
	// (PJ-18), so this is replaced by the copy's slug once the server returns it.
	// A ref, because `goToBoard` also runs from the timer below.
	const boardSlug = useRef<string | undefined>(projectSlug);
	useEffect(() => () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); }, []);

	// The server decides the price (`enrollInProject`), and a platform-seeded
	// project is free. This reads the same constant so the dialog and the ledger
	// cannot disagree - it was the literal 13, in three separate files.
	const enrollmentCost = isFree ? 0 : ENROLL_CREDIT_COST;
	const canAfford = userCredits >= enrollmentCost;

	const handleEnroll = async () => {
		if (!canAfford) {
			toast.error("Insufficient credits");
			return;
		}

		setStep("processing");
		setError("");

		try {
			const result = await enrollInProject(projectId);

			if (result.success) {
				boardSlug.current = result.data?.projectSlug ?? projectSlug;
				setEnrollmentData(result.data);
				setStep("success");
				toast.success("Successfully enrolled in project!");

				// Auto-advance, unless they press the button first. Tracked so it
				// can be cleared: it used to fire into an unmounted dialog if the
				// user navigated away inside the three seconds.
				redirectTimer.current = setTimeout(goToBoard, 2500);
			} else if (result.data?.projectSlug) {
				// They already have a copy: take them to it rather than failing.
				boardSlug.current = result.data.projectSlug;
				toast.info("You already have a copy of this project.");
				goToBoard();
			} else {
				setError(result.error || "Failed to enroll");
				setStep("error");
				toast.error(result.error || "Failed to enroll");
			}
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
			setError(errorMessage);
			setStep("error");
			toast.error("An unexpected error occurred");
		}
	};

	/*
	 * Enrolling has to LAND somewhere.
	 *
	 * "Start Building" closed the dialog and called `router.refresh()`, and the
	 * copy above it said "Redirecting you to the project" - so the one thing it
	 * promised was the one thing it did not do. Niraj, 2026-09-23: "nothing
	 * happened when I enroll and then clicked on build, it should have taken me
	 * to the sprints and tasks page".
	 *
	 * `projectSlug` was declared in the props and never destructured, which is
	 * why there was nothing to navigate to.
	 */
	const goToBoard = () => {
		onOpenChange(false);
		if (boardSlug.current) router.push(`/projects/${boardSlug.current}/workspace`);
		else router.refresh();
	};

	const handleClose = () => {
		if (step === "processing") return; // Don't allow closing during processing
		onOpenChange(false);
		setTimeout(() => {
			setStep("confirm");
			setError("");
			setEnrollmentData(null);
		}, 300);
	};

	const handleRetry = () => {
		setStep("confirm");
		setError("");
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[500px]">
				{
					step === "confirm" && (
						<>
							<DialogHeader>
								<DialogTitle className="flex items-center gap-2 text-2xl">
									<Sparkles className="h-6 w-6 text-neutral-900 dark:text-neutral-100" />
									Enroll in Project
								</DialogTitle>
								<DialogDescription>
									Get instant access to this project and start building
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4 py-4">
								<div className="rounded-lg border bg-muted/50 p-4">
									<h4 className="font-semibold text-lg mb-2">{projectTitle}</h4>
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<ListChecks className="h-4 w-4" />
										<span>{tasksCount} tasks included</span>
									</div>
								</div>
								<div className="space-y-2">
									<h4 className="font-semibold flex items-center gap-2">
										<CheckCircle2 className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
										What you&apos;ll get:
									</h4>
									<ul className="space-y-2 text-sm text-muted-foreground ml-6">
										<li className="flex items-start gap-2">
											<FileCode className="h-4 w-4 mt-0.5 text-neutral-900 dark:text-neutral-100" />
											<span>Every sprint and task, ready to start</span>
										</li>
										<li className="flex items-start gap-2">
											<ListChecks className="h-4 w-4 mt-0.5 text-neutral-900 dark:text-neutral-100" />
											<span>Progress tracking for each task</span>
										</li>
										<li className="flex items-start gap-2">
											<Sparkles className="h-4 w-4 mt-0.5 text-neutral-900 dark:text-neutral-100" />
											<span>A resource library and an error log for the project</span>
										</li>
										<li className="flex items-start gap-2">
											<CheckCircle2 className="h-4 w-4 mt-0.5 text-neutral-900 dark:text-neutral-100" />
											<span>Lifetime access to project updates</span>
										</li>
									</ul>
								</div>
								<div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Coins className="h-5 w-5 text-neutral-900 dark:text-neutral-100" />
											<span className="font-semibold">Enrollment Cost</span>
										</div>
										<Badge variant="secondary" className="text-lg font-bold">
											{enrollmentCost} Credits
										</Badge>
									</div>
									<div className="mt-2 text-sm text-muted-foreground">
										Your balance: {userCredits} credits
										{
											!canAfford && (
												<span className="text-destructive ml-2">
													(Insufficient credits)
												</span>
											)
										}
									</div>
								</div>
								{
									!canAfford && (
										<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 flex items-start gap-2">
											<AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
											<div className="text-sm">
												<p className="font-semibold text-destructive">
													Insufficient Credits
												</p>
												<p className="text-muted-foreground">
													You need {enrollmentCost - userCredits} more credits to enroll.
												</p>
											</div>
										</div>
									)
								}
							</div>
							<DialogFooter>
								<Button variant="outline" onClick={handleClose}>
									Cancel
								</Button>
								<Button
									onClick={handleEnroll}
									disabled={!canAfford}
									className="gap-2"
								>
									<Coins className="h-4 w-4" />
									Enroll Now
								</Button>
							</DialogFooter>
						</>
					)
				}
				{
					step === "processing" && (
						<>
							<DialogHeader>
								<DialogTitle className="text-center">Processing Enrollment</DialogTitle>
							</DialogHeader>
							<div className="py-12 flex flex-col items-center justify-center space-y-6">
								<div className="relative">
									<div className="absolute inset-0 flex items-center justify-center">
										<div className="h-24 w-24 rounded-full bg-primary/20 animate-ping" />
									</div>
									<div className="absolute inset-0 flex items-center justify-center">
										<div className="h-20 w-20 rounded-full bg-primary/30 animate-pulse" />
									</div>
									<div className="relative flex items-center justify-center h-24 w-24">
										<Sparkles className="h-12 w-12 text-primary animate-pulse" />
									</div>
								</div>
								<div className="text-center space-y-2">
									<p className="font-semibold text-lg">Setting up your project...</p>
									<div className="space-y-1 text-sm text-muted-foreground">
										{/* divs, not p: the loader is a div, and a div inside a p is invalid HTML (a hydration error). */}
										<div className="flex items-center justify-center gap-2">
											<InlineLoader size="sm" />
											Creating your workspace
										</div>
										<div className="flex items-center justify-center gap-2">
											<InlineLoader size="sm" />
											Initializing {tasksCount} tasks
										</div>
										{enrollmentCost > 0 && (
											<div className="flex items-center justify-center gap-2">
												<InlineLoader size="sm" />
												Processing payment
											</div>
										)}
									</div>
								</div>
							</div>
						</>
					)
				}
				{
					step === "success" && (
						<>
							<DialogHeader>
								<DialogTitle className="text-center text-2xl flex items-center justify-center gap-2">
									<PartyPopper className="h-6 w-6 text-neutral-900 dark:text-neutral-100" />
									Enrollment Successful!
								</DialogTitle>
							</DialogHeader>
							<div className="py-8 flex flex-col items-center justify-center space-y-6">
								<div className="relative">
									<div className="h-24 w-24 rounded-full bg-neutral-900/20 flex items-center justify-center">
										<CheckCircle2 className="h-16 w-16 text-neutral-900 dark:text-neutral-100 animate-pulse" />
									</div>
									<div className="absolute -top-2 -right-2">
										<Sparkles className="h-8 w-8 text-neutral-900 dark:text-neutral-100 animate-bounce" />
									</div>
								</div>
								<div className="text-center space-y-2">
									<p className="font-semibold text-lg">
										Welcome to {enrollmentData?.projectTitle}!
									</p>
									<p className="text-muted-foreground">
										You&apos;ve successfully enrolled in the project
									</p>
								</div>
								<div className="grid grid-cols-2 gap-4 w-full">
									<div className="rounded-lg border bg-muted/50 p-3 text-center">
										<div className="text-2xl font-bold text-primary">
											{enrollmentData?.tasksCount}
										</div>
										<div className="text-xs text-muted-foreground">Tasks Ready</div>
									</div>
									<div className="rounded-lg border bg-muted/50 p-3 text-center">
										<div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
											-{enrollmentData?.creditsSpent}
										</div>
										<div className="text-xs text-muted-foreground">Credits Used</div>
									</div>
								</div>
								<p className="text-sm text-muted-foreground text-center">
									Taking you to the sprint board...
								</p>
							</div>
							<DialogFooter className="sm:justify-center">
								<Button onClick={goToBoard} className="gap-2">
									<CheckCircle2 className="h-4 w-4" />
									Start Building
								</Button>
							</DialogFooter>
						</>
					)
				}
				{
					step === "error" && (
						<>
							<DialogHeader>
								<DialogTitle className="text-center text-destructive flex items-center justify-center gap-2">
									<AlertCircle className="h-5 w-5" />
									Enrollment Failed
								</DialogTitle>
							</DialogHeader>
							<div className="py-8 flex flex-col items-center justify-center space-y-6">
								<div className="h-24 w-24 rounded-full bg-destructive/20 flex items-center justify-center">
									<AlertCircle className="h-16 w-16 text-destructive" />
								</div>

								<div className="text-center space-y-2">
									<p className="font-semibold">Something went wrong</p>
									<p className="text-sm text-muted-foreground">{error}</p>
								</div>
							</div>
							<DialogFooter className="sm:justify-center gap-2">
								<Button variant="outline" onClick={handleClose}>
									Cancel
								</Button>
								<Button onClick={handleRetry} className="gap-2">
									Try Again
								</Button>
							</DialogFooter>
						</>
					)
				}
			</DialogContent>
		</Dialog>
	);
}
"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";

import { Button } from "./button";
import { Calendar } from "./calendar";
import { CALENDAR_SURFACE } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "../../lib/utils";

export type DatePickerProps = {
	/** `YYYY-MM-DD`. `null` (kept for shipithq apps) reads as empty. */
	value?: string | null;
	/**
	 * Emits `YYYY-MM-DD`. Method syntax on purpose (kept for shipithq apps): it receives `undefined` only when
	 * `clearable` is set and the X is pressed, and a caller written as `(value: string) => void` still fits.
	 */
	onChange(value: string | undefined): void;
	placeholder?: string;
	id?: string;
	className?: string;
	disabled?: boolean;
	minDate?: string;
	maxDate?: string;
	/** Kept for shipithq apps - alias of `minDate`. */
	min?: string;
	/** Kept for shipithq apps - alias of `maxDate`. */
	max?: string;
	/** Kept for shipithq apps - shows a clear button once there is a value; clearing emits `undefined`. */
	clearable?: boolean;
	/** Kept for shipithq apps. */
	"aria-label"?: string;
};

/** Kept for shipithq apps: `YYYY-MM-DD` (anything after it is ignored) -> a LOCAL Date at midnight, or undefined. */
export function parseLocalDate(value: string | undefined | null): Date | undefined {
	if (!value) return undefined;
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
	if (!m) return undefined;
	const year = Number(m[1]);
	const month = Number(m[2]) - 1;
	const day = Number(m[3]);
	if (month < 0 || month > 11 || day < 1 || day > 31) return undefined;
	const d = new Date(year, month, day);
	// 2026-02-31 rolls over into March; that is not the date that was written.
	if (d.getMonth() !== month) return undefined;
	return d;
}

/** Kept for shipithq apps: a local Date -> `YYYY-MM-DD`, from local parts (never `toISOString()`). */
export function formatLocalDate(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Kept for shipithq apps: the trigger look ShipItHQ's picker family shares (height and border of a form field). */
export const pickerTriggerClass = cn(
	"flex h-10 w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-3 text-left text-sm",
	"border-neutral-200 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100",
	"transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800",
	"focus-visible:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:focus-visible:border-neutral-500",
	"data-[state=open]:border-neutral-400 dark:data-[state=open]:border-neutral-500",
	"disabled:cursor-not-allowed disabled:opacity-50",
);

function parseDateValue(value?: string | null): Date | undefined {
	if (!value) return undefined;
	const [year, month, day] = value.split("-").map(Number);
	if (!year || !month || !day) return undefined;
	return new Date(year, month - 1, day);
}

function toDateValue(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function formatDisplay(date?: Date): string {
	if (!date) return "";
	return date.toLocaleDateString("en-NP", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function DatePicker({
	value,
	onChange,
	placeholder = "Pick a date",
	id,
	className,
	disabled,
	minDate,
	maxDate,
	min: minAlias,
	max: maxAlias,
	clearable = false,
	"aria-label": ariaLabel,
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false);
	const selectedDate = parseDateValue(value);
	const min = parseDateValue(minDate ?? minAlias);
	const max = parseDateValue(maxDate ?? maxAlias);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					type="button"
					variant="outline"
					disabled={disabled}
					aria-label={ariaLabel}
					className={cn(
						"w-full justify-start text-left font-normal",
						!selectedDate && "text-muted-foreground",
						className
					)}
				>
					<CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
					<span className="min-w-0 flex-1 truncate">{selectedDate ? formatDisplay(selectedDate) : placeholder}</span>
					{clearable && selectedDate && !disabled && (
						// Kept for shipithq apps. A span, not a nested button: a button inside a button is invalid HTML.
						<span
							role="button"
							tabIndex={0}
							aria-label="Clear date"
							className="shrink-0 cursor-pointer rounded p-0.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onChange(undefined);
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
									onChange(undefined);
								}
							}}
						>
							<X className="h-3.5 w-3.5" />
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className={CALENDAR_SURFACE} align="start">
				<Calendar
					mode="single"
					selected={selectedDate}
					onSelect={(date) => {
						if (!date) return;
						onChange(toDateValue(date));
						setOpen(false);
					}}
					disabled={(date) => {
						if (min && date < min) return true;
						if (max && date > max) return true;
						return false;
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}

export { DatePicker };

"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Clock } from "lucide-react";
import { cn } from "../../lib/utils";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./popover";
import { ScrollArea } from "./scroll-area";

/**
 * The app's time picker, rebuilt on the ReUI time-picker behaviour (reui.io/components/time-picker, 2026-10-23):
 * a segmented field you can TYPE into (hh : mm am/pm, each segment a spinbutton - digits, ArrowUp/Down, a/p,
 * ArrowLeft/Right between segments, Backspace clears when `clearable`), plus a clock button opening a popover with
 * optional quick times, hour / minute / am-pm columns, and Now / Clear / Done. Replaces the browser's native time
 * input, which looks different in every browser (Niraj, 2026-10-20).
 *
 * VALUE contract is the native input's: 24h "HH:mm", "" when unset - so a caller swaps
 * `<input type="time" value onChange={e => set(e.target.value)}>` for `<TimePicker value onChange={set}>` without
 * changing what it stores. The LABEL is 12h ("11:59 pm") by default, as the school reads it; `hourCycle={24}` for
 * a 24h display. A stored value off the minute step or outside min/max is shown as is and never rewritten until
 * someone edits it; edits (typing, arrows, picks, Now) snap to the step and clamp into min/max.
 */

export type TimePickerProps = {
	/** 24h "HH:mm", or "" when unset. `null` (kept for shipithq apps) reads as unset. */
	value?: string | null;
	onChange: (value: string) => void;
	/** Goes on the clock button, so a `<Label htmlFor>` points at a real control. */
	id?: string;
	disabled?: boolean;
	className?: string;
	placeholder?: string;
	/** Minutes between steps (minute column, arrows, typing). Default 1; 5 or 15 for coarser fields. */
	minuteStep?: number;
	/** Show a "Clear" action (and Backspace in the field) that emits "". */
	clearable?: boolean;
	/** Earliest allowed time, 24h "HH:mm" (inclusive). */
	min?: string;
	/** Latest allowed time, 24h "HH:mm" (inclusive). */
	max?: string;
	/** 24h "HH:mm" values offered as one-press chips at the top of the popover. */
	quickTimes?: string[];
	/** Display only - the value is always 24h. Default 12. */
	hourCycle?: 12 | 24;
	/** Show the "Now" button in the popover. Default true. */
	showNow?: boolean;
	/** Kept for shipithq apps - alias of `minuteStep`. */
	step?: number;
	"aria-label"?: string;
};

type Seg = "hour" | "minute" | "period";

const DAY = 24 * 60;

/** "HH:mm" -> minutes since midnight, or null. */
function toMinutes(value?: string | null): number | null {
	const m = /^(\d{1,2}):(\d{2})/.exec(value ?? "");
	if (!m) return null;
	const h = Number(m[1]);
	const mi = Number(m[2]);
	if (h > 23 || mi > 59) return null;
	return h * 60 + mi;
}

function fromMinutes(t: number): string {
	const n = ((t % DAY) + DAY) % DAY;
	return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}

function h12Of(h24: number): number {
	return h24 % 12 === 0 ? 12 : h24 % 12;
}

/** Kept for shipithq apps: "9:30 am", "12:00 pm"; a value that is not a time comes back as is. */
export function formatTimeLabel(value: string): string {
	return toMinutes(value) === null ? value : formatTime12(value);
}

/** "23:59" -> "11:59 pm". */
export function formatTime12(value?: string | null): string {
	const t = toMinutes(value);
	if (t === null) return "";
	const h = Math.floor(t / 60);
	return `${h12Of(h)}:${String(t % 60).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
}

/**
 * The half of the day an hour typed into an EMPTY field means, for a school: 6-11 morning, 12-5 afternoon.
 * Without it typing "2" would land on 2 am.
 */
function inferPm(h12: number): boolean {
	return h12 === 12 || h12 < 6;
}

function Column<T extends string | number>({
	label, items, selected, render, onPick, isDisabled,
}: {
	label: string;
	items: T[];
	selected: T | null;
	render: (v: T) => string;
	onPick: (v: T) => void;
	isDisabled?: (v: T) => boolean;
}) {
	const listRef = useRef<HTMLDivElement>(null);

	// Bring the chosen item into view when the popover opens.
	useEffect(() => {
		const el = listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
		el?.scrollIntoView({ block: "center" });
	}, []);

	const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
		const last = items.length - 1;
		const next =
			e.key === "ArrowDown" ? i + 1
				: e.key === "ArrowUp" ? i - 1
					: e.key === "Home" ? 0
						: e.key === "End" ? last
							: null;
		if (next === null) return;
		e.preventDefault();
		const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("button");
		buttons?.[Math.max(0, Math.min(last, next))]?.focus();
	};

	return (
		<div className="flex min-w-0 flex-1 flex-col">
			<span className="px-1 pb-1 text-center text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">{label}</span>
			<ScrollArea className="h-[208px]">
				<div ref={listRef} role="listbox" aria-label={label} className="flex flex-col gap-0.5 p-0.5">
					{items.map((v, i) => {
						const on = v === selected;
						const off = isDisabled?.(v) ?? false;
						return (
							<button
								key={String(v)}
								type="button"
								role="option"
								aria-selected={on}
								aria-disabled={off || undefined}
								disabled={off}
								onClick={() => onPick(v)}
								onKeyDown={(e) => onKey(e, i)}
								className={cn(
									"h-8 shrink-0 rounded-lg text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 disabled:cursor-not-allowed disabled:opacity-35",
									on
										? "bg-neutral-900 font-semibold text-white dark:bg-white dark:text-neutral-900"
										: "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
								)}
							>
								{render(v)}
							</button>
						);
					})}
				</div>
			</ScrollArea>
		</div>
	);
}

export function TimePicker({
	value, onChange, id, disabled, className, placeholder = "Pick a time", minuteStep: minuteStepProp, clearable,
	min, max, quickTimes, hourCycle = 12, showNow = true, step: stepAlias, ...rest
}: TimePickerProps) {
	const minuteStep = minuteStepProp ?? stepAlias ?? 1;
	const [open, setOpen] = useState(false);
	const segRefs = useRef<Record<Seg, HTMLSpanElement | null>>({ hour: null, minute: null, period: null });
	const typed = useRef<{ seg: Seg | null; text: string; at: number }>({ seg: null, text: "", at: 0 });

	const is12 = hourCycle !== 24;
	const current = toMinutes(value);
	const hour24 = current === null ? null : Math.floor(current / 60);
	const minute = current === null ? null : current % 60;
	const pm = hour24 === null ? null : hour24 >= 12;

	const step = minuteStep > 0 && minuteStep <= 30 ? Math.floor(minuteStep) : 1;
	const lo = toMinutes(min) ?? 0;
	const hi = toMinutes(max) ?? DAY - 1;
	const inRange = (t: number) => t >= lo && t <= hi;
	const clamp = (t: number) => Math.min(hi, Math.max(lo, t));
	const snap = (t: number) => Math.floor(t / 60) * 60 + Math.floor((t % 60) / step) * step;

	const emit = (t: number) => {
		const next = fromMinutes(clamp(((t % DAY) + DAY) % DAY));
		if (next !== value) onChange(next);
	};

	// ---- columns ----------------------------------------------------------------------------------------------
	const hours = is12 ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 24 }, (_, i) => i);
	const minutes = Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step);
	// An off-step stored minute (09:47 with a 5-minute step) must still show as chosen, so it is merged in.
	if (minute !== null && !minutes.includes(minute)) {
		minutes.push(minute);
		minutes.sort((a, b) => a - b);
	}

	/** The 24h hour a column pick of `h` means, keeping the current half of the day. */
	const hourFromPick = (h: number, keepPm: boolean | null): number => {
		if (!is12) return h;
		const isPm = keepPm ?? inferPm(h);
		return (h % 12) + (isPm ? 12 : 0);
	};
	const hourAllowed = (h24: number) => h24 * 60 + 59 >= lo && h24 * 60 <= hi;

	const pickHour = (h: number) => emit(hourFromPick(h, pm) * 60 + (minute ?? 0));
	const pickMinute = (m: number) => emit((hour24 ?? 9) * 60 + m);
	const pickPeriod = (p: "am" | "pm") => {
		const h = hour24 ?? 9;
		emit(((h % 12) + (p === "pm" ? 12 : 0)) * 60 + (minute ?? 0));
	};
	const pickNow = () => {
		const d = new Date();
		emit(snap(d.getHours() * 60 + d.getMinutes()));
	};

	// ---- segments ---------------------------------------------------------------------------------------------
	const segs: Seg[] = is12 ? ["hour", "minute", "period"] : ["hour", "minute"];
	const focusSeg = (s: Seg | undefined) => s && segRefs.current[s]?.focus();
	const moveSeg = (from: Seg, by: 1 | -1) => focusSeg(segs[segs.indexOf(from) + by]);

	const stepBy = (seg: Seg, dir: 1 | -1) => {
		if (current === null) {
			// The first arrow press on an empty field lands on a sensible start: min, else 9:00 am.
			emit(min ? snap(lo) + (lo % step === 0 ? 0 : step) : 9 * 60);
			return;
		}
		if (seg === "hour") return emit(current + dir * 60);
		if (seg === "period") return emit(current + 12 * 60);
		const h = Math.floor(current / 60);
		const m = current % 60;
		if (dir === 1) return emit(h * 60 + (Math.floor(m / step) + 1) * step);
		return emit(m % step !== 0 ? h * 60 + Math.floor(m / step) * step : current - step);
	};

	const typeDigit = (seg: Seg, d: number) => {
		const now = Date.now();
		const buf = typed.current.seg === seg && now - typed.current.at < 1200 ? typed.current.text : "";
		const text = buf + String(d);
		typed.current = { seg, text, at: now };
		const n = Number(text);

		if (seg === "hour") {
			const maxH = is12 ? 12 : 23;
			const waits = text.length === 1 && n * 10 <= maxH; // "1" could become 10-12; "0" could become 01-09
			const h = n > maxH || (is12 && n === 0) ? d : n;
			if (!(is12 && text.length === 1 && n === 0)) {
				const h24 = is12 ? hourFromPick(h === 0 ? 12 : h, pm) : h;
				emit(h24 * 60 + (minute ?? 0));
			}
			if (!waits) {
				typed.current = { seg: null, text: "", at: 0 };
				moveSeg("hour", 1);
			}
			return;
		}
		if (seg === "minute") {
			const m = text.length === 1 ? n : Math.min(59, n);
			const base = hour24 ?? 9;
			emit(base * 60 + Math.floor(m / step) * step);
			if (text.length === 2 || d >= 6) {
				typed.current = { seg: null, text: "", at: 0 };
				if (is12) moveSeg("minute", 1);
			}
		}
	};

	const onSegKey = (seg: Seg) => (e: KeyboardEvent<HTMLSpanElement>) => {
		if (disabled) return;
		const k = e.key;
		if (k === "ArrowUp" || k === "ArrowDown") {
			e.preventDefault();
			if (e.altKey && k === "ArrowDown") return setOpen(true);
			return stepBy(seg, k === "ArrowUp" ? 1 : -1);
		}
		if (k === "ArrowLeft" || k === "ArrowRight") {
			e.preventDefault();
			return moveSeg(seg, k === "ArrowRight" ? 1 : -1);
		}
		if (k === "Enter") {
			e.preventDefault();
			return setOpen(true);
		}
		if (k === "Backspace" || k === "Delete") {
			e.preventDefault();
			typed.current = { seg: null, text: "", at: 0 };
			if (clearable) onChange("");
			return;
		}
		if (k === ":" || k === " " || k === ".") {
			e.preventDefault();
			return moveSeg(seg, 1);
		}
		if (seg === "period") {
			const lower = k.toLowerCase();
			if (lower === "a" || lower === "p") {
				e.preventDefault();
				pickPeriod(lower === "a" ? "am" : "pm");
			}
			return;
		}
		if (/^\d$/.test(k)) {
			e.preventDefault();
			typeDigit(seg, Number(k));
		}
	};

	const hourText = hour24 === null ? "--" : is12 ? String(h12Of(hour24)) : String(hour24).padStart(2, "0");
	const minuteText = minute === null ? "--" : String(minute).padStart(2, "0");
	const periodText = pm === null ? "--" : pm ? "pm" : "am";

	const segment = (seg: Seg, text: string, label: string, now: number | null, minV: number, maxV: number, valueText?: string) => (
		<span
			ref={(el) => { segRefs.current[seg] = el; }}
			role="spinbutton"
			tabIndex={disabled ? -1 : 0}
			aria-label={label}
			aria-valuenow={now ?? undefined}
			aria-valuemin={minV}
			aria-valuemax={maxV}
			aria-valuetext={now === null ? "Empty" : valueText ?? text}
			aria-disabled={disabled || undefined}
			inputMode={seg === "period" ? undefined : "numeric"}
			onKeyDown={onSegKey(seg)}
			onBlur={() => { if (typed.current.seg === seg) typed.current = { seg: null, text: "", at: 0 }; }}
			className={cn(
				"rounded-md px-0.5 tabular-nums caret-transparent outline-none transition-colors focus:bg-amber-100 focus:text-neutral-900 dark:focus:bg-amber-500/25 dark:focus:text-white",
				now === null && "text-muted-foreground",
			)}
		>
			{text}
		</span>
	);

	const onFieldMouseDown = (e: MouseEvent<HTMLDivElement>) => {
		if (disabled) return;
		// A press on the field's padding focuses the hour, as an input would.
		if (e.target === e.currentTarget) {
			e.preventDefault();
			focusSeg("hour");
		}
	};

	const quick = (quickTimes ?? []).filter((q) => {
		const t = toMinutes(q);
		return t !== null && inRange(t);
	});

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverAnchor asChild>
				<div
					role="group"
					aria-label={rest["aria-label"] ?? "Time"}
					title={current === null ? placeholder : formatTime12(value)}
					onMouseDown={onFieldMouseDown}
					className={cn(
						"flex h-10 w-full min-w-0 cursor-text items-center gap-1 rounded-xl border border-input bg-background px-2 text-sm ring-offset-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
						disabled && "pointer-events-none cursor-not-allowed opacity-50",
						className,
					)}
				>
					<PopoverTrigger asChild>
						<button
							id={id}
							type="button"
							disabled={disabled}
							aria-label={`Open time picker${current === null ? "" : `, ${is12 ? formatTime12(value) : value}`}`}
							className="-ml-0.5 grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
						>
							<Clock className="h-4 w-4" />
						</button>
					</PopoverTrigger>
					<span className="flex min-w-0 items-center whitespace-nowrap">
						{segment("hour", hourText, "Hour", hour24 === null ? null : is12 ? h12Of(hour24) : hour24, is12 ? 1 : 0, is12 ? 12 : 23)}
						<span aria-hidden className={cn(current === null && "text-muted-foreground")}>:</span>
						{segment("minute", minuteText, "Minute", minute, 0, 59)}
						{is12 && (
							<>
								<span aria-hidden className="w-1" />
								{segment("period", periodText, "am/pm", pm === null ? null : pm ? 1 : 0, 0, 1)}
							</>
						)}
					</span>
				</div>
			</PopoverAnchor>
			<PopoverContent align="start" className="w-[256px] rounded-2xl p-2" onOpenAutoFocus={(e) => e.preventDefault()}>
				{quick.length > 0 && (
					<div className="mb-2 border-b border-neutral-200 pb-2 dark:border-neutral-800">
						<span className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">Quick</span>
						<div className="mt-1 flex flex-wrap gap-1">
							{quick.map((q) => {
								const on = toMinutes(q) === current;
								return (
									<button
										key={q}
										type="button"
										aria-pressed={on}
										onClick={() => { emit(toMinutes(q) ?? 0); setOpen(false); }}
										className={cn(
											"h-7 rounded-lg px-2 text-xs tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60",
											on
												? "bg-neutral-900 font-semibold text-white dark:bg-white dark:text-neutral-900"
												: "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
										)}
									>
										{is12 ? formatTime12(q) : fromMinutes(toMinutes(q) ?? 0)}
									</button>
								);
							})}
						</div>
					</div>
				)}
				<div className="flex gap-1">
					<Column
						label="Hour"
						items={hours}
						selected={hour24 === null ? null : is12 ? h12Of(hour24) : hour24}
						render={(h) => (is12 ? String(h) : String(h).padStart(2, "0"))}
						onPick={pickHour}
						isDisabled={(h) => !hourAllowed(hourFromPick(h, pm))}
					/>
					<Column
						label="Min"
						items={minutes}
						selected={minute}
						render={(m) => String(m).padStart(2, "0")}
						onPick={pickMinute}
						isDisabled={(m) => hour24 !== null && !inRange(hour24 * 60 + m)}
					/>
					{is12 && (
						<Column
							label="am/pm"
							items={["am", "pm"]}
							selected={pm === null ? null : pm ? "pm" : "am"}
							render={(v) => v}
							onPick={(v) => pickPeriod(v === "pm" ? "pm" : "am")}
							isDisabled={(v) => (v === "am" ? lo > 12 * 60 - 1 : hi < 12 * 60)}
						/>
					)}
				</div>
				<div className="mt-2 flex items-center justify-between gap-2 border-t border-neutral-200 pt-2 dark:border-neutral-800">
					<div className="flex items-center gap-1">
						{showNow && (
							<button
								type="button"
								onClick={pickNow}
								className="rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
							>
								Now
							</button>
						)}
						{clearable && (
							<button
								type="button"
								onClick={() => { onChange(""); setOpen(false); }}
								className="rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
							>
								Clear
							</button>
						)}
					</div>
					<button
						type="button"
						onClick={() => setOpen(false)}
						className="rounded-lg bg-neutral-900 px-3 py-1 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900"
					>
						Done
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

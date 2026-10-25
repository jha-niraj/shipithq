'use client';

import { useState, useMemo } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { CALENDAR_SURFACE } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { ScrollArea } from './scroll-area';
import { cn } from '../../lib/utils';
import {
    getBsPartsFromAd, getAdDateFromBs, getMonthRangeForCalendar, formatSchoolDate,
} from '@repo/calendar';

const BS_MONTHS = [
    'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
    'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const BS_YEAR_MIN = 2000;
const BS_YEAR_MAX = 2100;

function toIso(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function parseIso(value?: string): Date | null {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return null;
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? null : date;
}

interface NepaliCalendarProps {
    selected?: Date | null;
    onSelect: (date: Date) => void;
    minDate?: Date | null;
    maxDate?: Date | null;
}

/** A native Bikram Sambat month grid. Emits the equivalent AD Date on select. */
export function NepaliCalendar({ selected, onSelect, minDate, maxDate }: NepaliCalendarProps) {
    const todayBs = useMemo(() => getBsPartsFromAd(new Date()), []);
    const selectedBs = selected ? getBsPartsFromAd(selected) : null;
    const initial = selectedBs ?? todayBs ?? { year: BS_YEAR_MIN, month: 1, day: 1 };

    const [viewYear, setViewYear] = useState(initial.year);
    const [viewMonth, setViewMonth] = useState(initial.month);

    const range = getMonthRangeForCalendar(viewYear, viewMonth, 'BS');
    const daysInMonth = range?.daysInMonth ?? 30;
    const firstDay = range?.firstDay ?? 0;

    const goPrev = () => {
        if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => Math.max(BS_YEAR_MIN, y - 1)); }
        else setViewMonth((m) => m - 1);
    };
    const goNext = () => {
        if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => Math.min(BS_YEAR_MAX, y + 1)); }
        else setViewMonth((m) => m + 1);
    };

    const years: number[] = [];
    for (let y = BS_YEAR_MIN; y <= BS_YEAR_MAX; y++) years.push(y);

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
        // `max-w` guards a fixed width against a phone that is narrower than the calendar
        // itself - 340px plus the sheet's own padding does not fit inside a 375px viewport, and
        // Radix repositioning cannot rescue a box that is simply wider than the screen it is on.
        // `calc(100vw-2rem)` leaves a 1rem margin on each side; harmless on anything past ~372px,
        // where the real 340px width still applies unchanged.
        <div className="w-[340px] max-w-[calc(100vw-2rem)] p-3">
            {/* Header: month/year selectors + nav */}
            <div className="mb-3 flex items-center justify-between gap-2">
                <button type="button" onClick={goPrev} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 relative after:absolute after:-inset-1 after:content-['']">
                    <ChevronLeft className="h-4 w-4" />
                </button>
                {/* The app's own Select, not a native one.
                    A bare `<select>` renders the OPERATING SYSTEM's menu: it ignores every class
                    on it, so inside this dark popover the list came up as a light-grey OS list
                    with a blue highlight and a tick - and the 101-year list was a single
                    unbounded column running off the screen. The styled Select also gives the
                    dropdown the same rounding, colours and motion as every other menu here. */}
                <div className="flex flex-1 items-center justify-center gap-2">
                    <Select value={String(viewMonth)} onValueChange={(v) => setViewMonth(Number(v))}>
                        <SelectTrigger className="h-9 flex-1 rounded-xl text-sm font-medium">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {BS_MONTHS.map((name, i) => (
                                <SelectItem key={name} value={String(i + 1)} className="cursor-pointer">{name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={String(viewYear)} onValueChange={(v) => setViewYear(Number(v))}>
                        <SelectTrigger className="h-9 w-[92px] shrink-0 rounded-xl text-sm font-medium">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {/* 101 years. ScrollArea rather than the native scrollbar, per the
                                platform rule and matching `examinations/time-field`. */}
                            <ScrollArea className="h-[240px]">
                                {years.map((y) => (
                                    <SelectItem key={y} value={String(y)} className="cursor-pointer">{y}</SelectItem>
                                ))}
                            </ScrollArea>
                        </SelectContent>
                    </Select>
                </div>
                <button type="button" onClick={goNext} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 relative after:absolute after:-inset-1 after:content-['']">
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((w) => (
                    <div key={w} className="flex h-8 items-center justify-center text-[0.8rem] font-medium text-neutral-700 dark:text-neutral-300">{w}</div>
                ))}
            </div>

            {/* Day grid */}
            <div className="mt-1 grid grid-cols-7 gap-1">
                {cells.map((day, idx) => {
                    if (day === null) return <div key={`b-${idx}`} className="h-11" />;
                    const adDate = getAdDateFromBs(viewYear, viewMonth, day);
                    const isSelected = !!selectedBs && selectedBs.year === viewYear && selectedBs.month === viewMonth && selectedBs.day === day;
                    const isToday = !!todayBs && todayBs.year === viewYear && todayBs.month === viewMonth && todayBs.day === day;
                    const disabled = !adDate
                        || (minDate ? adDate < minDate : false)
                        || (maxDate ? adDate > maxDate : false);
                    return (
                        <button
                            key={day}
                            type="button"
                            disabled={disabled}
                            onClick={() => adDate && onSelect(adDate)}
                            className={cn(
                                'flex h-11 items-center justify-center rounded-md text-[0.95rem] transition-colors',
                                isSelected
                                    ? 'bg-neutral-900 font-semibold text-white dark:bg-white dark:text-neutral-900'
                                    : isToday
                                        ? 'bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-white'
                                        : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
                                disabled && 'cursor-not-allowed opacity-30 hover:bg-transparent',
                            )}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

interface NepaliDatePickerProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    id?: string;
    className?: string;
    disabled?: boolean;
    minDate?: string;
    maxDate?: string;
    align?: 'start' | 'center' | 'end';
}

/** BS date picker with the same AD-ISO string contract as the AD DatePicker. */
export function NepaliDatePicker({
    value, onChange, placeholder = 'Pick a date', id, className, disabled, minDate, maxDate, align = 'start',
}: NepaliDatePickerProps) {
    const [open, setOpen] = useState(false);
    const selected = parseIso(value);
    const label = selected ? `${formatSchoolDate(selected, 'BS', { year: 'numeric', month: 'long' })} BS` : placeholder;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={cn('w-full justify-start text-left font-normal', !selected && 'text-muted-foreground', className)}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                    <span className="min-w-0 truncate">{label}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className={CALENDAR_SURFACE} align={align}>
                <NepaliCalendar
                    selected={selected}
                    minDate={parseIso(minDate)}
                    maxDate={parseIso(maxDate)}
                    onSelect={(date) => { onChange(toIso(date)); setOpen(false); }}
                />
            </PopoverContent>
        </Popover>
    );
}

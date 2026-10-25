'use client';

import { Download } from 'lucide-react';
import { Button } from './ui/button';
import { toCsv, csvFilename, type CsvColumn } from '@repo/core/csv';
import { downloadCsv } from '@repo/core/documents';

/**
 * The one Export CSV button.
 *
 * Replaces per-page copies that had drifted apart in every way a copy can: `admin`'s financial and
 * activity buttons were byte-identical for 30 lines, `main`'s were the same code with a different
 * escape helper, and the MIME type disagreed between them. All of them shared the three defects
 * documented in `@repo/core/csv` and `@repo/core/documents` - no BOM (so Nepali names mojibaked in
 * Excel), no formula-injection guard, and an object URL revoked in a race with its own download.
 *
 * Callers now describe their data and nothing else:
 *
 *     <ExportCsvButton
 *         rows={payments}
 *         filenameBase="financial-report"
 *         columns={[
 *             { header: 'School', value: (p) => p.schoolName },
 *             { header: 'Amount (NPR)', value: (p) => p.amountTotal },
 *         ]}
 *         title="Exports the 15 most recent payments shown on this page"
 *     />
 */
export function ExportCsvButton<T>({
    rows,
    columns,
    filenameBase,
    title,
    label = 'Export CSV',
    disabled,
    className,
}: {
    rows: readonly T[];
    columns: readonly CsvColumn<T>[];
    /** `financial-report` becomes `financial-report-2026-08-06.csv`. */
    filenameBase: string;
    /**
     * Native tooltip. Where an export covers only what is on screen, SAY so here - a file that
     * silently contains 15 of 4,000 rows is the "no silent caps" rule in its most damaging form,
     * because the user takes the spreadsheet away and acts on it.
     */
    title?: string;
    label?: string;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCsv(toCsv(rows, columns), csvFilename(filenameBase))}
            // An export button with nothing to export is disabled, never hidden - a control that
            // vanishes reads as a missing feature rather than an empty table.
            disabled={disabled ?? rows.length === 0}
            title={title}
            className={className ? `gap-1.5 ${className}` : 'gap-1.5'}
        >
            <Download className="h-4 w-4" />
            {label}
        </Button>
    );
}

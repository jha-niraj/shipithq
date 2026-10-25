/**
 * Producing a document the user receives: a downloaded file.
 *
 * The browser-side counterpart to `@repo/core/csv`. Everything here touches `window`/`document`, so
 * it is a separate subpath - a server action importing the CSV serializer must not drag DOM code in
 * behind it.
 *
 * The split matters more than it looks: `toCsv` runs on either side, so a CSV can be built in a
 * server action (where the data lives) and handed to `downloadCsv` in the client (where the user
 * is), with the file-level concerns - BOM, MIME, object-URL lifetime - applied once, here, at the
 * only point where bytes actually become a file.
 */

/** UTF-8 byte order mark. See `downloadCsv`. */
const BOM = '﻿';

/**
 * Hand a blob to the user as a downloaded file.
 *
 * Three details that the hand-rolled copies got wrong, each of which fails only sometimes - which is
 * why they survived so long:
 *
 *  - **The anchor is attached to the document before it is clicked.** A detached anchor's
 *    programmatic `click()` is ignored by Firefox. The copies worked in Chrome and quietly did
 *    nothing elsewhere.
 *  - **The object URL is revoked on a later task, not on the next line.** Every copy called
 *    `URL.revokeObjectURL(url)` immediately after `a.click()`. The download is started
 *    asynchronously, so this is a race the browser usually wins and sometimes does not, producing a
 *    "failed - network error" on a file that was fully in memory.
 *  - **`rel="noopener"`**, so the download can never hand a `window.opener` reference anywhere.
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();

    // Deferred, not immediate - see the note above. Removing the anchor here too keeps the DOM
    // clean without racing the click.
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

/**
 * Download a CSV string as a file.
 *
 * **Prepends a UTF-8 BOM, and this is the whole reason the function exists.** Excel on Windows does
 * not sniff encoding: without the BOM it decodes the file as the system codepage, and every
 * Devanagari character in it becomes garbage. On a platform whose users are Nepali schools, that is
 * most of a typical student export. Every hand-rolled copy omitted it.
 *
 * The BOM is added HERE rather than inside `toCsv` so that it lands exactly once, whether the string
 * was built in this browser or arrived from a server action.
 *
 * The charset is also declared on the MIME type. The copies disagreed - some `text/csv`, some
 * `text/csv;charset=utf-8;` - which is the sort of drift that makes a bug reproduce on one screen
 * and not another.
 */
export function downloadCsv(csv: string, filename: string): void {
    downloadBlob(new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

/*
 * `openPrintWindow` used to live here, and it is gone deliberately.
 *
 * It built an HTML string in the browser and handed it to `window.open`, which meant the artefact a
 * school actually received depended on the popup blocker, the browser's own table pagination and the
 * user's print margins. Every one of its call sites - the fee receipt, the payslip, the tabulation
 * sheet - was a document somebody files, and all of them now go through `@repo/pdf` rendered in
 * `gurukul-services`, so the bytes are the same on every machine.
 *
 * Do not bring it back. If a new surface needs a printable artefact, add a renderer to `@repo/pdf`
 * and a route that calls `renderPdfViaServices`; see `docs/print-to-pdf-migration.md` for the
 * six-step recipe and, more usefully, for the test of whether the thing is a document at all. A
 * genuine working view - a filtered list somebody glances at and throws away - can still use
 * `window.print()` directly on a purpose-built print stylesheet, which is what the mark-sheet list
 * and the announcement circular do.
 */

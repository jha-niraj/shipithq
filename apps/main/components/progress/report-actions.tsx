"use client";

import { useState } from "react";
import { Check, Link2, Printer } from "lucide-react";
import { Switch } from "@repo/ui/components/ui/switch";
import toast from "@repo/ui/components/ui/sonner";
import { setReportShared } from "@/actions/(main)/progress/reports.action";
import { progressReportShareUrl } from "@/lib/urls";

/** The owner's controls on a progress report (PRG-8): share link, copy, print. */
export function ReportActions({ id, initialToken }: { id: string; initialToken: string | null }) {
    const [token, setToken] = useState(initialToken);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);

    const share = async (on: boolean) => {
        setBusy(true);
        const r = await setReportShared(id, on);
        setBusy(false);
        if (!r.success) { toast.error(r.error); return; }
        setToken(r.data.token);
        toast.success(on ? "Anyone with the link can read this report." : "The link no longer works.");
    };
    const copy = async () => {
        if (!token) return;
        try {
            await navigator.clipboard.writeText(progressReportShareUrl(token));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error("Could not copy the link.");
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-neutral-200 px-2.5 text-xs text-neutral-700 dark:border-neutral-800 dark:text-neutral-200">
                Share link <Switch checked={!!token} disabled={busy} onCheckedChange={(v) => void share(v)} aria-label="Share this report" />
            </label>
            {token && (
                <button type="button" onClick={() => void copy()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 text-xs text-neutral-700 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-200">
                    {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />} {copied ? "Copied" : "Copy link"}
                </button>
            )}
            <button type="button" onClick={() => window.print()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 text-xs text-neutral-700 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-200">
                <Printer className="size-3.5" /> Print
            </button>
        </div>
    );
}

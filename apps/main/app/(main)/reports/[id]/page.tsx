import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@repo/auth";
import { loadOwnReport } from "@/lib/progress/reports";
import { ReportView } from "@/components/progress/report-view";

/** A progress report, for its owner only (plan/progress PRG-8). Someone else's is a 404. */

export const metadata: Metadata = { title: "Progress report | ShipItHQ", robots: { index: false, follow: false } };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession(await headers());
    const { id } = await params;
    if (!session?.user?.id) redirect(`/signin?callbackUrl=${encodeURIComponent(`/reports/${id}`)}`);
    const report = await loadOwnReport(session.user.id, id);
    if (!report) notFound();
    return <ReportView id={report.id} snapshot={report.snapshot} owner shareToken={report.shareToken} />;
}

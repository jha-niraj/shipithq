import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadSharedReport } from "@/lib/progress/reports";
import { ReportView } from "@/components/progress/report-view";

/**
 * A progress report its owner shared (plan/progress PRG-8). Public and read-only;
 * switching sharing off clears the token and this becomes a 404. Not indexed.
 */

export const metadata: Metadata = { title: "Progress report | ShipItHQ", robots: { index: false, follow: false } };

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const report = await loadSharedReport(token);
    if (!report) notFound();
    return <ReportView id={report.id} snapshot={report.snapshot} owner={false} shareToken={null} />;
}

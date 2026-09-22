import { notFound } from "next/navigation";
import { getProblemBySlug, getOrCreateSession, getGuidedSession } from "@/actions/(main)/practice";
import { PracticeWorkspace } from "../../_components/workspace/practice-workspace";
import { StartSessionCard } from "../../_components/workspace/start-session-card";

interface PageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ mode?: string }>;
}

export default async function DSAProblemPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const { mode } = await searchParams;

    const problem = await getProblemBySlug(slug);
    if (!problem || problem.module !== "DSA") return notFound();

    // Exam mode is not charged and is created on open, as before. The guided
    // (assist) session is created only by the start card, which charges
    // `practice_set` once (plan/practice-dsa PD-10).
    if (mode === "exam") {
        const session = await getOrCreateSession(slug, "EXAM");
        return <PracticeWorkspace problem={problem} session={session} mode="EXAM" />;
    }

    const session = await getGuidedSession(slug);
    if (!session) return <StartSessionCard problem={problem} />;
    return <PracticeWorkspace problem={problem} session={session} mode="ASSIST" />;
}

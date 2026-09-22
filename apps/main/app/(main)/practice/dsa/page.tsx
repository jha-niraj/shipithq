import { PracticeModulePage } from "../_components/practice-module-page";

interface PageProps {
    searchParams: Promise<{
        topic?: string;
        resume?: string;
    }>;
}

export default async function DSAPracticePage({ searchParams }: PageProps) {
    const params = await searchParams;
    return (
        <PracticeModulePage
            module="DSA"
            moduleLabel="Data Structures & Algorithms"
            onboardingKey="practice:dsa"
            topic={params.topic ?? null}
            resume={params.resume === "1"}
            skeletonCards={9}
        />
    );
}

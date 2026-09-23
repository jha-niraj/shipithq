import { PracticeModulePage } from "../_components/practice-module-page";

interface PageProps {
    searchParams: Promise<{
        topic?: string;
        resume?: string;
        onboarding?: string;
    }>;
}

export default async function SystemDesignPracticePage({ searchParams }: PageProps) {
    const params = await searchParams;
    return (
        <PracticeModulePage
            module="SYSTEM_DESIGN"
            moduleLabel="System Design"
            onboardingKey="practice:system-design"
            topic={params.topic ?? null}
            resume={params.resume === "1"}
            onboardingParam={params.onboarding === "1"}
        />
    );
}

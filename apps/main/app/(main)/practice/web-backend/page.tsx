import { PracticeModulePage } from "../_components/practice-module-page";

interface PageProps {
    searchParams: Promise<{
        topic?: string;
        resume?: string;
        onboarding?: string;
    }>;
}

export default async function WebBackendPracticePage({ searchParams }: PageProps) {
    const params = await searchParams;
    return (
        <PracticeModulePage
            module="WEB_BACKEND"
            moduleLabel="Web Backend"
            onboardingKey="practice:web-backend"
            topic={params.topic ?? null}
            resume={params.resume === "1"}
            onboardingParam={params.onboarding === "1"}
        />
    );
}

import { PracticeModulePage } from "../_components/practice-module-page";

interface PageProps {
    searchParams: Promise<{
        topic?: string;
        resume?: string;
        onboarding?: string;
    }>;
}

export default async function WebFrontendPracticePage({ searchParams }: PageProps) {
    const params = await searchParams;
    return (
        <PracticeModulePage
            module="WEB_FRONTEND"
            moduleLabel="Web Frontend"
            onboardingKey="practice:web-frontend"
            topic={params.topic ?? null}
            resume={params.resume === "1"}
            onboardingParam={params.onboarding === "1"}
        />
    );
}

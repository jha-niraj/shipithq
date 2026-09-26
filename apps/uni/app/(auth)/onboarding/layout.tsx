import { PublicHeader } from "@/components/public-header";

/** Onboarding keeps a slim header: the marketing chrome moved to shipithq.com/uni (REV-32). */
export default function OnboardingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <>
            <PublicHeader />
            {children}
        </>
    );
}

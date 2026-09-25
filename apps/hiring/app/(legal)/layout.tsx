import { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hire.shipithq.com'

// The hiring app is a signed-in product; its public pages are not for search.
// The companies marketing page is shipithq.com/hire (apps/web).
export const metadata: Metadata = {
    title: { default: "ShipItHQ Hiring", template: "%s | ShipItHQ Hiring" },
    description: "Set your own interview rounds and receive candidates who have already passed them.",
    metadataBase: new URL(BASE_URL),
    robots: { index: false, follow: false },
};

export default function LegalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <>
            <PublicHeader />
            {children}
        </>
    );
}

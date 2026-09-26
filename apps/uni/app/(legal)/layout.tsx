import { PublicHeader } from "@/components/public-header";

export default function LegalLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <PublicHeader />
            {children}
        </>
    );
}

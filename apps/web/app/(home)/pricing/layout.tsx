import SiteHeader from "@/components/site/header";
import SiteFooter from "@/components/site/footer";

interface LayoutProps {
    children: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
    return (
            <div className="flex flex-col bg-white dark:bg-neutral-950">
                <SiteHeader />
                {children}
                <SiteFooter />
            </div>
    );
};

export default Layout;

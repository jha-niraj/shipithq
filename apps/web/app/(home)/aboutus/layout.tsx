import SiteHeader from "@/components/site/header";
import SiteFooter from "@/components/site/footer";

interface LayoutProps {
    children: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {

    return (
        <div className="flex flex-col bg-gray-50 dark:bg-black">
            <SiteHeader />
            {children}
            <SiteFooter />
        </div>
    );
};

export default Layout;
import { Header } from "./Header";
import { Footer } from "./Footer";

interface AppLayoutProps {
    children: React.ReactNode;
    showHeader?: boolean;
    showFooter?: boolean;
}

export function AppLayout({
    children,
    showHeader = true,
    showFooter = true,
}: AppLayoutProps) {
    return (
        <div className="flex min-h-screen flex-col">
            {showHeader && <Header />}
            <main className="flex-1">{children}</main>
            {showFooter && <Footer />}
        </div>
    );
}

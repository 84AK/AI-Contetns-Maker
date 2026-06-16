import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import ClientLayout from "@/components/layout/ClientLayout";
import { ThemeProvider } from "@/components/common/ThemeProvider";
import GlobalToast from "@/components/common/GlobalToast";
import PageTransitionLoader from "@/components/common/PageTransitionLoader";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });

export const metadata: Metadata = {
    title: "AI 콘텐츠 메이커",
    description: "소상공인과 마케터를 위한 AI 마케팅 콘텐츠 가이드 — 카드뉴스, 상세페이지, 쇼츠 스크립트를 AI로 만드세요",
    manifest: "/manifest.json",
    icons: {
        icon: "/aklabs-logo.svg",
        shortcut: "/aklabs-logo.svg",
        apple: "/aklabs-logo.svg",
    },
    appleWebApp: { capable: true, statusBarStyle: "default", title: "AI 콘텐츠 메이커" },
    formatDetection: { telephone: false },
};

export const viewport: Viewport = {
    themeColor: "#FF6B35",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <head>
                <link rel="icon" href="/aklabs-logo.svg" type="image/svg+xml" />
            </head>
            <body className={`${inter.variable} ${outfit.variable} antialiased selection:bg-primary/30 font-sans`}>
                <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem>
                    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300 w-full overflow-x-hidden">
                        <Sidebar />
                        <ClientLayout>{children}</ClientLayout>
                    </div>
                    <GlobalToast />
                    <PageTransitionLoader />
                </ThemeProvider>
            </body>
        </html>
    );
}

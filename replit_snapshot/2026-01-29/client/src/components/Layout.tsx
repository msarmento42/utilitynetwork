import { ReactNode } from "react";
import Header from "./layout/Header";
import Footer from "./layout/Footer";
import { siteConfig } from "../site-config";
import { useEffect } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  // Mock Google Analytics Initialization
  useEffect(() => {
    if (siteConfig.gaTrackingId) {
      console.log(`[GA4] Initialized with ID: ${siteConfig.gaTrackingId}`);
      // In a real app, inject script here or in index.html
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background text-foreground selection:bg-primary/20">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto">
        {children}
      </main>
      <Footer />
    </div>
  );
}

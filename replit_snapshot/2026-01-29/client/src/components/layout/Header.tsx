import { Link, useLocation } from "wouter";
import { siteConfig } from "../../site-config";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  // Get Tier 1 subsites for the main nav
  const mainNavItems = siteConfig.subsites.filter((s) => s.tier === 1);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 sm:px-8">
        <Link href="/" className="mr-6 flex items-center space-x-2 font-bold text-lg tracking-tight hover:text-primary transition-colors">
            {siteConfig.name}
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {mainNavItems.map((item) => (
            <Link key={item.slug} href={`/${item.slug}`} className={cn(
                  "transition-colors hover:text-foreground/80",
                  location.startsWith(`/${item.slug}`)
                    ? "text-foreground font-semibold"
                    : "text-foreground/60"
                )}>
                {item.name}
            </Link>
          ))}
          <Link href="/about" className="text-foreground/60 hover:text-foreground/80 transition-colors">
             About
          </Link>
        </nav>

        {/* Mobile Nav Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="sr-only">Toggle menu</span>
        </Button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t p-4 bg-background">
          <nav className="flex flex-col space-y-4">
            {siteConfig.subsites.map((item) => (
              <Link key={item.slug} href={`/${item.slug}`} className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                     location.startsWith(`/${item.slug}`) ? "text-primary" : "text-muted-foreground"
                  )}
                  onClick={() => setIsOpen(false)}>
                  {item.name}
              </Link>
            ))}
            <div className="border-t pt-4 mt-2">
                <Link href="/about" className="text-sm font-medium text-muted-foreground" onClick={() => setIsOpen(false)}>
                    About
                </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

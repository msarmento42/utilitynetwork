import { Link } from "wouter";
import { siteConfig } from "../../site-config";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/40 mt-auto">
      <div className="container py-10 px-4 sm:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-bold text-lg mb-4">{siteConfig.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {siteConfig.description}
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-sm mb-4">Categories</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {siteConfig.subsites.slice(0, 8).map((site) => (
                <li key={site.slug}>
                  <Link href={`/${site.slug}`} className="hover:text-foreground transition-colors">
                    {site.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
             <h4 className="font-semibold text-sm mb-4">More Categories</h4>
             <ul className="space-y-2 text-sm text-muted-foreground">
              {siteConfig.subsites.slice(8).map((site) => (
                <li key={site.slug}>
                  <Link href={`/${site.slug}`} className="hover:text-foreground transition-colors">
                    {site.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Legal & Info</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link href="/ai-disclosure" className="hover:text-foreground transition-colors">AI Disclosure</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>&copy; {currentYear} {siteConfig.name}. All rights reserved.</p>
            <p>Built with Next.js & Replit</p>
        </div>
      </div>
    </footer>
  );
}

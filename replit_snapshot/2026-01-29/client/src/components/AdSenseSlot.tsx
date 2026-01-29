import { useEffect, useRef } from "react";
import { siteConfig } from "../site-config";
import { useLocation } from "wouter";

interface AdSenseSlotProps {
  adSlot: string;
  className?: string;
  style?: React.CSSProperties;
  layout?: string;
  format?: string;
  responsive?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function AdSenseSlot({
  adSlot,
  className,
  style,
  layout,
  format = "auto",
  responsive = "true",
}: AdSenseSlotProps) {
  const [location] = useLocation();
  const adRef = useRef<HTMLModElement>(null);
  const initialized = useRef(false);

  // Check if ads should be shown on this path
  const shouldShowAds = !siteConfig.adExclusionPaths.some((path) =>
    location.startsWith(path)
  );

  useEffect(() => {
    if (!shouldShowAds) return;
    
    // Simple check to avoid double-pushing in StrictMode or re-renders
    if (adRef.current && !adRef.current.innerHTML) {
        try {
            if (typeof window !== 'undefined') {
                 (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (e) {
            console.error("AdSense error:", e);
        }
    }
  }, [location, shouldShowAds]);

  if (!shouldShowAds) {
    return (
        <div className="p-4 border border-dashed border-gray-300 rounded bg-gray-50 text-xs text-gray-400 text-center">
            AdSense Disabled on this page
        </div>
    );
  }

  return (
    <div className={`adsense-slot my-8 ${className || ""}`} style={style}>
      {/* Placeholder for Development Mode */}
      <div className="bg-gray-100 border border-gray-200 text-gray-400 text-xs p-2 text-center mb-1">
        Advertisement (Mock: {adSlot})
      </div>
      
      <ins
        className="adsbygoogle block"
        data-ad-client={siteConfig.adsenseClientId}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
        ref={adRef}
      />
    </div>
  );
}

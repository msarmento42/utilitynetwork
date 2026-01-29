import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Subsite from "@/pages/Subsite";
import Article from "@/pages/Article";
import StaticPage from "@/pages/StaticPage";
import { siteConfig } from "./site-config";

// We need to differentiate between /:subsite (Subsite Index) and /:slug (Static Page).
// Strategy: Check if the slug matches a known subsite. If yes, render Subsite. If no, try StaticPage.
// OR: Explicitly list static pages or subsites in routes.
// Given the dynamic nature, a wrapper component is best.

function DynamicRoute() {
    // This is a bit tricky with wouter regex, so let's use a simpler approach:
    // Route order matters.
    return null;
}

function Router() {
  const subsiteSlugs = siteConfig.subsites.map(s => s.slug);

  return (
    <Switch>
      <Route path="/" component={Home} />
      
      {/* Subsite Article Routes: /business/ai-strategy */}
      <Route path="/:subsite/:slug">
        {(params) => {
            // Verify if params.subsite is valid
            if (subsiteSlugs.includes(params.subsite)) {
                return <Article />;
            }
            return <NotFound />;
        }}
      </Route>

      {/* Top Level Routes: Could be Subsite Index OR Static Page */}
      <Route path="/:slug">
        {(params) => {
             if (subsiteSlugs.includes(params.slug)) {
                 return <Subsite />;
             }
             // Fallback to StaticPage (e.g. /about)
             // We can check if content exists inside StaticPage
             return <StaticPage />;
        }}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

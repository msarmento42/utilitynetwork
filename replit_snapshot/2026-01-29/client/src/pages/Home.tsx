import Layout from "@/components/Layout";
import { siteConfig } from "@/site-config";
import { getAllContent } from "@/lib/content";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

export default function Home() {
  const allPosts = getAllContent();
  
  // Group latest posts by tier 1 subsites for the dashboard feel
  const tier1Subsites = siteConfig.subsites.filter(s => s.tier === 1);

  return (
    <Layout>
      <div className="space-y-12 py-10 px-4 sm:px-8">
        
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto py-12">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight lg:text-7xl">
            Work Smarter with <span className="text-primary">AI</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            {siteConfig.description} Discover workflows for {tier1Subsites.map(s => s.name).join(", ")} and more.
          </p>
        </section>

        {/* Featured Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tier1Subsites.map(subsite => {
            const subsitePosts = allPosts.filter(p => p.subsite === subsite.slug).slice(0, 1);
            return (
              <Card key={subsite.slug} className="hover:shadow-lg transition-shadow border-muted bg-card">
                <CardHeader>
                    <div className="flex justify-between items-center mb-2">
                         <Badge variant="outline" className="uppercase text-xs font-bold tracking-wider">{subsite.name}</Badge>
                         <Link href={`/${subsite.slug}`} className="text-xs text-primary hover:underline">
                            View All &rarr;
                         </Link>
                    </div>
                  <CardTitle className="text-xl">
                    {subsitePosts.length > 0 ? (
                        <Link href={`/${subsite.slug}/${subsitePosts[0].slug}`} className="hover:text-primary transition-colors">
                            {subsitePosts[0].meta.title}
                        </Link>
                    ) : (
                        <span className="text-muted-foreground font-normal italic">Coming Soon</span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {subsitePosts[0]?.meta.excerpt || `Explore the latest in ${subsite.name}.`}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* All Categories List */}
        <section className="border-t pt-10">
            <h2 className="text-2xl font-bold mb-6">Explore All Categories</h2>
            <div className="flex flex-wrap gap-3">
                {siteConfig.subsites.map(s => (
                    <Link 
                        key={s.slug} 
                        href={`/${s.slug}`}
                        className={buttonVariants({ variant: "secondary", className: "rounded-full" })}
                    >
                        {s.name}
                    </Link>
                ))}
            </div>
        </section>

      </div>
    </Layout>
  );
}

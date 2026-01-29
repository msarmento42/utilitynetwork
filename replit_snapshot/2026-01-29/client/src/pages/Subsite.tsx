import Layout from "@/components/Layout";
import { getPostsBySubsite, getPostBySlug } from "@/lib/content";
import { siteConfig } from "@/site-config";
import { useRoute, Link } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import NotFound from "./not-found";
import ReactMarkdown from "react-markdown";
import { Separator } from "@/components/ui/separator";

export default function Subsite() {
  const [match, params] = useRoute("/:subsite");
  
  if (!match) return <NotFound />;

  const subsiteSlug = params.subsite;
  const subsiteConfig = siteConfig.subsites.find(s => s.slug === subsiteSlug);
  
  if (!subsiteConfig) {
      return <NotFound />;
  }

  // Check if there is a dedicated home/index page content for this subsite
  const homePost = getPostBySlug(subsiteSlug, "home");
  const posts = getPostsBySubsite(subsiteSlug).filter(p => p.slug !== "home");

  if (homePost) {
      return (
        <Layout>
          <div className="container py-12 px-4 sm:px-8 mx-auto">
             <div className="prose prose-slate dark:prose-invert lg:prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-img:rounded-lg">
                <ReactMarkdown>{homePost.content}</ReactMarkdown>
             </div>
          </div>
        </Layout>
      );
  }

  return (
    <Layout>
      <div className="container py-10 px-4 sm:px-8">
        <header className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-4">{subsiteConfig.name}</h1>
            <p className="text-xl text-muted-foreground">{subsiteConfig.description || `Latest articles, workflows, and guides for ${subsiteConfig.name.toLowerCase()}.`}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.length > 0 ? (
                posts.map(post => (
                    <Card key={post.slug} className="flex flex-col h-full hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="leading-normal">
                                <Link href={`/${subsiteSlug}/${post.slug}`} className="hover:text-primary transition-colors">
                                    {post.meta.title}
                                </Link>
                            </CardTitle>
                            <CardDescription className="mt-2 line-clamp-3">
                                {post.meta.excerpt}
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="mt-auto pt-4 text-sm text-muted-foreground">
                            {post.meta.date}
                        </CardFooter>
                    </Card>
                ))
            ) : (
                <div className="col-span-full py-20 text-center bg-muted/30 rounded-lg border border-dashed">
                    <p className="text-muted-foreground">No articles found in this section yet.</p>
                </div>
            )}
        </div>
      </div>
    </Layout>
  );
}

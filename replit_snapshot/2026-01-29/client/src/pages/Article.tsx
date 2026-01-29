import Layout from "@/components/Layout";
import { getPostBySlug } from "@/lib/content";
import { useRoute } from "wouter";
import NotFound from "./not-found";
import ReactMarkdown from "react-markdown";
import AdSenseSlot from "@/components/AdSenseSlot";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function Article() {
  const [match, params] = useRoute("/:subsite/:slug");
  
  if (!match) return <NotFound />;

  const { subsite, slug } = params;
  const post = getPostBySlug(subsite, slug);

  if (!post) return <NotFound />;

  return (
    <Layout>
      <article className="container max-w-3xl py-12 px-4 sm:px-8 mx-auto">
        <header className="mb-8 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="capitalize">{subsite}</span>
                <span>•</span>
                <time>{post.meta.date}</time>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                {post.meta.title}
            </h1>
            {post.meta.author && (
                <p className="text-muted-foreground">By {post.meta.author}</p>
            )}
        </header>

        <Separator className="my-8" />

        {!post.meta.noAds && (
             <AdSenseSlot adSlot="1234567890" className="mb-10" />
        )}

        <div className="prose prose-slate dark:prose-invert lg:prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-img:rounded-lg">
            <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        <Separator className="my-12" />

        {!post.meta.noAds && (
             <AdSenseSlot adSlot="0987654321" />
        )}
      </article>
    </Layout>
  );
}

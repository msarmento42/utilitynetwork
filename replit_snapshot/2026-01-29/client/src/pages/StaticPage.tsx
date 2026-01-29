import Layout from "@/components/Layout";
import { getStaticPage } from "@/lib/content";
import { useRoute } from "wouter";
import NotFound from "./not-found";
import ReactMarkdown from "react-markdown";
import AdSenseSlot from "@/components/AdSenseSlot";

export default function StaticPage() {
  // Manual routing check or passed prop could work, 
  // but let's assume we use a specific route like /page/:slug or catch-all in App
  // For this scaffold, let's make it a component that takes a slug prop or reads from route.
  // We'll use the route /:slug for top level pages like /about, /privacy.
  
  const [match, params] = useRoute("/:slug");
  if (!match) return <NotFound />;
  
  const { slug } = params;
  const post = getStaticPage(slug);

  if (!post) return <NotFound />;

  return (
    <Layout>
      <div className="container max-w-3xl py-12 px-4 sm:px-8 mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-8">{post.meta.title}</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        {!post.meta.noAds && (
             <AdSenseSlot adSlot="static-page-slot" className="mt-12" />
        )}
      </div>
    </Layout>
  );
}

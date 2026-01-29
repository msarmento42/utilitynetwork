import fm from "front-matter";

export interface ArticleMeta {
  title: string;
  date: string;
  excerpt?: string;
  noAds?: boolean;
  author?: string;
  [key: string]: any;
}

export interface ContentItem {
  slug: string;
  subsite: string; // or 'page' for static pages
  content: string;
  meta: ArticleMeta;
}

// In Vite, we can use import.meta.glob to load files.
// We'll load them as raw strings to pass to front-matter.
const contentFiles = import.meta.glob("/src/content/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

export function getAllContent(): ContentItem[] {
  const items: ContentItem[] = [];

  for (const path in contentFiles) {
    const rawContent = contentFiles[path] as string;
    const { attributes, body } = fm<ArticleMeta>(rawContent);
    
    // Parse path to get subsite and slug
    // Expected path format: /src/content/[subsite]/[slug].md
    const parts = path.split("/");
    const filename = parts.pop(); // e.g., hello.md
    const subsite = parts.pop(); // e.g., business
    const slug = filename?.replace(".md", "");

    if (subsite && slug) {
      items.push({
        slug,
        subsite,
        content: body,
        meta: attributes,
      });
    }
  }

  return items;
}

export function getPostBySlug(subsite: string, slug: string): ContentItem | undefined {
  const all = getAllContent();
  return all.find((item) => item.subsite === subsite && item.slug === slug);
}

export function getPostsBySubsite(subsite: string): ContentItem[] {
  const all = getAllContent();
  return all.filter((item) => item.subsite === subsite);
}

export function getStaticPage(slug: string): ContentItem | undefined {
  return getPostBySlug("pages", slug);
}

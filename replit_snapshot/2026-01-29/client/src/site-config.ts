export const siteConfig = {
  name: "Everyday AI Workflows",
  description: "Practical AI workflows for business, productivity, and life.",
  gaTrackingId: import.meta.env.VITE_GA4_ID || "G-083MSQKPFX",
  adsenseClientId: import.meta.env.VITE_ADSENSE_CLIENT_ID || "ca-pub-6175161566333696",
  adExclusionPaths: ["/privacy", "/terms", "/cookie-notice", "/ai-disclosure"],
  subsites: [
    {
      slug: "business",
      tier: 1,
      navLabel: "Small Business",
      name: "AI for Small Business & Solopreneurs",
      description: "AI-powered workflows, prompts, and templates for solopreneurs and small business operators."
    },
    { slug: "tools", name: "Tools", tier: 1, description: "Learn how to evaluate, use, and choose AI tools by workflow—not hype." },
    { 
      slug: "jobs", 
      name: "AI for Job Search & Resumes", 
      navLabel: "AI for Job Search",
      tier: 1,
      description: "Ethical, practical workflows to use AI during your job search — without overpromising or misrepresenting."
    },
    { 
      slug: "creators", 
      name: "AI for Content Creators & Bloggers", 
      navLabel: "Creators",
      tier: 1, 
      description: "Practical AI workflows for content creators and bloggers." 
    },
    { slug: "prompts", name: "Everyday AI Prompt Library", navLabel: "Prompt Library", tier: 1, description: "Copy-paste prompt packs that help you get real work done faster." },
    { 
      slug: "productivity", 
      name: "Productivity Workflows", 
      navLabel: "Productivity",
      tier: 1, 
      description: "AI-powered workflows to plan your week, prioritize tasks, achieve inbox zero, track habits, and boost everyday productivity." 
    },
    { 
      slug: "marketing", 
      name: "AI for Marketing", 
      navLabel: "Marketing",
      tier: 1, 
      description: "Practical, no-hype AI workflows for solo founders, small business marketers, and non-technical operators." 
    },
    { 
      slug: "travel", 
      name: "AI for Travel", 
      navLabel: "Travel",
      tier: 2, 
      description: "Your guide to using AI to plan and enhance your travel experiences – from itineraries and bookings to on-the-road help and memory documentation." 
    },
    { 
      slug: "meals", 
      name: "AI for Meal Planning & Groceries", 
      navLabel: "Meal Planning",
      tier: 2, 
      description: "Smart, weeknight-friendly workflows for meal planning, meal prep, budgeting, and grocery organization – all powered by AI." 
    },
    { 
      slug: "students", 
      name: "AI for Students & Study", 
      navLabel: "Students",
      tier: 2, 
      description: "Guides for students to leverage AI as a learning aid responsibly – summarizing notes, studying, planning, and more with academic integrity." 
    },
    { slug: "social", name: "Social", tier: 2 },
    { slug: "home", name: "Home", tier: 2 },
    { slug: "entertainment", name: "Entertainment", tier: 2 },
    { slug: "parenting", name: "Parenting", tier: 2 },
    { slug: "shopping", name: "Shopping", tier: 2 },
    { slug: "coding", name: "Coding", tier: 2 },
    { slug: "lifestyle", name: "Lifestyle", tier: 2 },
  ],
};

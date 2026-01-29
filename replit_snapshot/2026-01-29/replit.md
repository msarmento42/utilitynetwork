# Everyday AI Workflows

## Overview

This is a content-driven website for "Everyday AI Workflows" - a publication providing practical AI workflows for business, productivity, and life. The application is built as a full-stack TypeScript project with a React frontend and Express backend, designed to serve markdown-based content across 15+ topic subsites (business, jobs, creators, marketing, etc.).

The project includes Google Analytics 4 (GA4) and Google AdSense integration for monetization, with configurable ad exclusion paths for legal/policy pages.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing with dynamic routes for subsites and articles
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **State Management**: TanStack React Query for server state
- **Content Loading**: Markdown files parsed at build time using Vite's `import.meta.glob` with front-matter extraction

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Server**: HTTP server with development hot-reload via Vite middleware
- **Static Serving**: Production builds served from `dist/public`
- **API Pattern**: RESTful routes prefixed with `/api`

### Content System
- Markdown content stored in `client/src/content/` directory
- Front-matter metadata (title, date, excerpt, noAds flag) extracted using `front-matter` library
- Dynamic routing: `/:subsite/:slug` for articles, `/:subsite` for category indexes, `/:slug` for static pages
- Subsites organized by tier (Tier 1 for main navigation, Tier 2 for secondary categories)

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit with migrations output to `./migrations`
- **Current Storage**: In-memory storage implementation (`MemStorage`) as default, with interface ready for database integration

### Build System
- Client: Vite builds to `dist/public`
- Server: esbuild bundles server code to `dist/index.cjs`
- Shared code in `shared/` directory accessible to both client and server

## External Dependencies

### Analytics & Monetization
- **Google Analytics 4**: Measurement ID `G-083MSQKPFX` (configurable via `VITE_GA4_ID` env var)
- **Google AdSense**: Publisher ID `pub-6175161566333696` (configurable via `VITE_ADSENSE_CLIENT_ID` env var)
- **ads.txt**: Served from `client/public/ads.txt` for ad verification

### Database
- **PostgreSQL**: Required for production (connection via `DATABASE_URL` environment variable)
- **connect-pg-simple**: Session storage for PostgreSQL

### UI Components
- **Radix UI**: Full suite of accessible primitives (dialog, dropdown, tabs, etc.)
- **Lucide React**: Icon library
- **React Markdown**: Markdown rendering for content
- **Embla Carousel**: Carousel functionality

### Development Tools
- **Replit Plugins**: Cartographer, dev banner, and runtime error overlay for Replit environment
- **Vite Meta Images Plugin**: Custom plugin for OpenGraph image handling
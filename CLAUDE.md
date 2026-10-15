# EbookBuddy — Project Context

## Stack
- React + Vite (SWC) + TypeScript; dev server port 8080; `@` alias → ./src
- Routing: react-router-dom v6
- Backend: Supabase (supabase-js) + React Query
- UI: shadcn/ui (Radix) + Tailwind CSS (typography, animate), Lucide icons, Sonner
- Forms: React Hook Form + Zod
- Video: Zoom Meeting SDK (@zoom/meetingsdk)
- Tests: Vitest; Lint: ESLint (npm run dev / build / lint / test)

## Where things live
- src/pages/ — pages (e.g. WordCoach.tsx, AdminDashboard.tsx)
- src/components/ — components (ui/ = shadcn, admin/, wordcoach/)
- src/hooks/ — custom hooks
- src/integrations/ — external integrations (Supabase)
- src/lib/ — utilities
- src/test/ — test setup
- src/assets/ — static assets

## Rules
- This repo is two-way synced with Lovable via GitHub. Assume `git pull` was run first.
- Read only the files needed for the task. Do not scan the whole repo.
- Never read, edit, or print .env files, API keys, or secrets (including Zoom credentials).
- Students include children: never log, print, or hardcode student or volunteer personal data.
- Core features: 1-on-1 reading sessions, Word Coach (vocabulary review), ebooks, Zoom integration. Show me a plan before changing any of these.
- Reuse existing components and Tailwind patterns; don't add new libraries without asking.
- Show the plan before multi-file changes. Commit only when I ask.

# Project Overview
Vite + React + TypeScript SPA with Shadcn UI, TailwindCSS, Supabase, Zoom SDK

## Key Dependencies
- UI: @radix-ui/* components, lucide-icons, sonner
- Data: @supabase/supabase-js, @tanstack/react-query
- Forms: react-hook-form, zod
- Integration: @zoom/meetingsdk
- Dev: vite, vitest, eslint, tailwindcss, typescript

## Dev Workflow
- dev: vite (development server)
- build: vite build (production)
- lint: eslint .
- test: vitest run
- preview: vite preview

## Src Structure
assets/, components/, hooks/, integrations/, lib/, pages/, test/

## Config
- Vite: SWC React plugin, @ alias for ./src
- Tailwind: typography & animate plugins
- Server: port 8080, HMR overlay disabled
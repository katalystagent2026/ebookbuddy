# EbookBuddy

Mission Statement

I want to build a literacy and mentorship web platform that helps at-risk elementary school students improve reading skills by reading online books together with caring volunteers.
It should feel safe, playful, excited, and educational, blending storybook magic with grounded, trustworthy learning—like a warm library where imagination and growth live side by side.

Project Name: eBookBuddy

Target Audience

Elementary students (ages 6–10) who need reading support and emotional safety

Volunteer mentors who want meaningful, structured ways to support literacy

Schools and nonprofits seeking safe, measurable reading programs

Core Emotional Strategy (Key Insight)

Magic draws kids in

Structure earns adult trust

Kindness keeps everyone coming back

This balance should be felt in every interaction.

Core Features & Pages

✅ Dual-Layer Onboarding

Kids experience: friendly mascot, gentle animations, “Let’s read together!” language

Volunteers experience: calm tone, clarity on impact, expectations, and safety

Both feel welcomed—not evaluated

✅ Reading Buddy Matching

Matches based on reading level, schedule, and preferences

Framed as “You’ve met your reading buddy” (magical)

Supported by clear safeguards, reporting tools, and visibility (grounded)

✅ Live Reading Room

Shared book view with:

Page-turn animations (storybook magic)

Word highlighting, pause points, and prompts (educational grounding)

Optional mentor nudges like:

“Try asking what they think happens next”

“Pause here if they need help”

✅ Curated Book World

Books grouped into themed “worlds” (Adventure, Friendship, Curiosity)

Reading levels clearly but gently communicated

Visual delight without overwhelming cognition

✅ Progress Without Pressure

Kids see progress as stars, badges, and “stories completed”

Volunteers see literacy growth indicators and session reflections

No grades. No red marks. Only encouragement and forward motion.

Tech Stack

Frontend: Vite + TypeScript + React + shadcn/ui + Tailwind CSS

Backend & Storage: Lovable Cloud (recommended for secure data, scaling programs, and auditability)

Auth: Guardian-managed child accounts, volunteer verification flows

Design Guidelines

(Interpreting emotion into form, guided by design-tips.md )

Emotional Thesis
Feels like a magical storybook that lives inside a real school library—imaginative, calm, and trustworthy.

Typography

Headings: Friendly rounded sans-serif (signals safety + play)

Body: Highly legible educational sans-serif (signals learning + credibility)

Clear hierarchy so magic never compromises readability

≥ 1.5× line-height, AA+ contrast

Color System

Primary: Soft sky blue (#6EC1E4) → safety & calm

Accent: Golden yellow (#FFD966) → curiosity & joy

Secondary: Gentle forest green (#6FAF8E) → learning & growth

Background: Warm off-white (#FAFAF7)

Emotional logic: playful accents, serious foundations

Layout & Spacing

8pt grid system

Consistent layouts (grounded) with soft curves and illustrations (magical)

Whitespace slows the pace and reduces anxiety

Motion & Interactions

Motion used sparingly, as kindness

Page turns feel tactile and story-like

Celebrations are small and affirming—not distracting

200–300ms, ease-in-out

Voice & Microcopy

Encouraging, warm, never childish or clinical

Examples:

“Your reading space is ready ✨”

“Every page helps you grow.”

“Thank you for showing up today.”

System Consistency

Same visual language across kid and volunteer views

Magic never breaks rules; rules never kill delight

Accessibility

Keyboard-first navigation

Screen-reader-friendly reading flows

Clear focus states, simple language, no time pressure

Design Integrity Review

Does the magic invite learning—or distract from it?

Does the structure protect trust without feeling cold?

Does the product feel kind, safe, and human?

Optional AI Feature

A gentle reading guide AI:

Feels like a calm librarian with a bit of magic

Suggests prompts, explains tricky words, encourages curiosity

Never corrects harshly; always reframes positively

Final Reflection

Read Together is not just a reading tool—it’s an emotional environment. By blending magical storytelling with grounded educational structure, the platform supports literacy, mentorship, and trust at the same time—making learning feel safe, joyful, and real.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ebookbuddy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/53a6c178-c0eb-4e99-a2ae-71cd38dd8c9d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

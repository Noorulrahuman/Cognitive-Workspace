This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
cd frontend
npm install

npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Cognitive Workspace Frontend

The Cognitive Workspace frontend provides the user interface for managing projects, requirements, and AI-assisted workspace interactions.

### Current Frontend Updates

- Updated the main workspace UI.
- Improved the shared Navbar and global styling.
- Enhanced Projects and Requirements pages.
- Updated the Chat workspace interface.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Current Frontend Updates

- Enhanced the main workspace UI and global styling.
- Improved the shared Navbar and navigation experience.
- Enhanced the Projects workspace with project creation, details, deletion, and data persistence support.
- Enhanced the Copilot chat workspace with project selection, starter prompts, message interactions, and response actions.
- Refined the Login page UI and authentication flow.

### What we changed
- **Navbar**: gold animated brand text, active link highlight (also on sub-pages), live API status pill, loading skeleton, sign-out redirect, accessibility labels, "AI Copilot" renamed to "Gemini".
- **Home**: health check with timeout, accepts both `ok` and `healthy`, API Docs link only in development.
- **Projects**: colored project icons, clean cards (website name instead of full link, max 3 tags + "+N"), readable dates, progress bar (finished / total tasks), team avatars, sorting, Esc closes popups.
- **Requirements**: live backend status (Checking / Online / Unavailable), simulator timers cleaned up.
- **Chat**: "Demo" badge while replies are simulated, project picker stays in sync with the URL.
- **Login**: fixed the "Register" link opening the Sign In form, passwords must be at least 8 characters, gold brand text.
- **Global**: all backend URLs read from `NEXT_PUBLIC_API_URL` (no hardcoded localhost), shared fonts and animations in `globals.css`, explanatory code comments.
## Frontend Updates (UI)

### Projects page
- **Edit project**: change description, category, tags and link from a pencil button on each card.
- **Sort**: Newest, Oldest, Name A-Z, Most documents.
- **Grid / List view**: switch between 3 cards per row and 1 card per row.
- **Stats row**: total projects, tasks, completed % and team size at a glance.
- **Progress bar and team avatars** on every project card.
- **Smart empty state**: a helpful message when search or a filter finds nothing.
- **Source link** shows only when it is a real http(s) link.
- Cleaner header with a project count and a connection status dot.

### Gemini chat page
- New welcome screen with 3 starter prompts.
- **New chat** and **Copy answer** buttons.
- Collapsible **"How I got this answer"** section.
- Typing animation and a **Demo** badge. It uses sample replies until the backend chat endpoint is connected.

### Navbar
- Simplified to Overview, Projects, Members and Gemini.
- Removed unused tabs and settings.
- Added an **Account Settings** link for signed-in users.

### Account Settings (`/settings`)
- **Profile**: change your name. Email is shown read-only.
- **Password**: set a new password, with validation.
- **Preferences**: choose the default view (Grid/List) and default order for the Projects page.
- **Your data**: export your projects as `my-projects.json` or clear the saved browser data.
- **Devices**: sign out from all devices.
- **Sign out**.

### Tech
Next.js (App Router), React, TypeScript, Tailwind CSS, Supabase Auth.

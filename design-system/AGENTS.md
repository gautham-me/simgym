<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SimGym Design System — rules for AI-assisted UI work

This app is SimGym's design system: tokens + shadcn components, deployed
static to GitHub Pages at `/DS`. It's also the reference other SimGym repos
should copy components from. These rules exist so backend devs using AI
coding assistants stay on-system without every PR needing a design review.

## Always

- Build UI out of `components/ui/*`. Never write a one-off styled `<div>`
  or `<button>` that duplicates what an existing component already does.
- Reference color via the CSS variables in `app/globals.css`
  (`bg-primary`, `text-muted-foreground`, `border`, etc.), never a raw hex
  or `rgb()` value in a `className` or inline `style`.
- Use the Tailwind spacing scale (multiples of 4px: `p-2`, `p-4`, `gap-3`,
  ...) rather than arbitrary values like `p-[13px]`.
- If a component needs a variant that doesn't exist yet (e.g. a wider
  button, a tinted card), add it to the component's own variant map in
  `components/ui/<component>.tsx` — do not override it with one-off
  classes at the call site.
- New shadcn components get added the same way the existing ones in this
  repo were built: same file shape (`data-slot`, `cva` variants, `cn()`
  for class merging), same aliases (`@/components/ui`, `@/lib/utils`).
- After changing a component, update `app/page.tsx` (the `/DS` showcase)
  so the change is visible without reading the diff.

## Never

- Never restyle a component where it's *used* (a specific page/screen).
  If a button looks wrong somewhere, fix `components/ui/button.tsx`, not
  the call site — that's the one rule that keeps this from rotting into
  40 slightly-different buttons.
- Never hardcode `/DS` into an internal link — this app is served under
  `basePath: "/DS"` (see `next.config.ts`), so `next/link` and root-
  relative paths already resolve correctly without it.
- Never add a new npm UI library (Radix is already the primitive layer
  under shadcn) without checking whether an existing `components/ui/*`
  component already covers the need.

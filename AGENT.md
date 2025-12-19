# AGENT.md - AI Agent Guide

## Quick Context
Single-page GTM diagnostic wizard. Next.js 16 + React 19 + Tailwind 4. All UI in one file. Claude AI for research, HubSpot for CRM sync.

## File Map
```
app/page.tsx          # ALL UI CODE - 928 lines, wizard steps, state, rendering
pages/api/claude.js   # Claude API proxy - forwards to Anthropic
pages/api/hubspot.js  # HubSpot upsert - search→update/create→associate
```

## Before Making Changes

### Environment Setup
```bash
npm install
# Create .env.local with:
# ANTHROPIC_API_KEY=sk-ant-...
# HUBSPOT_ACCESS_TOKEN=pat-...
npm run dev
```

### Verify Build
```bash
npm run build  # Must pass before PR
npm run lint   # ESLint check
```

## Architecture Rules

### DO NOT
- Extract components from `page.tsx` - it's intentionally single-file
- Add database/persistence - HubSpot IS the database
- Add authentication - this is a public diagnostic tool
- Add business logic to API routes - they're pure proxies

### DO
- Keep all wizard UI in `app/page.tsx`
- Follow existing Tailwind patterns (dark theme, rose accents, glass cards)
- Use `callClaude()` helper for all AI requests
- Use existing response cleaners for AI output

## Key Patterns

### Adding a Wizard Step
1. Add step name to `steps` array (line ~22)
2. Add state if needed (useState hooks, lines ~24-45)
3. Add `render[StepName]()` function following existing patterns
4. Add conditional render at bottom of component

### Adding a Research Phase
1. Add to `research` state object structure
2. Create `get[Phase]Prompt()` function with ALL CAPS headers
3. Add phase mapping in `useEffect` (line ~448)
4. Use `renderResearch(phaseKey, title)` for display

### Claude Prompt Format
```
CRITICAL: Start with "[HEADER]" - no preamble.

[ALL CAPS HEADER]
Content here.

RULES:
- NO PREAMBLE
- Write TO reader using "you/your"
```

### HubSpot Field Naming
Custom properties use `gtm_` prefix: `gtm_company_analysis`, `gtm_content_grade`, etc.

## Common Tasks

### Modify AI Prompts
Edit `get*Prompt()` functions in `app/page.tsx` (lines ~131-215)

### Change HubSpot Fields
1. Update `generateReport()` in `page.tsx` (line ~456)
2. Ensure HubSpot has matching custom property created

### Update Styling
Use existing Tailwind classes:
- Cards: `bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm`
- Buttons: `bg-gradient-to-r from-rose-500 to-rose-600`
- Text: `text-white/60` for muted, `text-rose-500` for accent

## Testing
No automated tests. Manual testing workflow:
1. Run `npm run dev`
2. Enter any company URL
3. Step through wizard
4. Verify HubSpot records created (if tokens configured)

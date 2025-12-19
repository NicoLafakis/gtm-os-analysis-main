# GTM OS Analysis - Copilot Instructions

## Project Overview
This is a **GTM (Go-to-Market) Operating System Diagnostic** tool built with Next.js 16 (App Router). It's a single-page wizard that collects company information, performs AI-powered research via Claude API, and generates GTM analysis reports synced to HubSpot CRM.

## Architecture

### Hybrid Routing Pattern
- **App Router** (`app/`) - Main UI using React 19 client components
- **Pages Router** (`pages/api/`) - API routes only (Claude proxy, HubSpot integration)

### Data Flow
```
User Input → Claude API (web search) → Research Display → User Feedback → Refined Analysis → HubSpot CRM Sync
```

### Key Files
- [app/page.tsx](../app/page.tsx) - **Entire application UI** (928-line single-file app with all wizard steps)
- [pages/api/claude.js](../pages/api/claude.js) - Claude API proxy (forwards requests to Anthropic)
- [pages/api/hubspot.js](../pages/api/hubspot.js) - HubSpot CRM upsert with contact-company association

## Development

```bash
npm run dev     # Start dev server at localhost:3000
npm run build   # Production build
npm run lint    # ESLint check
```

### Environment Variables (Required)
```
ANTHROPIC_API_KEY=sk-ant-...     # Claude API access
HUBSPOT_ACCESS_TOKEN=pat-...     # HubSpot private app token
```

## Code Patterns

### Claude API Calls
All AI requests go through `callClaude()` helper which:
- Uses `claude-sonnet-4-20250514` model with web search tool
- Wraps prompts with search instructions
- Extracts text content from response blocks

```tsx
// Pattern: Always wrap prompts for web search
const searchPrompt = `Use your web_search tool to research...\n\n${prompt}`;
```

### Prompt Engineering Conventions
Research prompts follow strict formatting rules:
- Use ALL CAPS headers (`WHAT YOU DO`, `YOUR IDEAL BUYERS`)
- Write TO the reader using "you/your" voice
- Specify "NO PREAMBLE - start with first header"
- Request pipe-separated tables for competitive/signal data

### Response Cleaning
Two cleaners handle AI responses:
- `cleanResponse()` - General text cleanup (removes markdown, meta-commentary)
- `cleanCompetitiveResponse()` - Preserves pipe-delimited table structure

### HubSpot Integration Pattern
```tsx
// Upsert pattern: search → update or create → optionally associate
await fetch("/api/hubspot", {
  body: JSON.stringify({
    objectType: "contacts" | "companies",
    searchProperty: "email" | "domain",
    searchValue: value,
    properties: { ... },
    associateWith: { type: "contacts", id: contactId }  // Optional
  })
});
```

### Custom HubSpot Properties
Companies store analysis in `gtm_*` prefixed fields:
- `gtm_company_analysis`, `gtm_icp_summary`, `gtm_competitive_landscape`
- `gtm_content_grade` (A-F), `gtm_content_analysis`, `gtm_narrative`
- `gtm_diagnostic_date`

## UI Conventions

### Styling
- Tailwind CSS 4 with dark theme (`bg-slate-900`, `text-white/60`)
- Rose accent color (`rose-500`, `rose-600`) for CTAs and highlights
- Glass-morphism cards: `bg-white/5 border border-white/10 backdrop-blur-sm`

### Step Machine
Wizard uses array-based step tracking:
```tsx
const steps = ["intro", "select-product", "basic", "research-company", ...];
const [currentStep, setCurrentStep] = useState(0);
```

### Research Phase State
Each research phase (company, icp, competitive, content) has:
```tsx
{ initial: "", feedback: "", refined: "", loading: false }
```

## Important Constraints

1. **Single-file UI** - All components are in `page.tsx`; no component extraction exists
2. **No database** - All state is client-side; HubSpot is the persistence layer
3. **No auth** - Public-facing diagnostic tool
4. **API routes are proxies** - They just forward to external APIs, no business logic
5. **Text-based export** - Downloads are `.txt`, not actual PDF despite function name

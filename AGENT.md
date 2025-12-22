# AGENT.md - AI Agent Guide

## Quick Context
GTM diagnostic wizard ("Signal-Driven GTM OS Builder"). Next.js 16 + React 19 + Tailwind 4. Modular architecture with extracted concerns. Claude AI for research, HubSpot for CRM sync, Anysite MCP for LinkedIn data.

## File Map
```
app/
├── page.tsx              # Main wizard component - state, effects, UI rendering (~3000 lines)
├── globals.css           # Brand tokens, typography, theme colors
├── constants/
│   └── index.ts          # Static config: steps, loading stages, vendor/signal lists
├── types/
│   └── index.ts          # TypeScript interfaces for all data structures
├── lib/
│   ├── api.ts            # External API calls: callClaude, fetchLinkedInData, syncHubSpotContact
│   ├── prompts.ts        # Claude prompt generators (8 research prompts)
│   ├── parsers.ts        # Response parsing functions (pure, testable)
│   └── formatters.ts     # Text cleanup: stripMarkdown, cleanResponse
├── styles/
│   └── pdfStyles.ts      # PDF export styles (@react-pdf/renderer)
└── components/
    └── VendorIcon.tsx    # Signal vendor icons

pages/api/
├── claude.js             # Claude API proxy - forwards to Anthropic
├── hubspot.js            # HubSpot upsert - search→update/create→associate
├── anysite.js            # Anysite MCP client - LinkedIn company/person posts
└── firecrawl.js          # Firecrawl REST proxy - web content extraction
```

## Before Making Changes

### Environment Setup
```bash
npm install
# Create .env.local with:
# ANTHROPIC_API_KEY=sk-ant-...
# HUBSPOT_ACCESS_TOKEN=pat-...
# ANYSITE_MCP_URL=https://...
# ANYSITE_MCP_KEY=...
# FIRECRAWL_API_KEY=...
npm run dev
```

### Verify Build
```bash
npm run build  # Must pass before PR
npm run lint   # ESLint check
```

## Architecture Rules

### DO NOT
- Add database/persistence - HubSpot IS the database
- Add authentication - this is a public diagnostic tool
- Add business logic to API routes - they're pure proxies

### DO
- Keep UI rendering in `app/page.tsx`
- Add new types to `app/types/index.ts`
- Add new prompts to `app/lib/prompts.ts` with explicit parameter interfaces
- Add new parsers to `app/lib/parsers.ts` as pure functions
- Use `callClaude()` from `app/lib/api.ts` for all AI requests
- Follow existing Tailwind patterns (dark theme, orange accents, glass cards)

## Module Guide

### Constants (`app/constants/index.ts`)
Static configuration values:
- `STORAGE_KEY` - localStorage key for session
- `steps` - wizard step names array
- `loadingStages` - loading screen messages
- `signalVendors`, `signalTypes` - vendor/signal options
- `programElements` - GTM program structure

### Types (`app/types/index.ts`)
All TypeScript interfaces:
- `IdealCompanyProfile`, `BuyingCommitteeMember` - ICP data
- `CompanyAnalysis`, `CompetitiveData`, `ContentStrategyData` - research outputs
- `IcpResearchData`, `SignalSystemEntry`, `JtbdEntry` - signal system
- `ReportData`, `AlphaSignal`, `PillarContent`, `PodcastGuest` - report outputs

### API Layer (`app/lib/api.ts`)
External API calls:
- `callClaude(prompt)` - Claude with web search tool
- `fetchLinkedInData(action, params)` - Anysite MCP for LinkedIn
- `syncHubSpotContact(email, properties, stepName)` - HubSpot upsert

### Prompts (`app/lib/prompts.ts`)
Claude prompt generators (all pure functions with explicit params):
- `getCompanyPrompt(params)` - Prompt 3: Company analysis
- `getICPPrompt(params)` - Prompt 4: ICP & Signal System
- `getCompetitivePrompt(params)` - Prompt 5: Competitive analysis
- `getContentPrompt(params)` - Prompt 6: Content strategy
- `getAlphaSignalsPrompt(params)` - Prompt 7: Alpha signals
- `getPillarContentPrompt(params)` - Prompt 8: Pillar content
- `getPodcastGuestsPrompt(params)` - Prompt 9: Podcast guests
- `getRefinementPrompt(...)` - Prompt 11: User feedback refinement

### Parsers (`app/lib/parsers.ts`)
Pure parsing functions (input → typed output):
- `parseCompanyAnalysis(text)` → `CompanyAnalysis`
- `parseIcpResearch(text)` → `{icpData, signalSystemSummary, topSignals}`
- `parseCompetitiveAnalysis(text)` → `CompetitiveData`
- `parseContentStrategy(text)` → `ContentStrategyData`
- `parseIntoSections(text)` → `ParsedSection[]`
- `parsePersonas(content)` → `ParsedPersona[]`

### Formatters (`app/lib/formatters.ts`)
Text cleanup utilities:
- `stripMarkdown(text)` - Remove markdown syntax
- `cleanResponse(text)` - Remove AI preambles, fix punctuation
- `cleanCompetitiveResponse(text)` - Competitive-specific cleanup

## Key Patterns

### Adding a Research Phase
1. Add type definitions to `app/types/index.ts`
2. Create prompt function in `app/lib/prompts.ts` with param interface
3. Create parser function in `app/lib/parsers.ts`
4. Update `buildPromptForPhase()` in `page.tsx`
5. Add parser handler in `page.tsx`

### Adding a Wizard Step
1. Add step name to `steps` array in `app/constants/index.ts`
2. Add state if needed (useState hooks in page.tsx)
3. Add `render[StepName]()` function in page.tsx
4. Add conditional render at bottom of component

### Research Phase Data Flow
```javascript
// In page.tsx - use buildPromptForPhase helper
const buildPromptForPhase = (phase: string): string => {
  switch (phase) {
    case "company":
      return getCompanyPrompt({ domain, companyType, ... });
    // ...
  }
};

// Chain dependent phases via useEffect
useEffect(() => {
  if (step === "research-content"
      && icpResearchData.jtbdList.length > 0
      && !research.content.initial) {
    runResearchPhase("content");
  }
}, [currentStep, icpResearchData.jtbdList.length, ...]);
```

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
Custom properties use `gtmos_` prefix: `gtmos_company_research`, `gtmos_content_grade`, etc.

## Common Tasks

### Modify AI Prompts
Edit prompt functions in `app/lib/prompts.ts`

### Add New Parser
1. Add to `app/lib/parsers.ts`
2. Add type to `app/types/index.ts`
3. Import and use in `page.tsx`

### Change HubSpot Fields
1. Update `generateReport()` in `page.tsx`
2. Ensure HubSpot has matching custom property created

### Update Styling
Use existing Tailwind classes:
- Cards: `bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm`
- Primary buttons: `bg-[#ff6f20]` (brand orange)
- Secondary: `bg-[#5b2e5e]` (brand purple)
- Text: `text-white/60` for muted, `text-[#ff6f20]` for accent
- Typography: Montserrat for headings, Open Sans for body

### Brand Colors (globals.css)
```css
--brand-primary: #ff6f20;    /* Orange - CTAs, accents */
--brand-primary-2: #5b2e5e;  /* Purple - secondary */
--brand-accent: #ff7a24;     /* CTA hover */
--background: #070606;       /* Dark background */
--foreground: #f9f9f9;       /* Light text */
```

## Testing
No automated tests. Manual testing workflow:
1. Run `npm run dev`
2. Enter any company URL
3. Step through wizard
4. Verify HubSpot records created (if tokens configured)

# GTM OS Process Prompts - Complete Data Flow Documentation

This document maps all prompts used in the GTM OS Builder, their inputs, outputs, and how data flows between them.

---

## System Flow Diagram

```
                           USER INPUT
                               |
                               v
                    +---------------------+
                    |    WIZARD START     |
                    |  - Website URL      |
                    |  - Contact Info     |
                    +---------------------+
                               |
                               v
           +-------------------------------------------+
           |          PROMPT 1: Product Extraction     |
           |   (Haiku - Fast, with web search)         |
           +-------------------------------------------+
                               |
             [companyType, primaryOffering, products]
                               |
                               v
           +-------------------------------------------+
           |           PROMPT 2: ICP Discovery         |
           |   (Sonnet - with web search)              |
           +-------------------------------------------+
                               |
    [idealCompanyProfile, buyingCommittee, painTriggers]
                               |
                +------+-------+-------+
                |      |       |       |
                v      v       v       v
           +-------+ +---+ +-------+ +--------+
           | P3    | |P4 | | P5    | | P6     |
           |Company| |ICP| |Compet.| |Content |
           +-------+ +---+ +-------+ +--------+
                |      |       |       |
                +------+-------+-------+
                               |
             [companyAnalysis, icpResearchData,
              competitiveData, contentStrategyData]
                               |
                               v
           +-------------------------------------------+
           |         FINAL REPORT GENERATION           |
           |     (Opus - Narrative + Sonnet/Opus)      |
           +-------------------------------------------+
                               |
                v              v               v               v
     +----------------+ +-----------+ +---------------+ +------------+
     | P7: Narrative  | | P8: Alpha | | P9: Pillar    | | P10: Guest |
     | (Opus)         | | Signals   | | Content       | | Archetypes |
     +----------------+ +-----------+ +---------------+ +------------+
                               |
                               v
                    +---------------------+
                    |    FINAL REPORT     |
                    |    + PDF Export     |
                    +---------------------+
```

---

## Prompt Sequence & Data Flow

---

## PROMPT 1: Product Extraction

**Location:** `page.tsx` (inline, lines ~838-878)
**Model:** Haiku (fast extraction)
**Web Search:** Yes

### Purpose
Extracts company products/offerings and business type from website analysis.

### Inputs
| Variable | Source | Description |
|----------|--------|-------------|
| `domain` | User input (parsed from URL) | Company domain |

### Prompt Text
```
You are a B2B market research analyst conducting the first stage of a
go-to-market diagnostic.

Given a company domain, identify what they sell and how to categorize
their business.

DOMAIN: ${domain}

RESEARCH APPROACH:
1. Primary source: The company's official website - prioritize /products,
   /solutions, /services, /pricing, and /platform pages
2. Secondary sources: G2, Capterra, Crunchbase, or LinkedIn company page
   for validation
3. Focus on commercial offerings (what they sell to customers), NOT internal
   tools, tech stack, or integrations they consume

COMPANY TYPE OPTIONS:
- Product-Led SaaS
- Sales-Led SaaS
- Platform / Marketplace
- Professional Services
- Agency
- Hybrid (Product + Services)
- Other: [specify]

RULES:
- Do NOT list pricing tiers (e.g., "Pro", "Enterprise") as separate offerings
- Do NOT list features as products
- For service businesses, list distinct service categories
- Maximum 6 additional offerings
```

### JSON Schema
```json
{
  "companyType": "One of: Product-Led SaaS, Sales-Led SaaS, Platform / Marketplace, Professional Services, Agency, Hybrid, Other",
  "primaryOffering": "The core product or service name",
  "additionalOfferings": ["other product 1", "other product 2"]
}
```

### Outputs (State Variables Set)
| Variable | Type | Used By |
|----------|------|---------|
| `companyType` | string | Prompts 2-9 |
| `primaryOffering` | string | Product selection |
| `products` | string[] | Product selection UI |

---

## PROMPT 2: ICP Discovery

**Location:** `page.tsx` (inline, lines ~988-1002)
**Model:** Sonnet
**Web Search:** Yes

### Purpose
Identifies ideal company profile and buying committee personas based on selected product.

### Inputs
| Variable | Source | Description |
|----------|--------|-------------|
| `selectedProduct` | User selection (from Prompt 1) | Chosen product to analyze |
| `domain` | User input | Company domain |
| `companyType` | Prompt 1 output | Business category |

### Prompt Text
```
You are identifying the BUYER PERSONAS for a B2B product. Your job is to
identify the specific JOB TITLES of people who buy this product.

PRODUCT: ${selectedProduct}
COMPANY: ${domain}
COMPANY TYPE: ${companyType || "B2B Company"}

IMPORTANT: Return ACTUAL JOB TITLES (like "VP of Sales", "IT Director",
"RevOps Manager"), NOT market segments or company descriptions.

RESEARCH:
- Look at G2/Capterra reviewer titles
- Check case studies for buyer titles mentioned
- Search LinkedIn for people who use/implement this product

Return 3-5 buying committee members. Each "role" must be a real job title
(2-5 words like "Sales Operations Manager" or "CISO"), not a description.
```

### JSON Schema
```json
{
  "idealCompanyProfile": {
    "description": "2-3 sentence description of target company",
    "companyStage": "e.g., Growth stage, Enterprise, SMB",
    "companySize": "e.g., 50-200 employees",
    "industryVerticals": ["industry1", "industry2"],
    "keyCharacteristics": ["characteristic1", "characteristic2"]
  },
  "buyingCommittee": [
    {
      "role": "Specific Job Title (e.g., VP of Sales)",
      "type": "Economic Buyer | Champion | Evaluator | End User",
      "painTrigger": "Their specific problem",
      "evaluationPriority": "What they care about when comparing"
    }
  ]
}
```

### Outputs (State Variables Set)
| Variable | Type | Used By |
|----------|------|---------|
| `idealCompanyProfile` | IdealCompanyProfile | Prompts 3-9 |
| `buyingCommittee` | BuyingCommitteeMember[] | Prompts 4-9 |
| `discoveredICPs` | DiscoveredICP[] | Prompts 4-9, UI display |
| `primaryBuyerRole` | string | Prompt 3 |
| `painTriggers` | string[] | Prompt 7 |

---

## PROMPT 3: Company Analysis

**Location:** `app/lib/prompts.ts` - `getCompanyPrompt()`
**Model:** Sonnet (default)
**Web Search:** Yes

### Purpose
Analyzes company positioning, pain points addressed, and surfaces positioning insights.

### Inputs
| Variable | Source | Description |
|----------|--------|-------------|
| `domain` | User input | Company domain |
| `companyType` | Prompt 1 | Business category |
| `selectedProduct` | User selection | Product being analyzed |
| `idealCompanyProfile` | Prompt 2 | Target company profile |
| `primaryBuyerRole` | Prompt 2 | Primary buyer title |

### Prompt Summary
- Analyze website positioning, product pages, about page
- Research G2, Capterra, LinkedIn, Crunchbase
- Assess positioning clarity and competitive stance
- Surface positioning observations

### Output Sections
```
WHAT YOU DO
THE PAIN YOU ADDRESS
HOW YOU'RE POSITIONED
POSITIONING OBSERVATION
```

### Outputs (State Variables Set)
| Variable | Type | Used By |
|----------|------|---------|
| `companyAnalysis.positioningSummary` | string | Prompts 5, 7, 8, 9, Narrative |
| `companyAnalysis.painAddressed` | string | Report display |
| `companyAnalysis.positioningObservation` | string | Prompts 8, 9, Narrative |

---

## PROMPT 4: ICP & Signal System

**Location:** `app/lib/prompts.ts` - `getICPPrompt()`
**Model:** Sonnet
**Web Search:** Yes

### Purpose
Defines Jobs-to-be-Done for buyer personas and creates buying signal detection system.

### Inputs
| Variable | Source | Description |
|----------|--------|-------------|
| `domain` | User input | Company domain |
| `companyType` | Prompt 1 | Business category |
| `selectedProduct` | User selection | Product being analyzed |
| `idealCompanyProfile` | Prompt 2 | Target company profile |
| `buyingCommittee` | Prompt 2 | Buyer personas |
| `discoveredICPs` | Prompt 2 | ICP list (fallback) |

### Prompt Summary
- Define JTBD for top 3 personas
- Create 6-8 buying signals across categories:
  - BEHAVIORAL SIGNALS
  - TECHNOGRAPHIC SIGNALS
  - INTENT SIGNALS
  - CONTEXTUAL SIGNALS
- Identify signal blind spot

### JSON Schema
```json
{
  "jobsToBeDone": [
    {"persona": "Title", "jtbd": "When [situation], I want to [action], so I can [outcome]"}
  ],
  "signalSystem": [
    {
      "category": "Category",
      "signalName": "Name",
      "whatToDetect": "Detection criteria",
      "recommendedMotion": "Action"
    }
  ],
  "signalBlindSpot": "Description of missed signal opportunity"
}
```

### Outputs (State Variables Set)
| Variable | Type | Used By |
|----------|------|---------|
| `icpResearchData.jtbdList` | JtbdEntry[] | Prompts 6, 8, 9 |
| `icpResearchData.signalSystem` | SignalSystemEntry[] | Prompts 7, 8, 9 |
| `icpResearchData.signalBlindSpot` | string | Report display |
| `signalSystemSummary` | string[] | Prompt 7 |
| `topSignals` | SignalSystemEntry[] | Prompts 8, 9, Narrative |

---

## PROMPT 5: Competitive Analysis

**Location:** `app/lib/prompts.ts` - `getCompetitivePrompt()`
**Model:** Sonnet
**Web Search:** Yes

### Purpose
Analyzes competitive landscape, identifies competitors, gaps, and defensibility.

### Inputs
| Variable | Source | Description |
|----------|--------|-------------|
| `domain` | User input | Company domain |
| `selectedProduct` | User selection | Product being analyzed |
| `companyType` | Prompt 1 | Business category |
| `companyAnalysis` | Prompt 3 | Positioning data |
| `idealCompanyProfile` | Prompt 2 | Target company profile |

### Prompt Summary
- Research G2, Capterra, TrustRadius comparisons
- Identify 3-6 competitors with strengths/weaknesses
- Find competitive gaps and opportunities
- Assess defensibility honestly

### JSON Schema
```json
{
  "competitiveLandscape": "2-3 sentences about the competitive environment",
  "competitors": [
    {
      "name": "Competitor",
      "primaryStrength": "Their advantage",
      "primaryWeakness": "Their weakness",
      "battleground": "Where you compete"
    }
  ],
  "competitiveGaps": "Market gaps and opportunities",
  "defensibilityAssessment": "Assessment of competitive moat"
}
```

### Outputs (State Variables Set)
| Variable | Type | Used By |
|----------|------|---------|
| `competitiveData.competitiveLandscape` | string | Prompt 7, Report |
| `competitiveData.competitorComparison` | CompetitorComparison[] | Report display |
| `competitiveData.competitiveGaps` | string | Prompts 8, Narrative |
| `competitiveData.defensibilityAssessment` | string | Narrative |

---

## PROMPT 6: Content Strategy Audit

**Location:** `app/lib/prompts.ts` - `getContentPrompt()`
**Model:** Sonnet
**Web Search:** Yes

### Purpose
Audits existing content strategy, grades effectiveness, provides recommendations.

### Inputs
| Variable | Source | Description |
|----------|--------|-------------|
| `domain` | User input | Company domain |
| `selectedProduct` | User selection | Product being analyzed |
| `idealCompanyProfile` | Prompt 2 | Target company profile |
| `buyingCommittee` | Prompt 2 | Buyer personas |
| `discoveredICPs` | Prompt 2 | ICP list |
| `icpResearchData` | Prompt 4 | JTBD and signals |

### Prompt Summary
- Audit blog, LinkedIn presence, podcasts, gated assets
- Assess buyer alignment with personas and JTBDs
- Evaluate signal capture opportunities
- Grade content A-F with rationale
- Provide 3 ranked recommendations

### JSON Schema
```json
{
  "contentFootprint": "What content assets exist",
  "buyerAlignmentAudit": "Assessment of content vs buyer personas",
  "signalOpportunityAssessment": "Content as signal generation mechanism",
  "contentGrade": "A/B/C/D/F",
  "contentGradeRationale": "2-3 sentences explaining the grade",
  "priorityRecommendations": [
    {
      "rank": 1,
      "impact": "HIGHEST IMPACT",
      "title": "Rec title",
      "explanation": "Why this matters"
    }
  ]
}
```

### Outputs (State Variables Set)
| Variable | Type | Used By |
|----------|------|---------|
| `contentStrategyData.contentFootprint` | string | Report display |
| `contentStrategyData.buyerAlignmentAudit` | string | Prompts 8, 9, Narrative |
| `contentStrategyData.signalOpportunityAssessment` | string | Report |
| `contentStrategyData.contentGrade` | string | Narrative |
| `contentStrategyData.contentGradeRationale` | string | Report |
| `contentStrategyData.priorityRecommendations` | PriorityRecommendation[] | Narrative |

---

## PROMPT 7: Report Narrative (Final Assessment)

**Location:** `page.tsx` (inline, lines ~1107-1167)
**Model:** Opus (premium quality)
**Web Search:** No

### Purpose
Synthesizes all research into a memorable 3-paragraph executive summary.

### Inputs
| Variable | Source | Description |
|----------|--------|-------------|
| `companyName` | User input | Company name |
| `domain` | User input | Company domain |
| `selectedProduct` | User selection | Product analyzed |
| `companyType` | Prompt 1 | Business category |
| `companyAnalysis.positioningSummary` | Prompt 3 | Positioning text (400 chars) |
| `companyAnalysis.positioningObservation` | Prompt 3 | Key insight (200 chars) |
| `idealCompanyProfile.rawText` | Prompt 2 | ICP description |
| `primaryBuyerRole` | Prompt 2 | Primary buyer title |
| `topSignals` (top 3) | Prompt 4 | Key buying signals |
| `competitiveData.defensibilityAssessment` | Prompt 5 | Competitive moat (300 chars) |
| `contentStrategyData.contentGrade` | Prompt 6 | Content grade |
| `contentStrategyData.buyerAlignmentAudit` | Prompt 6 | Content gaps (300 chars) |
| `contentStrategyData.priorityRecommendations[0]` | Prompt 6 | Top recommendation |

### Prompt Summary
- Straight-talking GTM advisor voice
- Short, punchy sentences
- No consultant-speak
- 120-150 words total

### Output Structure
```
[Paragraph 1: WHAT'S WORKING]
[Paragraph 2: THE GAP]
[Paragraph 3: THE UNLOCK]
```

### Outputs
| Variable | Type | Used By |
|----------|------|---------|
| `reportData.narrative` | string | Final report display |

---

## PROMPT 8: Alpha Signals

**Location:** `app/lib/prompts.ts` - `getAlphaSignalsPrompt()`
**Model:** Sonnet
**Web Search:** Yes

### Purpose
Identifies 3 unique buying signals that competitors miss.

### Inputs
| Variable | Source | Description |
|----------|--------|-------------|
| `domain` | User input | Company domain |
| `companyName` | User input | Company name |
| `selectedProduct` | User selection | Product analyzed |
| `companyType` | Prompt 1 | Business category |
| `idealCompanyProfile` | Prompt 2 | Target company |
| `buyingCommittee` | Prompt 2 | Buyer personas |
| `discoveredICPs` | Prompt 2 | ICP list |
| `painTriggers` | Prompt 2 | Pain points |
| `competitiveData` | Prompt 5 | Competitive landscape |
| `signalSystemSummary` | Prompt 4 | Existing signals |

### Prompt Summary
- Find signals that fire EARLY, are NON-OBVIOUS, DETECTABLE, SPECIFIC
- Each signal: name, why alpha, source, detection, motion, example

### JSON Schema
```json
{
  "signals": [
    {
      "name": "Signal name",
      "whyAlpha": "Why competitors miss this",
      "source": "Detection source",
      "detection": "What to look for",
      "motion": "Action to take",
      "example": "Specific example"
    }
  ]
}
```

### Outputs
| Variable | Type | Used By |
|----------|------|---------|
| `alphaSignals` | AlphaSignal[] | Final report display |

---

## PROMPT 9: Pillar Content Concepts

**Location:** `app/lib/prompts.ts` - `getPillarContentPrompt()`
**Model:** Opus (strategic creative)
**Web Search:** Yes

### Purpose
Designs 2-3 high-value content concepts that fill gaps and create signal opportunities.

### Inputs
| Variable | Source | Description |
|----------|--------|-------------|
| `domain` | User input | Company domain |
| `companyName` | User input | Company name |
| `selectedProduct` | User selection | Product analyzed |
| `companyType` | Prompt 1 | Business category |
| `idealCompanyProfile` | Prompt 2 | Target company |
| `buyingCommittee` | Prompt 2 | Buyer personas |
| `discoveredICPs` | Prompt 2 | ICP list |
| `icpResearchData` | Prompt 4 | JTBD data |
| `topSignals` | Prompt 4 | Key signals |
| `contentStrategyData` | Prompt 6 | Content gaps |
| `competitiveData` | Prompt 5 | Competitive gaps |
| `companyAnalysis` | Prompt 3 | Positioning |

### Prompt Summary
- Content fills gap from audit
- Data-driven with signal capture
- Includes angle, target buyer, data foundation, repurposing roadmap

### JSON Schema
```json
{
  "concepts": [
    {
      "title": "Concept title",
      "angle": "The angle/approach",
      "targetBuyer": "Target persona and buying stage",
      "dataFoundation": "Data sources and signal connections",
      "signalCapture": "How to capture engagement signals",
      "repurposing": "Content repurposing roadmap",
      "cadence": "Update frequency and triggers"
    }
  ]
}
```

### Outputs
| Variable | Type | Used By |
|----------|------|---------|
| `pillarContent` | PillarContent[] | Final report display |

---

## PROMPT 10: Podcast Guest Archetypes

**Location:** `app/lib/prompts.ts` - `getPodcastGuestsPrompt()`
**Model:** Opus (strategic creative)
**Web Search:** Yes

### Purpose
Designs 4-5 strategic podcast guest archetypes for relationship building.

### Inputs
| Variable | Source | Description |
|----------|--------|-------------|
| `domain` | User input | Company domain |
| `companyName` | User input | Company name |
| `selectedProduct` | User selection | Product analyzed |
| `idealCompanyProfile` | Prompt 2 | Target company |
| `buyingCommittee` | Prompt 2 | Buyer personas |
| `discoveredICPs` | Prompt 2 | ICP list |
| `icpResearchData` | Prompt 4 | JTBD data |
| `contentStrategyData` | Prompt 6 | Content gaps |
| `companyAnalysis` | Prompt 3 | Positioning |
| `topSignals` | Prompt 4 | Key signals |

### Prompt Summary
- Mix of ICP Guests (2-3) and Amplifier Guests (1-2)
- Each: archetype, type, profile, ICP connection, topic, strategic value

### JSON Schema
```json
{
  "guests": [
    {
      "archetype": "Guest archetype title",
      "guestType": "ICP Guest | Amplifier Guest",
      "profile": "Role, company type, characteristics",
      "icpConnection": "Relationship or reach value",
      "topic": "Episode topic",
      "strategicValue": "Strategic benefit"
    }
  ]
}
```

### Outputs
| Variable | Type | Used By |
|----------|------|---------|
| `podcastGuests` | PodcastGuest[] | Final report display |

---

## PROMPT 11: Refinement (Feedback Processing)

**Location:** `app/lib/prompts.ts` - `getRefinementPrompt()`
**Model:** Sonnet
**Web Search:** No (uses existing data)

### Purpose
Processes user feedback to refine any research section.

### Inputs
| Variable | Source | Description |
|----------|--------|-------------|
| `sectionType` | UI selection | company/icp/competitive/content |
| `originalResearch` | Previous output | Original analysis text |
| `userFeedback` | User input | Feedback to incorporate |
| `relatedSections` | Other research | Context from other sections |

### Feedback Classification
1. FACTUAL CORRECTION - Accept gracefully
2. ADDITIONAL CONTEXT - Incorporate and strengthen
3. PREFERENCE WITHOUT REASONING - Probe gently
4. STRATEGIC DISAGREEMENT - Engage the reasoning
5. SCOPE EXPANSION - Add where valuable
6. MISUNDERSTANDING - Clarify without condescension

### Output Structure
```
[REFINED ANALYSIS with same headers as original]

---

ANALYST NOTES

INCORPORATED:
- [What was accepted and why]

ADJUSTED:
- [What was partially incorporated]

MAINTAINED POSITION:
- [What was respectfully declined and why]

CASCADE FLAG:
- [What other sections may need updates]
```

---

## Complete Data Dependency Map

```
                    User Input
                    -----------
                    websiteUrl --> domain
                    email, companyName, role
                         |
                         v
    +------------------[Prompt 1]-----------------+
    |            Product Extraction               |
    +---------------------------------------------+
         |              |               |
    companyType    primaryOffering   products[]
         |              |               |
         +--------------+-------+-------+
                        |       |
                        v       v
    +------------------[Prompt 2]-----------------+
    |              ICP Discovery                  |
    +---------------------------------------------+
              |              |              |
    idealCompanyProfile  buyingCommittee  painTriggers
              |              |              |
              +--------------+--------------+
                             |
        +--------+--------+--+--+--------+
        |        |           |           |
        v        v           v           v
    [Prompt 3] [Prompt 4] [Prompt 5] [Prompt 6]
     Company     ICP       Compet.    Content
     Analysis   Signals    Analysis   Strategy
        |        |           |           |
        v        v           v           v
    companyAna- icpResear-  competitive- contentStr-
    lysis       chData      Data         ategyData
        |        |           |           |
        +--------+--------+--+--+--------+
                          |
                          v
    +-------------------[Prompt 7]------------------+
    |           Report Narrative (Opus)             |
    |         Uses ALL upstream data                |
    +-----------------------------------------------+
                          |
              +-----------+-----------+
              |           |           |
              v           v           v
         [Prompt 8]  [Prompt 9]  [Prompt 10]
          Alpha      Pillar      Podcast
         Signals    Content      Guests
              |           |           |
              v           v           v
         alphaSign-  pillarCon-  podcastGu-
         als[]       tent[]      ests[]
                          |
                          v
    +-----------------------------------------------+
    |              FINAL REPORT                     |
    |  narrative + alphaSignals + pillarContent     |
    |             + podcastGuests                   |
    +-----------------------------------------------+
```

---

## Type Definitions Reference

### Core State Types

```typescript
interface IdealCompanyProfile {
  companyStage: string;      // e.g., "Growth stage"
  companySize: string;       // e.g., "50-200 employees"
  industryVerticals: string[];
  keyCharacteristics: string[];
  rawText: string;           // Full description
}

interface BuyingCommitteeMember {
  role: string;              // Job title
  type: string;              // Economic Buyer | Champion | Evaluator | End User
  painTrigger: string;       // Their specific problem
  evaluationPriority: string; // What they care about
}

interface CompanyAnalysis {
  positioningSummary: string;     // What they do
  painAddressed: string;          // Pain they solve
  positioningObservation: string; // Key insight
}

interface IcpResearchData {
  jtbdList: JtbdEntry[];          // Jobs to be done
  signalSystem: SignalSystemEntry[];
  signalBlindSpot: string;
}

interface SignalSystemEntry {
  category: string;               // BEHAVIORAL, TECHNOGRAPHIC, etc.
  signalName: string;
  whatToDetect: string;
  recommendedMotion: string;
}

interface CompetitiveData {
  competitiveLandscape: string;
  competitorComparison: CompetitorComparison[];
  competitiveGaps: string;
  defensibilityAssessment: string;
}

interface ContentStrategyData {
  contentFootprint: string;
  buyerAlignmentAudit: string;
  signalOpportunityAssessment: string;
  contentGrade: string;           // A/B/C/D/F
  contentGradeRationale: string;
  priorityRecommendations: PriorityRecommendation[];
}

interface AlphaSignal {
  name: string;
  whyAlpha: string;
  source: string;
  detection: string;
  motion: string;
  example: string;
}

interface PillarContent {
  title: string;
  angle: string;
  targetBuyer: string;
  dataFoundation: string;
  signalCapture: string;
  repurposing: string;
  cadence: string;
}

interface PodcastGuest {
  archetype: string;
  guestType: string;
  profile: string;
  icpConnection: string;
  topic: string;
  strategicValue: string;
}
```

---

## Execution Timing

| Phase | Trigger | Prompts Executed |
|-------|---------|------------------|
| Step: select-product | Submit contact info | Prompt 1 (parallel with website fetch) |
| Step: icp-selection | Product selected | Prompt 2 |
| Step: research-company | Enter step | Prompt 3, Prompt 4 (background) |
| Step: research-content | ICP data ready | Prompt 6 |
| Step: generating | Enter step | Prompt 5 (background), Prompts 7-10 (parallel) |

---

## Model Usage Summary

| Model | Prompts | Use Case |
|-------|---------|----------|
| **Haiku** | 1 | Fast extraction, simple classification |
| **Sonnet** | 2, 3, 4, 5, 6, 8, 11 | Research, analysis, web search tasks |
| **Opus** | 7, 9, 10 | Creative synthesis, strategic planning |

---

## File Locations

| File | Purpose |
|------|---------|
| `app/lib/prompts.ts` | Prompt functions 3-6, 8-11 + helper functions |
| `app/page.tsx` | Prompt 1 (inline), Prompt 2 (inline), Prompt 7 (inline), orchestration |
| `app/types/index.ts` | All TypeScript interfaces |
| `app/lib/api.ts` | `callClaude`, `callClaudeJSON` functions |
| `app/lib/parsers.ts` | Response parsing utilities |

# Signal-Driven GTM OS Builder
## Chain Data Schema v1.0

---

## Overview

This document defines the data contract between prompts in the GTM diagnostic system. Each prompt produces structured outputs that downstream prompts consume. Maintaining schema consistency ensures:

- **Chain integrity** — No broken references or missing inputs
- **Output consistency** — Downstream prompts can rely on predictable formats
- **Cascade tracking** — When upstream data changes, affected downstream sections are identifiable

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INPUT                                      │
│                              {domain}                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROMPT 1: PRODUCT DISCOVERY                          │
│                              [Foundation]                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌──────────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐
│ PROMPT 2: ICP        │  │ PROMPT 3:       │  │ User selects product if     │
│ DISCOVERY            │  │ COMPANY         │  │ multiple exist              │
│ [Buyers]             │  │ ANALYSIS        │  └─────────────────────────────┘
└──────────────────────┘  │ [Positioning]   │
          │               └─────────────────┘
          │                        │
          ▼                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        PROMPT 4: ICP RESEARCH                                 │
│                        [JTBDs + Signal System]                                │
└──────────────────────────────────────────────────────────────────────────────┘
          │
          ├─────────────────────────────────────────┐
          ▼                                         ▼
┌─────────────────────────┐              ┌─────────────────────────────────────┐
│ PROMPT 5: COMPETITIVE   │              │ PROMPT 6: CONTENT STRATEGY          │
│ ANALYSIS                │              │ [Audit + Recommendations]           │
└─────────────────────────┘              └─────────────────────────────────────┘
          │                                         │
          └──────────────┬──────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        PROMPT 7: EXECUTIVE SUMMARY                            │
│                        [Synthesis]                                            │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           PARALLEL/OPTIONAL TRACKS                            │
├────────────────────┬─────────────────────┬───────────────────────────────────┤
│ PROMPT 8:          │ PROMPT 9:           │ PROMPT 10:                        │
│ ALPHA SIGNALS      │ PILLAR CONTENT      │ PODCAST GUESTS                    │
│ [Advanced]         │ [Content Strategy]  │ [Relationship Strategy]           │
└────────────────────┴─────────────────────┴───────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                        PROMPT 11: REFINEMENT                                  │
│                        [Feedback Loop — Any Section]                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Variable Definitions

### Prompt 1 Outputs: Product Discovery

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `companyType` | Enum | Business model classification | `"Product-Led SaaS"` |
| `primaryOffering` | String | Core product/service name | `"SignalFlow"` |
| `additionalOfferings` | Array[String] | Other distinct products (max 6) | `["SignalFlow Analytics", "SignalFlow API"]` |
| `selectedProduct` | String | User-selected or primary product for analysis | `"SignalFlow"` |

**companyType Enum Values:**
- `Product-Led SaaS`
- `Sales-Led SaaS`
- `Platform / Marketplace`
- `Professional Services`
- `Agency`
- `Hybrid (Product + Services)`
- `Other: [specify]`

---

### Prompt 2 Outputs: ICP Discovery

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `idealCompanyProfile` | Object | Target company characteristics | See structure below |
| `buyingCommittee` | Array[Object] | Roles involved in purchase | See structure below |
| `primaryBuyerRole` | String | Most important role (Champion or Economic Buyer) | `"VP of Revenue Operations"` |
| `painTriggers` | Array[String] | Extracted pain triggers from buying committee | See structure below |

**idealCompanyProfile Structure:**
```json
{
  "companyStage": "Series B-C",
  "companySize": "50-200 employees",
  "industryVerticals": ["B2B SaaS", "FinTech"],
  "keyCharacteristics": ["Has a sales team of 10+", "Uses Salesforce or HubSpot"]
}
```

**buyingCommittee Structure:**
```json
[
  {
    "role": "VP of Revenue Operations",
    "type": "Champion",
    "painTrigger": "Pipeline forecasting is unreliable, deals slip without warning",
    "evaluationPriority": "Integration with existing CRM, time-to-value"
  },
  {
    "role": "CRO",
    "type": "Economic Buyer",
    "painTrigger": "Missing revenue targets due to poor pipeline visibility",
    "evaluationPriority": "ROI proof, executive dashboards"
  }
]
```

**painTriggers Extraction:**
```json
[
  "Pipeline forecasting is unreliable, deals slip without warning",
  "Missing revenue targets due to poor pipeline visibility",
  "Sales reps waste time on unqualified leads"
]
```

---

### Prompt 3 Outputs: Company Analysis

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `positioningSummary` | String | Combined "What You Do" + "How You're Positioned" | See below |
| `painAddressed` | String | The core pain point they solve | `"Revenue teams can't see which deals are at risk until it's too late"` |
| `positioningObservation` | String | Strategic insight about their GTM positioning | See below |

**positioningSummary Example:**
```
"SignalFlow provides revenue intelligence for B2B sales teams, 
surfacing deal risk signals before they become lost deals. 
Positioned as the 'early warning system' for pipeline, competing 
primarily on predictive accuracy rather than breadth of features."
```

**positioningObservation Example:**
```
"Your messaging emphasizes features (AI-powered, real-time alerts) 
rather than outcomes (never lose a deal to surprise again). 
Competitors are claiming the outcome positioning — you're leaving 
that ground undefended."
```

---

### Prompt 4 Outputs: ICP Research (Signals)

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `jtbdList` | Array[Object] | Jobs to be done for top personas | See structure below |
| `signalSystem` | Array[Object] | Categorized buying signals | See structure below |
| `signalSystemSummary` | Array[String] | Signal names only (for deduplication in Prompt 8) | See below |
| `topSignals` | Array[Object] | Top 3-4 highest-value signals | Subset of signalSystem |

**jtbdList Structure:**
```json
[
  {
    "persona": "VP of Revenue Operations",
    "jtbd": "When our pipeline forecast misses by more than 20%, I want to identify at-risk deals earlier, so I can intervene before they slip."
  },
  {
    "persona": "CRO",
    "jtbd": "When board meetings approach, I want confidence in our revenue projection, so I can commit to numbers I'll actually hit."
  }
]
```

**signalSystem Structure:**
```json
[
  {
    "category": "Behavioral",
    "signalName": "Pricing Page Return Visit",
    "whatToDetect": "Prospect visits pricing page 2+ times within 7 days",
    "recommendedMotion": "Warm Outreach"
  },
  {
    "category": "Contextual",
    "signalName": "CRO Leadership Change",
    "whatToDetect": "New CRO hired at target account within last 90 days",
    "recommendedMotion": "Executive Touch"
  }
]
```

**signalSystemSummary Example:**
```json
[
  "Pricing Page Return Visit",
  "CRO Leadership Change", 
  "Competitor Mentioned in Review",
  "RevOps Hiring Surge",
  "Tech Stack Evaluation Post"
]
```

---

### Prompt 5 Outputs: Competitive Analysis

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `competitiveLandscape` | String | 2-3 sentence market overview | See below |
| `competitorComparison` | Array[Object] | Competitor analysis table | See structure below |
| `competitiveGaps` | String | Whitespace opportunities | See below |
| `defensibilityAssessment` | String | Honest moat evaluation | See below |

**competitiveLandscape Example:**
```
"The revenue intelligence space is crowded but fragmented. 
Gong and Clari dominate enterprise, while a dozen smaller 
players compete for mid-market. Primary axis of competition 
is shifting from 'conversation intelligence' to 'predictive 
deal scoring.'"
```

**competitorComparison Structure:**
```json
[
  {
    "competitor": "Clari",
    "primaryStrength": "Deep Salesforce integration, strong enterprise brand",
    "primaryWeakness": "Complexity — requires dedicated admin, long implementation",
    "battleground": "Enterprise RevOps teams. Clari typically wins on breadth; you win on time-to-value."
  }
]
```

**competitiveGaps Example:**
```
"No one owns the 'first revenue intelligence tool' positioning 
for companies graduating from spreadsheets. The mid-market is 
underserved by solutions that don't require a 6-month implementation."
```

**defensibilityAssessment Example:**
```
"Moderate defensibility. Your speed advantage is real but 
replicable. The emerging moat is your signal library — if you 
can build proprietary pattern recognition from customer data, 
that compounds. Without it, you're competing on execution alone."
```

---

### Prompt 6 Outputs: Content Strategy

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `contentFootprint` | String | What content assets exist | See below |
| `buyerAlignmentAudit` | String | Gap analysis vs. personas | See below |
| `signalOpportunityAssessment` | String | Content as signal capture | See below |
| `contentGrade` | String | Letter grade + rationale | `"Grade: C\nRationale: Blog exists but unfocused..."` |
| `priorityRecommendations` | Array[Object] | Ranked content recommendations | See structure below |

**buyerAlignmentAudit Example:**
```
"Your blog serves the RevOps practitioner well — tactical content 
on forecasting and pipeline management. But the CRO (your economic 
buyer) has almost no content speaking to their priorities: board 
readiness, revenue predictability, strategic planning."
```

**priorityRecommendations Structure:**
```json
[
  {
    "rank": 1,
    "impact": "HIGHEST IMPACT",
    "title": "Create a 'Revenue Confidence' content track for executives",
    "explanation": "Your economic buyer has no content. Every CRO-focused piece becomes a signal opportunity — downloads indicate executive engagement at an account."
  }
]
```

---

### Prompt 7 Outputs: Executive Summary

| Variable | Type | Description |
|----------|------|-------------|
| `executiveSummary` | String | Three paragraphs: Working / Gap / Unlock |

*This is a terminal output — not consumed by other prompts.*

---

### Prompt 8 Outputs: Alpha Signals

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `alphaSignals` | Array[Object] | 3 competitively-advantaged signals | See structure below |

**alphaSignals Structure:**
```json
[
  {
    "signalName": "RevOps Community Engagement Spike",
    "whyAlpha": "Competitors monitor job boards but not niche Slack communities where practitioners vent about tool frustrations",
    "source": "RevOps Co-op Slack, Pavilion community",
    "detectionPattern": "Target account employees posting about forecasting pain or asking for tool recommendations",
    "recommendedMotion": "Warm Outreach",
    "example": "VP RevOps at Acme Corp posts in RevOps Co-op: 'Anyone else's forecast completely wrong this quarter?' — trigger immediate outreach."
  }
]
```

---

### Prompt 9 Outputs: Pillar Content

| Variable | Type | Description |
|----------|------|-------------|
| `pillarConcepts` | Array[Object] | 2-3 pillar content concepts |

**pillarConcepts Structure:**
```json
[
  {
    "title": "The Revenue Confidence Index: Quarterly Benchmark Report",
    "angle": "Aggregate anonymized data on forecast accuracy across industries. First benchmark of its kind — positions you as the authority on 'what good looks like.'",
    "targetBuyer": "CRO — Consideration stage",
    "dataFoundation": {
      "firstParty": "Customer forecast accuracy data (anonymized)",
      "thirdParty": "Public earnings reports, analyst estimates vs. actuals",
      "signalConnection": "Downloads correlate with active evaluation"
    },
    "signalCapture": "Gated with progressive profiling. Second download triggers sales alert.",
    "repurposingRoadmap": {
      "awareness": "LinkedIn carousel of key stats, podcast episode discussing findings",
      "consideration": "Interactive benchmark comparison tool",
      "decision": "Custom benchmark vs. customer proof points"
    },
    "cadence": "Quarterly refresh. New data = new launch moment each quarter."
  }
]
```

---

### Prompt 10 Outputs: Podcast Guests

| Variable | Type | Description |
|----------|------|-------------|
| `podcastRoster` | Array[Object] | 4-5 guest archetypes |

**podcastRoster Structure:**
```json
[
  {
    "archetypeTitle": "The Scaling VP of RevOps",
    "type": "ICP Guest",
    "profile": {
      "role": "VP of Revenue Operations",
      "companyType": "Series B SaaS, 80-150 employees",
      "characteristics": "Just inherited a messy Salesforce instance, trying to build forecasting rigor for the first time"
    },
    "icpConnection": "Represents your Champion persona. Podcast is warm outreach disguised as content.",
    "episodeTopic": "Building a Forecasting Culture When Your Data Is a Mess",
    "strategicValue": {
      "relationship": "Direct pipeline opportunity — 30-minute relationship with a potential buyer",
      "reach": "Will share with peer network of other scaling RevOps leaders",
      "signal": "Post-episode engagement (LinkedIn follow, return site visit) indicates active interest"
    }
  }
]
```

---

### Prompt 11 Inputs: Refinement

| Variable | Type | Description |
|----------|------|-------------|
| `sectionType` | Enum | Which prompt produced the original |
| `originalResearch` | String | Full output being refined |
| `userFeedback` | String | User's input/corrections |
| `relatedSections` | Object | Other sections for context (optional) |

**sectionType Enum Values:**
- `product_discovery`
- `icp_discovery`
- `company_analysis`
- `icp_research`
- `competitive_analysis`
- `content_strategy`
- `executive_summary`
- `alpha_signals`
- `pillar_content`
- `podcast_guests`

---

## Prompt Input Requirements

### Prompt 1: Product Discovery
```
REQUIRED INPUTS:
- domain: String (user-provided)

OUTPUTS USED BY:
- All downstream prompts
```

---

### Prompt 2: ICP Discovery
```
REQUIRED INPUTS:
- domain: String
- companyType: String (from Prompt 1)
- selectedProduct: String (from Prompt 1 or user selection)

OUTPUTS USED BY:
- Prompts 3, 4, 5, 6, 7, 8, 9, 10
```

---

### Prompt 3: Company Analysis
```
REQUIRED INPUTS:
- domain: String
- companyType: String (from Prompt 1)
- selectedProduct: String (from Prompt 1)
- idealCompanyProfile: Object (from Prompt 2)
- primaryBuyerRole: String (from Prompt 2)

OUTPUTS USED BY:
- Prompts 5, 7, 9, 10
```

---

### Prompt 4: ICP Research (Signals)
```
REQUIRED INPUTS:
- domain: String
- selectedProduct: String (from Prompt 1)
- companyType: String (from Prompt 1)
- idealCompanyProfile: Object (from Prompt 2)
- buyingCommittee: Array[Object] (from Prompt 2)

OUTPUTS USED BY:
- Prompts 6, 7, 8, 9, 10
```

---

### Prompt 5: Competitive Analysis
```
REQUIRED INPUTS:
- domain: String
- selectedProduct: String (from Prompt 1)
- companyType: String (from Prompt 1)
- positioningSummary: String (from Prompt 3)
- idealCompanyProfile: Object (from Prompt 2)

OUTPUTS USED BY:
- Prompts 7, 8, 9
```

---

### Prompt 6: Content Strategy
```
REQUIRED INPUTS:
- domain: String
- selectedProduct: String (from Prompt 1)
- idealCompanyProfile: Object (from Prompt 2)
- buyingCommittee: Array[Object] (from Prompt 2)
- jtbdList: Array[Object] (from Prompt 4)
- signalSystem: Array[Object] (from Prompt 4)

OUTPUTS USED BY:
- Prompts 7, 9
```

---

### Prompt 7: Executive Summary
```
REQUIRED INPUTS:
- companyName: String
- selectedProduct: String (from Prompt 1)
- companyType: String (from Prompt 1)
- positioningSummary: String (from Prompt 3)
- positioningObservation: String (from Prompt 3)
- idealCompanyProfile: Object (from Prompt 2)
- primaryBuyerRole: String (from Prompt 2)
- topSignals: Array[Object] (from Prompt 4)
- defensibilityAssessment: String (from Prompt 5)
- contentGrade: String (from Prompt 6)
- buyerAlignmentAudit: String (from Prompt 6)
- priorityRecommendation1: Object (from Prompt 6)

OUTPUTS USED BY:
- None (terminal output)
```

---

### Prompt 8: Alpha Signals
```
REQUIRED INPUTS:
- companyName: String
- selectedProduct: String (from Prompt 1)
- companyType: String (from Prompt 1)
- idealCompanyProfile: Object (from Prompt 2)
- buyingCommittee: Array[Object] (from Prompt 2)
- painTriggers: Array[String] (from Prompt 2)
- competitiveLandscape: String (from Prompt 5)
- signalSystemSummary: Array[String] (from Prompt 4)

OUTPUTS USED BY:
- Prompt 7 (optional enhancement)
```

---

### Prompt 9: Pillar Content
```
REQUIRED INPUTS:
- companyName: String
- selectedProduct: String (from Prompt 1)
- companyType: String (from Prompt 1)
- idealCompanyProfile: Object (from Prompt 2)
- buyingCommittee: Array[Object] (from Prompt 2)
- jtbdList: Array[Object] (from Prompt 4)
- topSignals: Array[Object] (from Prompt 4)
- buyerAlignmentAudit: String (from Prompt 6)
- competitiveGaps: String (from Prompt 5)
- positioningObservation: String (from Prompt 3)

OUTPUTS USED BY:
- None (terminal output)
```

---

### Prompt 10: Podcast Guests
```
REQUIRED INPUTS:
- companyName: String
- selectedProduct: String (from Prompt 1)
- idealCompanyProfile: Object (from Prompt 2)
- buyingCommittee: Array[Object] (from Prompt 2)
- jtbdList: Array[Object] (from Prompt 4)
- buyerAlignmentAudit: String (from Prompt 6)
- positioningObservation: String (from Prompt 3)
- topSignals: Array[Object] (from Prompt 4)

OUTPUTS USED BY:
- None (terminal output)
```

---

### Prompt 11: Refinement
```
REQUIRED INPUTS:
- sectionType: Enum
- originalResearch: String
- userFeedback: String

OPTIONAL INPUTS:
- relatedSections: Object (context from other sections)

OUTPUTS:
- Refined version of the original section
- Analyst notes explaining changes
- Cascade flags if applicable
```

---

## Cascade Dependencies

When a section changes, these downstream sections may need regeneration:

| If This Changes... | Regenerate These... |
|--------------------|---------------------|
| Prompt 1 (Product Discovery) | All downstream (2-10) |
| Prompt 2 (ICP Discovery) | 3, 4, 5, 6, 7, 8, 9, 10 |
| Prompt 3 (Company Analysis) | 5, 7, 9, 10 |
| Prompt 4 (ICP Research) | 6, 7, 8, 9, 10 |
| Prompt 5 (Competitive) | 7, 8, 9 |
| Prompt 6 (Content) | 7, 9 |
| Prompts 7-10 | No cascades (terminal) |

---

## Implementation Notes

### Data Extraction

Some prompts require extracting subfields from earlier outputs:

**From Prompt 2 → Prompt 8:**
```javascript
// Extract painTriggers from buyingCommittee
const painTriggers = buyingCommittee.map(member => member.painTrigger);
```

**From Prompt 4 → Prompt 8:**
```javascript
// Extract signal names to avoid duplication
const signalSystemSummary = signalSystem.map(signal => signal.signalName);
```

**From Prompt 6 → Prompt 7:**
```javascript
// Extract first priority recommendation
const priorityRecommendation1 = priorityRecommendations[0];
```

---

### Error Handling

Each prompt can return error states that should halt the chain:

| Error State | Action |
|-------------|--------|
| `UNABLE TO ANALYZE: [reason]` | Surface to user, do not proceed |
| `LIMITED VISIBILITY: [reason]` | Proceed with warning flag |
| `B2C PRODUCT DETECTED` | Surface to user, offer to continue or exit |
| `INSUFFICIENT DATA: [reason]` | Proceed with confidence caveat |

---

### Parallel Execution

Some prompts can run in parallel to reduce total latency:

**Parallel Group 1 (after Prompt 1):**
- Prompt 2 (ICP Discovery)
- Prompt 3 (Company Analysis)

**Parallel Group 2 (after Prompts 2 + 3):**
- Prompt 4 (ICP Research)
- Prompt 5 (Competitive Analysis)

**Parallel Group 3 (after Prompt 4):**
- Prompt 6 (Content Strategy)
- Prompt 8 (Alpha Signals)

**Parallel Group 4 (after Prompts 5 + 6):**
- Prompt 9 (Pillar Content)
- Prompt 10 (Podcast Guests)

**Sequential (requires all prior):**
- Prompt 7 (Executive Summary)

---

### State Management Recommendations

```javascript
// Suggested state shape
const diagnosticState = {
  // User input
  domain: String,
  
  // Prompt 1
  productDiscovery: {
    companyType: String,
    primaryOffering: String,
    additionalOfferings: Array,
    selectedProduct: String, // User selection or default to primary
  },
  
  // Prompt 2
  icpDiscovery: {
    idealCompanyProfile: Object,
    buyingCommittee: Array,
    primaryBuyerRole: String,
    painTriggers: Array, // Derived
  },
  
  // Prompt 3
  companyAnalysis: {
    positioningSummary: String,
    painAddressed: String,
    positioningObservation: String,
  },
  
  // Prompt 4
  icpResearch: {
    jtbdList: Array,
    signalSystem: Array,
    signalSystemSummary: Array, // Derived
    topSignals: Array, // Derived (top 3-4)
  },
  
  // Prompt 5
  competitiveAnalysis: {
    competitiveLandscape: String,
    competitorComparison: Array,
    competitiveGaps: String,
    defensibilityAssessment: String,
  },
  
  // Prompt 6
  contentStrategy: {
    contentFootprint: String,
    buyerAlignmentAudit: String,
    signalOpportunityAssessment: String,
    contentGrade: String,
    priorityRecommendations: Array,
  },
  
  // Prompt 7
  executiveSummary: String,
  
  // Prompt 8
  alphaSignals: Array,
  
  // Prompt 9
  pillarContent: Array,
  
  // Prompt 10
  podcastGuests: Array,
  
  // Meta
  refinementHistory: Array, // Track all refinements
  cascadeFlags: Array, // Sections needing refresh
};
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-XX-XX | Initial schema definition |

---

## Contact

Schema maintained by SmokeSignals AI engineering team.

For questions about prompt logic, contact [prompt owner].
For questions about data flow implementation, contact [engineering lead].

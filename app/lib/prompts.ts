// GTM OS Builder - Prompt Generator Functions
// All prompt functions are pure functions that accept parameters and return prompt strings

import type {
  IdealCompanyProfile,
  BuyingCommitteeMember,
  DiscoveredICP,
  IcpResearchData,
  CompanyAnalysis,
  CompetitiveData,
  ContentStrategyData,
  SignalSystemEntry,
} from '../types';

// Parameter interfaces for each prompt function
export interface CompanyPromptParams {
  domain: string;
  companyType: string;
  selectedProduct: string;
  idealCompanyProfile: IdealCompanyProfile;
  primaryBuyerRole: string;
}

export interface ICPPromptParams {
  domain: string;
  companyType: string;
  selectedProduct: string;
  idealCompanyProfile: IdealCompanyProfile;
  buyingCommittee: BuyingCommitteeMember[];
  discoveredICPs: DiscoveredICP[];
}

export interface CompetitivePromptParams {
  domain: string;
  selectedProduct: string;
  companyType: string;
  companyAnalysis: CompanyAnalysis;
  idealCompanyProfile: IdealCompanyProfile;
}

export interface ContentPromptParams {
  domain: string;
  selectedProduct: string;
  idealCompanyProfile: IdealCompanyProfile;
  buyingCommittee: BuyingCommitteeMember[];
  discoveredICPs: DiscoveredICP[];
  icpResearchData: IcpResearchData;
}

export interface AlphaSignalsPromptParams {
  domain: string;
  companyName: string;
  selectedProduct: string;
  companyType: string;
  idealCompanyProfile: IdealCompanyProfile;
  buyingCommittee: BuyingCommitteeMember[];
  discoveredICPs: DiscoveredICP[];
  painTriggers: string[];
  competitiveData: CompetitiveData;
  signalSystemSummary: string[];
}

export interface PillarContentPromptParams {
  domain: string;
  companyName: string;
  selectedProduct: string;
  companyType: string;
  idealCompanyProfile: IdealCompanyProfile;
  buyingCommittee: BuyingCommitteeMember[];
  discoveredICPs: DiscoveredICP[];
  icpResearchData: IcpResearchData;
  topSignals: SignalSystemEntry[];
  contentStrategyData: ContentStrategyData;
  competitiveData: CompetitiveData;
  companyAnalysis: CompanyAnalysis;
}

export interface PodcastGuestsPromptParams {
  domain: string;
  companyName: string;
  selectedProduct: string;
  idealCompanyProfile: IdealCompanyProfile;
  buyingCommittee: BuyingCommitteeMember[];
  discoveredICPs: DiscoveredICP[];
  icpResearchData: IcpResearchData;
  contentStrategyData: ContentStrategyData;
  companyAnalysis: CompanyAnalysis;
  topSignals: SignalSystemEntry[];
}

// Helper: Format buying committee as text
function formatCommitteeText(buyingCommittee: BuyingCommitteeMember[], discoveredICPs: DiscoveredICP[], detailed: boolean = false): string {
  if (buyingCommittee.length > 0) {
    if (detailed) {
      return buyingCommittee.map((m, i) =>
        `${i + 1}. ROLE: ${m.role}\n   TYPE: ${m.type}\n   PAIN TRIGGER: ${m.painTrigger}\n   EVALUATION PRIORITY: ${m.evaluationPriority}`
      ).join('\n\n');
    }
    return buyingCommittee.map((m, i) => `${i + 1}. ${m.role}: ${m.type} - ${m.painTrigger}`).join('\n');
  }
  return discoveredICPs.map((icp, i) => `${i + 1}. ${icp.title}: ${icp.description}`).join('\n');
}

// Helper: Format JTBD list as text
function formatJtbdText(icpResearchData: IcpResearchData): string {
  if (icpResearchData.jtbdList.length > 0) {
    return icpResearchData.jtbdList.map(j => `PERSONA: ${j.persona}\nJTBD: ${j.jtbd}`).join('\n\n');
  }
  return "Not yet defined";
}

// Helper: Format signal system as text
function formatSignalSystemText(icpResearchData: IcpResearchData): string {
  if (icpResearchData.signalSystem.length > 0) {
    return icpResearchData.signalSystem.map(s => `${s.signalName} | ${s.whatToDetect} | ${s.recommendedMotion}`).join('\n');
  }
  return "Not yet defined";
}

// Helper: Format top signals as text
function formatTopSignalsText(topSignals: SignalSystemEntry[]): string {
  if (topSignals.length > 0) {
    return topSignals.map(s => `${s.signalName} | ${s.whatToDetect} | ${s.recommendedMotion}`).join('\n');
  }
  return "Not yet defined";
}

/**
 * Prompt 3: Company Analysis
 */
export function getCompanyPrompt(params: CompanyPromptParams): string {
  const { domain, companyType, selectedProduct, idealCompanyProfile, primaryBuyerRole } = params;

  return `You are a B2B go-to-market strategist conducting a positioning analysis as part of a GTM diagnostic.

Your goal is NOT to summarize what the company already knows about themselves. Your goal is to assess how clearly and effectively their positioning communicates to potential buyers — and surface observations they may not have articulated.

INPUTS:
- DOMAIN: ${domain}
- COMPANY TYPE: ${companyType || "B2B company"}
- PRODUCT: ${selectedProduct}
- TARGET BUYER PROFILE: ${idealCompanyProfile.rawText || "Not yet defined"}
- PRIMARY BUYER ROLE: ${primaryBuyerRole || "Decision maker"}

RESEARCH SOURCES:
1. Company website: homepage, product pages, about page, pricing page
2. Third-party mentions: G2, Capterra, LinkedIn, Crunchbase
3. Competitor landscape: Note how alternatives position themselves

ANALYSIS REQUIRED:

Write directly TO the company using "you/your" language. Be specific — generic observations destroy credibility.

---

WHAT YOU DO
In 2-3 sentences, describe what ${selectedProduct} does, who it's for, and the core outcome it delivers. Be precise — if their messaging is vague, note that.

THE PAIN YOU ADDRESS
What specific, urgent problem does this solve? Frame it in terms of what the buyer experiences BEFORE finding this solution. If their website doesn't make this clear, say so.

HOW YOU'RE POSITIONED
Based on your research, how does this product sit in the competitive landscape? Don't just list differentiators — assess whether the positioning is:
- Clear and specific, or generic and forgettable
- Aligned with what the target buyer actually cares about
- Distinct from alternatives, or lost in a crowded field

POSITIONING OBSERVATION
Surface ONE insight about their GTM positioning that they may not have explicitly articulated. This could be:
- A strength they're underselling
- A gap between their messaging and their actual buyer's priorities
- A competitive angle they're not leveraging
- Friction in how their value prop is communicated

---

OUTPUT FORMAT:
Use these exact ALL CAPS headers. No preamble — start directly with WHAT YOU DO.
No markdown formatting (no bold, no bullets, no headers with #).

WHAT YOU DO
[content]

THE PAIN YOU ADDRESS
[content]

HOW YOU'RE POSITIONED
[content]

POSITIONING OBSERVATION
[content]

---

IF UNABLE TO ANALYZE:
If the website lacks sufficient information to assess positioning, note: "LIMITED VISIBILITY: [reason]" under the relevant section and provide your best inference.`;
}

/**
 * Prompt 4: ICP & Signal System
 */
export function getICPPrompt(params: ICPPromptParams): string {
  const { domain, companyType, selectedProduct, idealCompanyProfile, buyingCommittee, discoveredICPs } = params;
  const committeeText = formatCommitteeText(buyingCommittee, discoveredICPs, true);

  return `You are a B2B signal strategist building a buying signal system as part of a GTM diagnostic.

This section is the core of the diagnostic. Your goal is to identify the specific, observable signals that indicate a company or buyer is ready to purchase — BEFORE competitors notice.

INPUTS:
- DOMAIN: ${domain}
- PRODUCT: ${selectedProduct}
- COMPANY TYPE: ${companyType || "B2B company"}
- IDEAL COMPANY PROFILE: ${idealCompanyProfile.rawText || "Not yet defined"}
- BUYING COMMITTEE:
${committeeText || "Not yet defined"}

Do NOT repeat the ICP or persona definitions — those are already established. This prompt builds on them.

RESEARCH APPROACH:
1. Analyze what events, behaviors, or conditions typically precede a purchase of this type of product
2. Consider signals visible through LinkedIn, job postings, news, tech stack changes, and funding announcements
3. Map signals to the specific personas in the buying committee

---

ANALYSIS REQUIRED:

JOBS TO BE DONE
For the top 3 personas from the buying committee, define their JTBD:

PERSONA: [Title from buying committee]
JTBD: When [triggering situation], I want to [action/capability], so I can [desired outcome].

---

SIGNAL SYSTEM
Create 6-8 buying signals. Each signal should be:
- OBSERVABLE: Something you can actually detect through public data, tools, or outreach
- SPECIFIC: Not "shows interest" — what exact behavior or event?
- ACTIONABLE: Clearly triggers a response

Categorize signals by type:

BEHAVIORAL SIGNALS (actions the buyer takes)
TECHNOGRAPHIC SIGNALS (tool adoption, stack changes)
INTENT SIGNALS (research behavior, content consumption)
CONTEXTUAL SIGNALS (company events: funding, hiring, leadership changes)

Include at least one signal from 3+ categories.

---

SIGNAL BLIND SPOT
Identify ONE signal type that most companies selling ${selectedProduct} or similar products miss. Explain why it matters and how to detect it.

---

OUTPUT FORMAT:

JOBS TO BE DONE

PERSONA: [Title]
JTBD: When [situation], I want to [action], so I can [outcome].

PERSONA: [Title]
JTBD: When [situation], I want to [action], so I can [outcome].

PERSONA: [Title]
JTBD: When [situation], I want to [action], so I can [outcome].

SIGNAL SYSTEM

[Category Name]
Signal Name | What to Detect | Recommended Motion

[Category Name]
Signal Name | What to Detect | Recommended Motion

...

SIGNAL BLIND SPOT
[Description of the missed signal and how to detect it]

---

MOTION OPTIONS (use these for "Recommended Motion" column):
- Warm Outreach: Personalized email or LinkedIn from sales
- Nurture Sequence: Add to automated email cadence
- Content Offer: Send relevant resource (case study, guide, webinar)
- Executive Touch: High-level outreach from leadership
- Monitor: Track for additional signals before engaging

---

RULES:
- NO PREAMBLE — start directly with JOBS TO BE DONE header
- Each signal row on its own line
- Pipe separators between columns
- No markdown formatting`;
}

/**
 * Prompt 5: Competitive Analysis
 */
export function getCompetitivePrompt(params: CompetitivePromptParams): string {
  const { domain, selectedProduct, companyType, companyAnalysis, idealCompanyProfile } = params;

  return `You are a B2B competitive intelligence analyst conducting a competitive landscape assessment as part of a GTM diagnostic.

Your goal is to provide an honest, actionable view of the competitive environment — not to flatter the company. If competitors have genuine advantages, say so. That's the insight.

INPUTS:
- DOMAIN: ${domain}
- PRODUCT: ${selectedProduct}
- COMPANY TYPE: ${companyType || "B2B company"}
- POSITIONING SUMMARY: ${companyAnalysis.positioningSummary || "Not yet analyzed"}
- IDEAL COMPANY PROFILE: ${idealCompanyProfile.rawText || "Not yet defined"}

RESEARCH SOURCES (in priority order):
1. G2, Capterra, TrustRadius — competitor grids, head-to-head comparisons, reviews
2. Industry analyst reports or blog comparisons (search: "${selectedProduct} vs" or "${selectedProduct} comparison")
3. Competitor websites — positioning, pricing, customer logos
4. LinkedIn and Crunchbase — funding, growth signals, market momentum

---

ANALYSIS REQUIRED:

COMPETITIVE LANDSCAPE
Provide 2-3 sentences describing the competitive environment:
- How crowded is this space?
- Is there a dominant player, or is it fragmented?
- What's the primary axis of competition (price, features, vertical focus, ease of use)?

COMPETITOR COMPARISON
Identify 3-6 relevant competitors (use as many as are genuinely relevant — don't pad, don't truncate).

For each competitor, assess:
| Competitor | Primary Strength | Primary Weakness | Battleground |

Column definitions:
- COMPETITOR: Company or product name (1-3 words)
- PRIMARY STRENGTH: Their clearest advantage (sourced from reviews or market presence, not your assumption)
- PRIMARY WEAKNESS: Their most common criticism (from G2/Capterra reviews or known market perception)
- BATTLEGROUND: The scenario or buyer segment where ${domain} competes directly with them — and an honest assessment of who typically wins and why

COMPETITIVE GAPS
Identify 1-2 gaps or opportunities in the competitive landscape:
- Underserved segments no one is targeting well
- Emerging needs competitors haven't addressed
- Positioning white space ${domain} could claim

DEFENSIBILITY ASSESSMENT
Honestly assess ${domain}'s competitive defensibility:
- Do they have a genuine moat (network effects, switching costs, proprietary data, brand)?
- Or are they competing on execution/features that could be replicated?
- What would it take for a competitor to displace them?

If defensibility is weak, say so. That's a diagnostic insight, not a failure.

---

OUTPUT FORMAT:

COMPETITIVE LANDSCAPE
[2-3 sentences]

COMPETITOR COMPARISON
Competitor | Primary Strength | Primary Weakness | Battleground
[row]
[row]
...

COMPETITIVE GAPS
[1-2 observations]

[After the gaps, add this exact line:]
Seeing the whitespace is one thing. Capturing it requires signal infrastructure to act before competitors notice.

DEFENSIBILITY ASSESSMENT
[Honest assessment — 2-4 sentences]

---

RULES:
- NO PREAMBLE — start with COMPETITIVE LANDSCAPE header
- Each competitor row on its own line with pipe separators
- 3-6 competitors (as many as relevant, no padding)
- Blank line between sections
- No markdown formatting
- Be honest. Flattery is failure.

---

IF DATA IS LIMITED:
If the competitive landscape is unclear or the product category is too niche for meaningful comparison, state: "LIMITED COMPETITIVE DATA: [reason]" and provide your best assessment with noted confidence level.`;
}

/**
 * Prompt 6: Content Strategy Audit
 */
export function getContentPrompt(params: ContentPromptParams): string {
  const { domain, selectedProduct, idealCompanyProfile, buyingCommittee, discoveredICPs, icpResearchData } = params;

  const committeeText = formatCommitteeText(buyingCommittee, discoveredICPs);
  const jtbdListText = formatJtbdText(icpResearchData);
  const signalSystemText = formatSignalSystemText(icpResearchData);

  return `You are a B2B content strategist auditing content effectiveness as part of a signal-driven GTM diagnostic.

Your goal is to assess whether the company's content is working as a GTM asset — attracting the right buyers, addressing their pain points, and creating signal opportunities. This is not a content inventory; it's a strategic audit.

INPUTS:
- DOMAIN: ${domain}
- PRODUCT: ${selectedProduct}
- IDEAL COMPANY PROFILE: ${idealCompanyProfile.rawText || "Not yet defined"}
- BUYING COMMITTEE:
${committeeText || "Not yet defined"}
- JOBS TO BE DONE:
${jtbdListText}
- BUYING SIGNALS:
${signalSystemText}

RESEARCH APPROACH:
1. Company blog/resources section — assess topic coverage, depth, recency
2. LinkedIn company page — posting frequency, content type, engagement patterns
3. Executive/founder LinkedIn presence — thought leadership visibility
4. Search "${domain} podcast" or founder name + podcast — guest appearances
5. Search "${selectedProduct} review" or "${selectedProduct} tutorial" — third-party content about them

---

ANALYSIS REQUIRED:

CONTENT FOOTPRINT
What content assets exist? Be specific:
- Blog: Active/Dormant? Approximate post frequency? Topic themes?
- LinkedIn: Company page activity? Executive presence?
- Podcast/Video: Guest appearances? Owned shows?
- Gated assets: Whitepapers, guides, webinars visible?

Don't just list — note what's notably STRONG or notably MISSING.

BUYER ALIGNMENT AUDIT
Using the buying committee and JTBDs as your benchmark, assess:
- Which buyer personas does current content serve well?
- Which personas have little or no content addressing their priorities?
- Does content speak to early-stage awareness, active evaluation, or both?

Provide specific examples where possible ("Your blog covers X well but has no content addressing Y").

SIGNAL OPPORTUNITY ASSESSMENT
Content should create signal opportunities — moments where buyer behavior becomes visible. Assess:
- Do gated assets exist to capture intent signals?
- Is content structured to identify high-intent engagement (pricing page visits, demo requests, comparison content)?
- What signal opportunities are being missed?

Your content may be generating awareness but not capturing intent. That's the difference between building an audience and building a pipeline.

CONTENT GRADE

Grade the overall content strategy: A / B / C / D / F

GRADING RUBRIC:
- A: Comprehensive coverage across personas and buying stages; active, consistent publishing; clear signal capture mechanisms
- B: Good foundation with gaps; addresses some personas well, others neglected; moderate publishing consistency
- C: Content exists but unfocused; unclear audience targeting; sporadic publishing; limited signal capture
- D: Minimal content presence; little strategic intent visible; significant gaps
- F: No meaningful content presence or completely misaligned with target buyers

Grade: [Letter]
Rationale: [2-3 sentences explaining the grade with specific evidence]

PRIORITY RECOMMENDATIONS
Provide exactly 3 recommendations, ranked by impact. For each:

1. [HIGHEST IMPACT] Recommendation title
   What to do and why it matters for signal-driven GTM.

2. [HIGH IMPACT] Recommendation title
   What to do and why it matters for signal-driven GTM.

3. [MEDIUM IMPACT] Recommendation title
   What to do and why it matters for signal-driven GTM.

---

OUTPUT FORMAT:

CONTENT FOOTPRINT
[Specific observations — what exists, what's strong, what's missing]

BUYER ALIGNMENT AUDIT
[Assessment against personas and JTBDs]

SIGNAL OPPORTUNITY ASSESSMENT
[Evaluation of content as a signal-generation mechanism]

CONTENT GRADE
Grade: [Letter]
Rationale: [2-3 sentences]

PRIORITY RECOMMENDATIONS
1. [HIGHEST IMPACT] [Title]
   [Explanation]

2. [HIGH IMPACT] [Title]
   [Explanation]

3. [MEDIUM IMPACT] [Title]
   [Explanation]

---

RULES:
- NO PREAMBLE — start with CONTENT FOOTPRINT header
- Write TO the reader using "you/your"
- Be specific — cite actual content where possible
- Don't soften the grade to be polite. Accuracy builds trust.
- No markdown formatting

---

IF LIMITED CONTENT EXISTS:
If the company has minimal or no content presence, don't stretch to fill sections. State clearly: "LIMITED CONTENT PRESENCE: [what was found]" — then focus recommendations on foundational content moves.`;
}

/**
 * Prompt 7: Alpha Signals
 */
export function getAlphaSignalsPrompt(params: AlphaSignalsPromptParams): string {
  const {
    domain, companyName, selectedProduct, companyType, idealCompanyProfile,
    buyingCommittee, discoveredICPs, painTriggers, competitiveData, signalSystemSummary
  } = params;

  const committeeText = formatCommitteeText(buyingCommittee, discoveredICPs);

  return `You are a signal strategist identifying competitively advantaged buying signals as part of a GTM diagnostic.

CONTEXT:
The diagnostic has already identified standard buying signals (job postings, funding announcements, tech adoption, etc.). This section surfaces ALPHA SIGNALS — buying indicators that predict intent BEFORE competitors notice, because most competitors aren't watching for them.

Alpha signals share these traits:
- They fire EARLY — before the prospect is actively searching
- They're NON-OBVIOUS — not on every competitor's radar
- They're DETECTABLE — with the right tools and attention
- They're SPECIFIC — to this product's value proposition and buyer journey

INPUTS:
- COMPANY: ${companyName || domain}
- PRODUCT: ${selectedProduct}
- COMPANY TYPE: ${companyType || "B2B company"}
- IDEAL COMPANY PROFILE: ${idealCompanyProfile.rawText || "Not yet defined"}
- BUYING COMMITTEE:
${committeeText || "Not yet defined"}
- KEY PAIN TRIGGERS: ${painTriggers.join('; ') || "Not yet defined"}
- COMPETITIVE LANDSCAPE: ${competitiveData.competitiveLandscape || "Not yet analyzed"}
- STANDARD SIGNALS ALREADY IDENTIFIED: ${signalSystemSummary.join(', ') || "None identified yet"}

YOUR TASK:
Identify exactly 3 alpha signals that are NOT already covered in the standard signal system. These should be specific to ${companyName || domain}'s product and market — not generic B2B signals.

For each signal, provide:

SIGNAL [#]: [Descriptive Name]
WHY IT'S ALPHA: [One sentence — why competitors miss this]
SOURCE: [Where to detect: LinkedIn, job boards, G2, press releases, community forums, etc.]
DETECTION PATTERN: [Specific behavior, event, or data point to monitor]
RECOMMENDED MOTION: [What to do when this signal fires]
EXAMPLE: [Concrete example relevant to ${domain}'s target buyer]

---

OUTPUT FORMAT:

SIGNAL 1: [Name]
WHY IT'S ALPHA: [Why competitors miss this]
SOURCE: [Detection source]
DETECTION PATTERN: [What to look for]
RECOMMENDED MOTION: [Action to take]
EXAMPLE: [Specific to this company]

SIGNAL 2: [Name]
WHY IT'S ALPHA: [Why competitors miss this]
SOURCE: [Detection source]
DETECTION PATTERN: [What to look for]
RECOMMENDED MOTION: [Action to take]
EXAMPLE: [Specific to this company]

SIGNAL 3: [Name]
WHY IT'S ALPHA: [Why competitors miss this]
SOURCE: [Detection source]
DETECTION PATTERN: [What to look for]
RECOMMENDED MOTION: [Action to take]
EXAMPLE: [Specific to this company]

---

RULES:
- NO PREAMBLE — start with SIGNAL 1
- Do NOT repeat signals from the standard signal system
- Each signal must be genuinely non-obvious — "hiring for [role]" is table stakes, not alpha
- Be specific to ${companyName || domain}'s market and buyer — generic signals fail
- Rank by competitive advantage (most differentiated signal first)

---

QUALITY CHECK:
Before outputting, verify each signal passes this test:
"Would a lazy competitor already be watching for this?"
If yes → not alpha. Find something better.`;
}

/**
 * Prompt 8: Pillar Content Concepts
 */
export function getPillarContentPrompt(params: PillarContentPromptParams): string {
  const {
    domain, companyName, selectedProduct, companyType, idealCompanyProfile,
    buyingCommittee, discoveredICPs, icpResearchData, topSignals,
    contentStrategyData, competitiveData, companyAnalysis
  } = params;

  const committeeText = formatCommitteeText(buyingCommittee, discoveredICPs);
  const jtbdListText = formatJtbdText(icpResearchData);
  const topSignalsText = formatTopSignalsText(topSignals);

  return `You are a content strategist designing pillar content concepts as part of a signal-driven GTM diagnostic.

Pillar content is high-value, data-informed content that establishes authority, attracts ideal buyers, and creates ongoing signal opportunities. It's not a blog post — it's an anchor asset that generates attention and engagement over time.

INPUTS:
- COMPANY: ${companyName || domain}
- PRODUCT: ${selectedProduct}
- COMPANY TYPE: ${companyType || "B2B company"}
- IDEAL COMPANY PROFILE: ${idealCompanyProfile.rawText || "Not yet defined"}
- BUYING COMMITTEE:
${committeeText || "Not yet defined"}
- JOBS TO BE DONE:
${jtbdListText}
- KEY BUYING SIGNALS:
${topSignalsText}
- CONTENT GAPS: ${contentStrategyData.buyerAlignmentAudit.substring(0, 400) || "Not yet analyzed"}
- COMPETITIVE GAPS: ${competitiveData.competitiveGaps.substring(0, 300) || "Not yet analyzed"}
- POSITIONING OBSERVATION: ${companyAnalysis.positioningObservation.substring(0, 200) || "Not yet analyzed"}

---

YOUR TASK:
Create 2-3 pillar content concepts that:
1. Fill a gap in their current content (reference the content audit)
2. Address pain points or JTBDs of target buyers
3. Are data-driven — powered by signals, benchmarks, or aggregated insights
4. Create signal capture opportunities (engagement = intent data)
5. Position ${companyName || domain} in competitive white space (reference competitive gaps)

For each concept:

---

CONCEPT [#]: [Compelling, specific title]

THE ANGLE
[2-3 sentences: What is this content? Why does it matter to the target buyer RIGHT NOW? What question does it answer that no one else is answering well?]

TARGET BUYER
[Which persona from the buying committee does this primarily serve? What stage of the buying journey?]

DATA FOUNDATION
[What data powers this content? Be specific:]
- First-party options: [Customer data, usage patterns, survey results they could gather]
- Third-party options: [Public data sources, APIs, industry reports they could aggregate]
- Signal connection: [How does this content relate to buying signals?]

SIGNAL CAPTURE MECHANISM
[How does this content create signal opportunities?]
- Gated vs. ungated strategy
- Engagement signals to track (time on page, section completion, share behavior)
- Follow-up trigger (what engagement level warrants outreach?)

REPURPOSING ROADMAP
[How does this anchor asset break down into derivative content?]
- Awareness stage: [e.g., LinkedIn carousel, podcast episode, blog summary]
- Consideration stage: [e.g., Comparison tool, ROI calculator, webinar deep-dive]
- Decision stage: [e.g., Customer proof points, implementation guide]

CADENCE
[How often should this be updated? Why?]
- One-time vs. recurring
- If recurring: quarterly, monthly, annual?
- What triggers a refresh?

---

OUTPUT FORMAT:

CONCEPT 1: [Title]

THE ANGLE
[Content]

TARGET BUYER
[Content]

DATA FOUNDATION
[Content]

SIGNAL CAPTURE MECHANISM
[Content]

REPURPOSING ROADMAP
[Content]

CADENCE
[Content]

---

CONCEPT 2: [Title]
...

---

(Optional) CONCEPT 3: [Title]
...

---

RULES:
- NO PREAMBLE — start with CONCEPT 1
- Be specific to ${companyName || domain}'s market and buyers — generic content concepts fail
- Each concept must connect to a gap identified in the content audit or competitive analysis
- Titles should be compelling and specific — not "The Ultimate Guide to X"
- Prioritize concepts that create signal opportunities, not just brand awareness

---

QUALITY CHECK:
Before outputting, verify each concept:
1. Would the target buyer actually consume this? (If it's self-serving, cut it)
2. Does it create detectable engagement signals? (If it's a black box, redesign it)
3. Is the data foundation realistic for this company to build? (If it requires resources they don't have, simplify it)`;
}

/**
 * Prompt 9: Podcast Guest Archetypes
 */
export function getPodcastGuestsPrompt(params: PodcastGuestsPromptParams): string {
  const {
    domain, companyName, selectedProduct, idealCompanyProfile,
    buyingCommittee, discoveredICPs, icpResearchData,
    contentStrategyData, companyAnalysis, topSignals
  } = params;

  const committeeText = formatCommitteeText(buyingCommittee, discoveredICPs);
  const jtbdListText = formatJtbdText(icpResearchData);
  const topSignalsText = formatTopSignalsText(topSignals);

  return `You are a podcast strategist designing a guest roster as part of a signal-driven GTM diagnostic.

A strategic podcast isn't about downloads — it's about building relationships with future buyers and expanding reach to more of them. The right guest is either a potential customer (relationship play) or someone who influences potential customers (reach play).

INPUTS:
- COMPANY: ${companyName || domain}
- PRODUCT: ${selectedProduct}
- IDEAL COMPANY PROFILE: ${idealCompanyProfile.rawText || "Not yet defined"}
- BUYING COMMITTEE:
${committeeText || "Not yet defined"}
- JOBS TO BE DONE:
${jtbdListText}
- CONTENT GAPS: ${contentStrategyData.buyerAlignmentAudit.substring(0, 400) || "Not yet analyzed"}
- COMPETITIVE POSITIONING: ${companyAnalysis.positioningObservation.substring(0, 300) || "Not yet analyzed"}
- KEY BUYING SIGNALS:
${topSignalsText}

---

YOUR TASK:
Design a strategic guest roster of 4-5 guest archetypes. Include a mix of:

**ICP GUESTS (2-3):** People who match the ideal customer profile — potential buyers you'd want a relationship with. The podcast becomes a warm outreach mechanism.

**AMPLIFIER GUESTS (1-2):** People who influence or reach ICPs — analysts, community leaders, practitioners with audience. The podcast becomes a reach expansion mechanism.

For each guest archetype:

---

GUEST [#]: [Archetype Title — e.g., "The Scaling VP of Ops"]

TYPE: [ICP Guest / Amplifier Guest]

PROFILE
- Role: [Title and seniority level]
- Company type: [Stage, size, industry]
- Characteristics: [What makes them ideal — challenges they face, initiatives they're leading]

ICP CONNECTION
- For ICP Guests: [Which buying committee persona do they represent? What's the relationship-building value?]
- For Amplifier Guests: [Who is their audience? What's the overlap with your ICP?]

EPISODE TOPIC
[Specific, compelling topic — not "${companyName || domain}'s product" but a genuine challenge this person faces]

STRATEGIC VALUE
[Why is this guest strategic? What does ${companyName || domain} gain beyond content?]
- Relationship angle: [Deal acceleration, reference potential, network access]
- Reach angle: [Audience size, shareability, credibility boost]
- Signal angle: [What engagement with this episode would indicate about a listener?]

---

OUTPUT FORMAT:

GUEST 1: [Archetype Title]

TYPE: [ICP Guest / Amplifier Guest]

PROFILE
- Role: [Content]
- Company type: [Content]
- Characteristics: [Content]

ICP CONNECTION
[Content]

EPISODE TOPIC
[Content]

STRATEGIC VALUE
[Content]

---

GUEST 2: [Archetype Title]
...

---

(Continue for 4-5 guests)

---

RULES:
- NO PREAMBLE — start with GUEST 1
- Do NOT invent fake names — describe archetypes, not fictional people
- Each guest should serve a distinct strategic purpose
- Topics should address real challenges, not be product pitches
- Include at least 2 ICP Guests and at least 1 Amplifier Guest
- Consider what buying stage each episode topic serves (awareness vs. evaluation)

---

QUALITY CHECK:
Before outputting, verify:
1. Would this person actually say yes? (If the value exchange is one-sided, rethink it)
2. Would their audience care about this topic? (If it's only interesting to ${companyName || domain}, it won't get shared)
3. Does this guest create a signal opportunity? (If you can't tell who engages meaningfully, you're flying blind)`;
}

/**
 * Prompt 11: Refinement based on user feedback
 */
export function getRefinementPrompt(
  sectionType: string,
  originalResearch: string,
  userFeedback: string,
  relatedSections: string = ""
): string {
  const sectionMap: {[key: string]: string} = {
    company: "Company Analysis (Prompt 3)",
    icp: "ICP & Signal System (Prompt 4)",
    competitive: "Competitive Analysis (Prompt 5)",
    content: "Content Strategy Audit (Prompt 6)"
  };
  const sectionLabel = sectionMap[sectionType] || sectionType;

  let sectionRules = "";

  if (sectionType === "company") {
    sectionRules = `**COMPANY ANALYSIS (Prompt 3)**
- Accept corrections to product names, offerings, company type
- Accept positioning corrections — they know their differentiation better than public sources
- If they add products, assess whether they're distinct offerings or features/tiers
- Push back if they want to remove honest observations about positioning gaps`;
  } else if (sectionType === "icp") {
    sectionRules = `**ICP & SIGNAL SYSTEM (Prompt 4)**
- Accept persona additions or corrections
- If ICP changes significantly, flag cascade impact on signals and content
- Accept new signal suggestions if they're observable, specific, and actionable
- Push back on signals that aren't actually detectable
- Maintain categorization structure`;
  } else if (sectionType === "competitive") {
    sectionRules = `**COMPETITIVE ANALYSIS (Prompt 5)**
- If user suggests NEW COMPETITORS, you MUST add them to the COMPARISON TABLE
- Keep the exact table format: Competitor | Their Strength | Their Weakness | Where You Win
- Research the new competitors and provide real insights, not placeholders
- Maintain all existing competitors in the table unless user explicitly says to remove them
- Accept corrections to strengths/weaknesses if they have evidence
- Push back on removing legitimate competitive threats`;
  } else if (sectionType === "content") {
    sectionRules = `**CONTENT STRATEGY AUDIT (Prompt 6)**
- Accept context about content they have that you didn't find
- Defend grades if they're accurate — don't inflate to please
- Adjust recommendations based on their capacity/priorities
- Push back if they want purely promotional content`;
  }

  return `You are a GTM strategist refining your analysis based on user feedback.

Your role is EXPERT COLLABORATOR — not order-taker, not immovable wall. You bring GTM expertise; they bring business context. The best output comes from combining both.

INPUTS:
- SECTION TYPE: ${sectionLabel}
- ORIGINAL ANALYSIS:
${originalResearch}

- USER FEEDBACK:
${userFeedback}

${relatedSections ? `- RELATED CONTEXT:
${relatedSections}` : ""}

---

FEEDBACK CLASSIFICATION

First, categorize the feedback. Most feedback falls into one or more of these types:

1. **FACTUAL CORRECTION**
   They know something you got wrong (wrong competitor, outdated info, misunderstood product).
   → RESPONSE: Accept gracefully. Update the analysis. Thank them for the correction.

2. **ADDITIONAL CONTEXT**
   New information you didn't have (market nuance, internal priorities, customer insight).
   → RESPONSE: Incorporate and strengthen the analysis. Show how this changes or reinforces your conclusions.

3. **PREFERENCE WITHOUT REASONING**
   "I don't like this" or "Change X to Y" without explaining why.
   → RESPONSE: Probe gently. "I can adjust this — can you help me understand what's driving that preference? I want to make sure the revision serves your actual goal."

4. **STRATEGIC DISAGREEMENT**
   They disagree with your recommendation based on their own reasoning.
   → RESPONSE: Engage the reasoning. If their logic is sound, adjust. If it conflicts with GTM best practices, explain your position AND offer a compromise if possible.

5. **SCOPE EXPANSION**
   They want more (more signals, more competitors, more content ideas).
   → RESPONSE: Add where it genuinely improves the analysis. Push back if it dilutes focus or creates noise.

6. **MISUNDERSTANDING**
   They've misread what you wrote or misunderstood a GTM concept.
   → RESPONSE: Clarify without condescension. Restate the point more clearly.

---

REFINEMENT PRINCIPLES

**Default to collaboration, not combat.**
Your job isn't to "win" — it's to produce the most accurate, useful analysis. If their feedback makes it better, incorporate it enthusiastically.

**Maintain expertise, not ego.**
Push back when GTM principles are at stake. But "I disagree" isn't enough — explain WHY, and what you'd recommend instead.

**Distinguish "different" from "wrong."**
Sometimes their approach isn't wrong, just different. Acknowledge valid alternatives even if you'd recommend something else.

**Flag cascade implications.**
If a change to this section affects other sections of the diagnostic, note it:
"This changes the ICP significantly — the signals and content recommendations may need revisiting."

---

SECTION-SPECIFIC RULES

${sectionRules}

---

OUTPUT FORMAT

Produce the REFINED ANALYSIS using the same structure and headers as the original.

At the end, add:

---

ANALYST NOTES

INCORPORATED:
- [Feedback point]: [Why you incorporated it]

ADJUSTED:
- [Feedback point]: [How you partially incorporated or adapted it]

MAINTAINED POSITION:
- [Feedback point]: [Why you respectfully maintained your original stance]

CASCADE FLAG (if applicable):
- [What other sections may need revisiting based on this change]

---

RULES:
- NO PREAMBLE — start with the first section header
- Use same ALL CAPS headers as original
- Write TO them using "you/your"
- Be collaborative, not combative
- Be honest, not sycophantic
- If all feedback is valid, say so — don't manufacture disagreement
- If all feedback misses the mark, say so — don't pretend to incorporate it`;
}

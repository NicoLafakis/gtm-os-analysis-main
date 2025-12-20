"use client";
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { pdf, Document, Page, Text, View, Image, StyleSheet, Link } from '@react-pdf/renderer';

const STORAGE_KEY = 'gtm-diagnostic-session';

// Helper to strip markdown formatting from AI-generated text
const stripMarkdown = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
    .replace(/\*(.*?)\*/g, '$1')       // Remove *italic*
    .replace(/`(.*?)`/g, '$1')         // Remove `code`
    .replace(/#{1,6}\s?/g, '')         // Remove # headers
    .trim();
};

// PDF Styles
const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: '#070606',
    padding: 40,
    fontFamily: 'Helvetica',
    color: '#f9f9f9',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #ff6f20',
    paddingBottom: 20,
  },
  logo: {
    width: 150,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f9f9f9',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#ff6f20',
    marginBottom: 5,
  },
  date: {
    fontSize: 10,
    color: '#75716f',
  },
  section: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#232120',
    borderRadius: 8,
    borderLeft: '3 solid #ff6f20',
  },
  sectionPurple: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#232120',
    borderRadius: 8,
    borderLeft: '3 solid #5b2e5e',
  },
  sectionYellow: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#232120',
    borderRadius: 8,
    borderLeft: '3 solid #ffdd1f',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff6f20',
    marginBottom: 10,
  },
  sectionTitlePurple: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9a5d9d',
    marginBottom: 10,
  },
  sectionTitleYellow: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffdd1f',
    marginBottom: 10,
  },
  text: {
    fontSize: 11,
    color: '#dededd',
    lineHeight: 1.6,
    marginBottom: 8,
  },
  label: {
    fontSize: 9,
    color: '#75716f',
    marginBottom: 2,
  },
  value: {
    fontSize: 11,
    color: '#aaa7a6',
    marginBottom: 8,
  },
  signalCard: {
    backgroundColor: '#070606',
    padding: 12,
    marginBottom: 10,
    borderRadius: 6,
    borderLeft: '2 solid #ff6f20',
  },
  signalName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f9f9f9',
    marginBottom: 4,
  },
  signalImpact: {
    fontSize: 9,
    color: '#22c55e',
    marginBottom: 6,
  },
  guestCard: {
    backgroundColor: '#070606',
    padding: 12,
    marginBottom: 10,
    borderRadius: 6,
    borderLeft: '2 solid #ffdd1f',
  },
  guestName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f9f9f9',
    marginBottom: 2,
  },
  guestCompany: {
    fontSize: 10,
    color: '#75716f',
    marginBottom: 6,
  },
  programGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  programItem: {
    width: '48%',
    backgroundColor: '#070606',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
  },
  programTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#f9f9f9',
    marginBottom: 4,
  },
  programDesc: {
    fontSize: 9,
    color: '#75716f',
  },
  cta: {
    marginTop: 30,
    padding: 25,
    backgroundColor: '#ff6f20',
    borderRadius: 8,
    textAlign: 'center',
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f9f9f9',
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 11,
    color: '#f9f9f9',
    marginBottom: 12,
  },
  ctaLink: {
    fontSize: 12,
    color: '#f9f9f9',
    textDecoration: 'underline',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#5a5654',
  },
});

// Loading stage messages for engagement during wait
const loadingStages = [
  { icon: '🔍', text: 'Analyzing your website...', subtext: 'Extracting core value proposition' },
  { icon: '📊', text: 'Pulling LinkedIn insights...', subtext: 'Company and CEO thought leadership' },
  { icon: '🎯', text: 'Identifying ideal buyers...', subtext: 'Mapping personas and pain points' },
  { icon: '⚡', text: 'Discovering alpha signals...', subtext: 'Finding unique buying indicators' },
  { icon: '📝', text: 'Crafting your GTM OS...', subtext: 'Building your signal-driven system' },
];

// Rotating insights shown during loading
const gtmInsights = [
  "Signal-based outreach sees 3x higher reply rates than generic sequences",
  "VOC programs generate 40% of the best-performing content ideas",
  "Companies using pillar content see 2x organic traffic growth",
  "Signal-driven sequences have 2x the meeting conversion rate",
  "The best GTM teams activate signals within 24 hours of detection",
  "Content built on aggregated signal data outperforms opinion pieces by 3x",
];

const signalVendors = [
  { id: "clay", name: "Clay", logo: "https://cdn.brandfetch.io/idD_mpLkdv/theme/dark/symbol.svg?c=1bfwsmEH20zzEfSNTed", fallback: "🔶" },
  { id: "apollo", name: "Apollo", logo: "https://cdn.brandfetch.io/idEdyy-bx6/theme/dark/symbol.svg?c=1bfwsmEH20zzEfSNTed", fallback: "🚀" },
  { id: "zoominfo", name: "ZoomInfo", logo: "https://cdn.brandfetch.io/idJCiN_dWz/theme/dark/symbol.svg?c=1bfwsmEH20zzEfSNTed", fallback: "🔍" },
  { id: "usergems", name: "UserGems", logo: "https://cdn.brandfetch.io/id3Y03ggHo/theme/dark/symbol.svg?c=1bfwsmEH20zzEfSNTed", fallback: "💎" },
  { id: "warmly", name: "Warmly", logo: "https://cdn.brandfetch.io/idPSTn-TkV/theme/dark/symbol.svg?c=1bfwsmEH20zzEfSNTed", fallback: "🔥" },
  { id: "commonroom", name: "Common Room", logo: "https://cdn.brandfetch.io/id2S3t4xBl/theme/dark/symbol.svg?c=1bfwsmEH20zzEfSNTed", fallback: "🏠" }
];

const signalTypes = [
  { id: "job_changes", label: "Job Changes", desc: "Contact role changes" },
  { id: "funding", label: "Funding Events", desc: "Fundraising news" },
  { id: "tech_installs", label: "Tech Stack", desc: "Technology adoption" },
  { id: "intent_data", label: "Intent Data", desc: "Research behavior" },
  { id: "website_visitors", label: "Website Visitors", desc: "De-anonymized" }
];

// New flow: intro → contact-info → select-product → icp-selection → research phases → signals-alignment → generating → results
// Note: competitive analysis runs in background during generation, not as a visible step
const steps = ["intro", "contact-info", "select-product", "icp-selection", "research-company", "research-content", "signals-alignment", "generating", "results"];

// Program elements structure for value prop display
const programElements = {
  voc: { title: "Voice of Customer Program", deliverable: "25 ICP conversations", icon: "💬" },
  socialListening: { title: "Social Listening Program", deliverable: "50 new ICP connections/month", icon: "👂" },
  podcasts: { title: "ICP Podcast Program", deliverable: "4 podcast episodes", icon: "🎙️" },
  pillarContent: { title: "Pillar Content", deliverable: "Signal-based industry report", icon: "📊" },
  signalSequence: { title: "Signal-Based Sequences", deliverable: "Trigger-driven outreach", icon: "⚡" },
  hubspotEnablement: { title: "HubSpot Enablement", deliverable: "Automated sales workflows", icon: "🔧" },
};

export default function Home() {
  // Core wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [crm, setCrm] = useState("");
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [alignment, setAlignment] = useState<{gtm?: string}>({});

  // Research phases
  const [research, setResearch] = useState({
    company: { initial: "", feedback: "", refined: "", loading: false },
    icp: { initial: "", feedback: "", refined: "", loading: false },
    competitive: { initial: "", feedback: "", refined: "", loading: false },
    content: { initial: "", feedback: "", refined: "", loading: false }
  });

  // Products and ICP selection
  const [products, setProducts] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [discoveredICPs, setDiscoveredICPs] = useState<{id: string; title: string; description: string}[]>([]);
  const [selectedICPs, setSelectedICPs] = useState<string[]>([]);

  // Background data from parallel fetching
  const [backgroundData, setBackgroundData] = useState<{
    websiteContent: string | null;
    companyPosts: string | null;
    ceoPosts: string | null;
    anysiteQuery: string | null;
  }>({
    websiteContent: null,
    companyPosts: null,
    ceoPosts: null,
    anysiteQuery: null,
  });

  // New outputs: alpha signals, pillar content, podcast guests
  const [alphaSignals, setAlphaSignals] = useState<{name: string; source: string; detection: string; impact: string; example: string}[]>([]);
  const [pillarContent, setPillarContent] = useState<{title: string; concept: string; dataSources: string; cadence: string} | null>(null);
  const [podcastGuests, setPodcastGuests] = useState<{name: string; company: string; icpMatch: string; topic: string; whyInvite: string}[]>([]);

  // Report and HubSpot
  const [reportData, setReportData] = useState<{narrative: string; icp: string; content: string; competitive: string} | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);

  // UI state
  const [isHydrated, setIsHydrated] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [competitiveExpanded, setCompetitiveExpanded] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [currentInsight, setCurrentInsight] = useState(0);

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.currentStep !== undefined) setCurrentStep(data.currentStep);
        if (data.websiteUrl) setWebsiteUrl(data.websiteUrl);
        if (data.domain) setDomain(data.domain);
        if (data.email) setEmail(data.email);
        if (data.firstName) setFirstName(data.firstName);
        if (data.lastName) setLastName(data.lastName);
        if (data.companyName) setCompanyName(data.companyName);
        if (data.role) setRole(data.role);
        if (data.companySize) setCompanySize(data.companySize);
        if (data.crm) setCrm(data.crm);
        if (data.selectedVendors) setSelectedVendors(data.selectedVendors);
        if (data.selectedSignals) setSelectedSignals(data.selectedSignals);
        if (data.alignment) setAlignment(data.alignment);
        if (data.research) setResearch(data.research);
        if (data.reportData) setReportData(data.reportData);
        if (data.contactId) setContactId(data.contactId);
        if (data.products) setProducts(data.products);
        if (data.selectedProduct) setSelectedProduct(data.selectedProduct);
        if (data.discoveredICPs) setDiscoveredICPs(data.discoveredICPs);
        if (data.selectedICPs) setSelectedICPs(data.selectedICPs);
        if (data.backgroundData) setBackgroundData(data.backgroundData);
        if (data.alphaSignals) setAlphaSignals(data.alphaSignals);
        if (data.pillarContent) setPillarContent(data.pillarContent);
        if (data.podcastGuests) setPodcastGuests(data.podcastGuests);
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    }
    setIsHydrated(true);
  }, []);

  // Save session to localStorage when state changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const data = {
        currentStep,
        websiteUrl,
        domain,
        email,
        firstName,
        lastName,
        companyName,
        role,
        companySize,
        crm,
        selectedVendors,
        selectedSignals,
        alignment,
        research,
        reportData,
        contactId,
        products,
        selectedProduct,
        discoveredICPs,
        selectedICPs,
        backgroundData,
        alphaSignals,
        pillarContent,
        podcastGuests,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save session:', e);
    }
  }, [isHydrated, currentStep, websiteUrl, domain, email, firstName, lastName, companyName, role, companySize, crm, selectedVendors, selectedSignals, alignment, research, reportData, contactId, products, selectedProduct, discoveredICPs, selectedICPs, backgroundData, alphaSignals, pillarContent, podcastGuests]);

  // Rotate loading stages and insights during wait
  useEffect(() => {
    if (productsLoading || steps[currentStep] === 'generating') {
      const stageInterval = setInterval(() => {
        setLoadingStage(s => (s + 1) % loadingStages.length);
      }, 4000);
      const insightInterval = setInterval(() => {
        setCurrentInsight(i => (i + 1) % gtmInsights.length);
      }, 6000);
      return () => {
        clearInterval(stageInterval);
        clearInterval(insightInterval);
      };
    }
  }, [productsLoading, currentStep]);

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStep(0);
    setWebsiteUrl("");
    setDomain("");
    setEmail("");
    setCompanyName("");
    setRole("");
    setCompanySize("");
    setCrm("");
    setSelectedVendors([]);
    setSelectedSignals([]);
    setAlignment({});
    setResearch({
      company: { initial: "", feedback: "", refined: "", loading: false },
      icp: { initial: "", feedback: "", refined: "", loading: false },
      competitive: { initial: "", feedback: "", refined: "", loading: false },
      content: { initial: "", feedback: "", refined: "", loading: false }
    });
    setReportData(null);
    setContactId(null);
    setProducts([]);
    setSelectedProduct("");
    setDiscoveredICPs([]);
    setSelectedICPs([]);
    setBackgroundData({ websiteContent: null, companyPosts: null, ceoPosts: null, anysiteQuery: null });
    setAlphaSignals([]);
    setPillarContent(null);
    setPodcastGuests([]);
    setLoadingStage(0);
    setCurrentInsight(0);
  }, []);

  // API helper: Firecrawl for website content
  const fetchWebsiteContent = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch("/api/firecrawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.startsWith("http") ? url : `https://${url}`,
          action: "scrape",
          options: { formats: ["markdown"], onlyMainContent: true }
        })
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.data?.markdown || data.markdown || null;
    } catch (e) {
      console.error("Firecrawl error:", e);
      return null;
    }
  };

  // API helper: Anysite for LinkedIn data
  const fetchLinkedInData = async (action: string, params: Record<string, unknown>): Promise<{data: unknown; query: string | null}> => {
    try {
      const response = await fetch("/api/anysite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, params })
      });
      const result = await response.json();
      return {
        data: result.data || null,
        query: result.fallback?.query || result.data?.query || null
      };
    } catch (e) {
      console.error("Anysite error:", e);
      return { data: null, query: null };
    }
  };

  const showError = useCallback((message: string) => {
    setErrorToast(message);
    setTimeout(() => setErrorToast(null), 5000);
  }, []);

  const cleanResponse = (text: string) => {
    if (!text) return "";
    let cleaned = text
      .replace(/^.*?(?:I'll|I will|Let me|Based on|Here's|Here is|After|Now I'll).*?(?:research|search|analyze|create|provide|analysis).*$/gim, "")
      .replace(/^.*?(?:web search|my search|searching|searched).*$/gim, "")
      .replace(/^.*?ICP.*?(?:section|profile|for).*?:?\s*$/gim, "")
      .replace(/^#{1,4}\s*/gm, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/^\s*[-*]\s+/gm, "")
      .trim();
    cleaned = cleaned.replace(/([a-z,])\s*\n+(?![A-Z]{2,})/g, "$1 ");
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    return cleaned;
  };
  
  const cleanCompetitiveResponse = (text: string) => {
    if (!text) return "";
    let cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    cleaned = cleaned
      .replace(/^.*?(?:I'll|I will|Let me|Based on|Here's|Here is|After|Now I'll).*?(?:research|search|analyze|create|provide|analysis).*$/gim, "")
      .replace(/^.*?(?:web search|my search|searching|searched).*$/gim, "")
      .replace(/^.*?ICP.*?(?:section|profile|for).*?:?\s*$/gim, "")
      .replace(/^#{1,4}\s*/gm, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .trim();
    const lines = cleaned.split("\n");
    const result: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;
      if (/^\|[\s\-:]+\|/.test(line) || /^[\-:|\s]+$/.test(line)) continue;
      if (line.startsWith("|") && line.endsWith("|")) {
        line = line.slice(1, -1).trim();
      } else if (line.startsWith("|")) {
        line = line.slice(1).trim();
      } else if (line.endsWith("|")) {
        line = line.slice(0, -1).trim();
      }
      line = line.replace(/^[-*•]\s+/, "");
      if (line.includes("|")) {
        line = line.split("|").map(p => p.trim()).join(" | ");
        result.push(line);
      } else if (/^[A-Z][A-Z\s\-:]+$/.test(line) && line.length >= 2 && line.length < 60) {
        result.push(line);
      } else {
        const prevLine = result[result.length - 1];
        if (prevLine && !prevLine.includes("|") && !/^[A-Z][A-Z\s\-:]+$/.test(prevLine)) {
          result[result.length - 1] = prevLine + " " + line;
        } else {
          result.push(line);
        }
      }
    }
    return result.join("\n");
  };

  const callClaude = async (prompt: string) => {
    try {
      const searchPrompt = `Use your web_search tool to research this request. Search the web first, then provide your analysis.\n\n${prompt}`;
      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: searchPrompt }]
        })
      });
      if (!response.ok) {
        return "API error: " + response.status + ". Please try again.";
      }
      const data = await response.json();
      if (data.error) {
        return "Error: " + (data.error.message || "Unknown error occurred");
      }
      const textContent = (data.content || [])
        .filter((block: {type: string}) => block.type === "text")
        .map((block: {text: string}) => block.text)
        .join("\n");
      return textContent || "No response generated. Please try again.";
    } catch (error) {
      return "Connection error: " + ((error as Error).message || "Please check your internet and try again.");
    }
  };

const getCompanyPrompt = () => `Search the web for "${domain}" and specifically their "${selectedProduct}" product/offering.
After researching, analyze ${domain}'s "${selectedProduct}" for a GTM diagnostic. Write directly TO the reader using "you/your".
CRITICAL: Start your response with the first header "WHAT YOU DO" - no preamble.

Use these exact ALL CAPS headers:

WHAT YOU DO
Describe in 2-3 sentences what "${selectedProduct}" does, who it serves, and its core value proposition.
THE PROBLEM YOU SOLVE
What specific pain point or challenge do you address for your customers?

YOUR DIFFERENTIATION
What makes you unique compared to alternatives?

RULES:
- NO PREAMBLE - start directly with WHAT YOU DO header
- Write TO the reader using "you/your"
- No markdown formatting`;

  const getICPPrompt = () => {
    const ctx = research.company.refined || research.company.initial || "";
    const contextStr = cleanResponse(ctx).substring(0, 400);
return `Search the web for "${domain}" and their "${selectedProduct}" to understand the business and market.
Create the ICP section for ${domain}'s "${selectedProduct}". Write directly TO the reader using "you/your".
${contextStr ? `Company Context: ${contextStr}` : ""}

CRITICAL: Start with "YOUR IDEAL BUYERS" header - no preamble.

Use these exact ALL CAPS headers:

YOUR IDEAL BUYERS
Describe the companies you should target: industry, size, growth stage.

PERSONAS AND JOBS TO BE DONE
List 3-4 key personas. For each:
PERSONA: [Title]
GOAL: [What outcome they want]
JTBD: When [situation], I want to [action], so I can [outcome].

SIGNAL SYSTEM
Create exactly 6 alpha signals. Each row on its OWN LINE with pipe separators:

Signal Name | Description | Motion Triggered

RULES:
- NO PREAMBLE
- Each signal on its OWN LINE
- 3 columns separated by |
- 6 signals total`;
  };

const getCompetitivePrompt = () => `Search the web for "${domain}" "${selectedProduct}" competitors.

CRITICAL: Start with "COMPETITIVE LANDSCAPE" header - no preamble.

Use this EXACT structure:

COMPETITIVE LANDSCAPE
[2-3 sentences about the market]

COMPARISON TABLE
Competitor1 | Their Strength | Their Weakness | Where You Win
Competitor2 | Their Strength | Their Weakness | Where You Win
Competitor3 | Their Strength | Their Weakness | Where You Win
Competitor4 | Their Strength | Their Weakness | Where You Win
Competitor5 | Their Strength | Their Weakness | Where You Win

YOUR COMPETITIVE MOAT
[What makes ${domain}'s "${selectedProduct}" hard to compete with]

RULES:
- NO PREAMBLE
- Competitor names 1-3 words only
- Each competitor row MUST be on its own line
- Each row has exactly 4 pipe-separated values
- Put a blank line between each section
- CRITICAL: Each competitor must be on a SEPARATE LINE with a line break after it`;

  const getContentPrompt = () => {
    const ctx = research.icp.refined || research.icp.initial;
return `Search the web for "${domain}" "${selectedProduct}" content - blog, LinkedIn, podcasts.
Analyze content strategy. Write TO the reader using "you/your".

CRITICAL: Start with "CONTENT OVERVIEW" header - no preamble.

CONTENT OVERVIEW
What content you produce.

ICP ALIGNMENT
Does your content address what buyers care about?

LINKEDIN PRESENCE
How visible are you on LinkedIn?

CONTENT GRADE: [A/B/C/D/F]
One sentence explanation.

HOW TO IMPROVE
3-4 specific recommendations.

RULES:
- NO PREAMBLE
- Write TO reader using "you/your"`;
  };

  // New output generation prompts
  const getAlphaSignalsPrompt = () => {
    const icpContext = selectedICPs.length > 0 ? selectedICPs.join(", ") : "key decision makers";
    const companyContext = research.company.refined || research.company.initial || "";
    const competitiveContext = research.competitive.refined || research.competitive.initial || "";
    return `You're a GTM strategist identifying alpha signals for ${companyName || domain}'s "${selectedProduct}".

Context about the company: ${cleanResponse(companyContext).substring(0, 300)}
Target ICPs: ${icpContext}
Competitive landscape: ${cleanResponse(competitiveContext).substring(0, 200)}

Alpha signals are unique buying indicators that predict purchase intent BEFORE competitors notice. They're the "tells" that someone is ready to buy.

Generate exactly 3 alpha signals, ranked by pipeline impact (highest first).

Format EXACTLY like this (each on its own line):
SIGNAL 1: [Signal Name]
SOURCE: [Where to detect it - LinkedIn, job boards, press, etc.]
DETECTION: [Specific trigger or pattern to watch for]
IMPACT: High
EXAMPLE: [Specific example for ${domain}]

SIGNAL 2: [Signal Name]
SOURCE: [Where to detect it]
DETECTION: [Specific trigger or pattern]
IMPACT: Medium-High
EXAMPLE: [Specific example]

SIGNAL 3: [Signal Name]
SOURCE: [Where to detect it]
DETECTION: [Specific trigger or pattern]
IMPACT: Medium
EXAMPLE: [Specific example]

RULES:
- NO PREAMBLE - start with SIGNAL 1
- Be SPECIFIC to their business, not generic
- Each signal must be actionable and detectable
- Rank by realistic pipeline impact`;
  };

  const getPillarContentPrompt = () => {
    const icpContext = selectedICPs.length > 0 ? selectedICPs.join(", ") : "key decision makers";
    const companyContext = research.company.refined || research.company.initial || "";
    const linkedInData = backgroundData.companyPosts || backgroundData.ceoPosts || "";
    return `You're a content strategist creating a pillar content concept for ${companyName || domain}'s "${selectedProduct}".

Company context: ${cleanResponse(companyContext).substring(0, 300)}
Target ICPs: ${icpContext}
${linkedInData ? `Recent LinkedIn activity: ${linkedInData.substring(0, 200)}` : ""}

Create ONE compelling pillar content concept that:
1. Is data-driven (uses aggregated signals/insights)
2. Addresses real pain points your ICPs have
3. Positions ${domain} as a thought leader
4. Can be repurposed into multiple formats

Format EXACTLY like this:

TITLE: [Compelling, specific title - not generic]

CONCEPT: [2-3 sentences describing the content piece and why it matters to ICPs]

DATA SOURCES: [What data/signals would power this content]

CADENCE: [How often to update/publish - quarterly report, monthly index, etc.]

FORMAT OPTIONS:
- [Format 1 - e.g., Interactive report]
- [Format 2 - e.g., LinkedIn carousel series]
- [Format 3 - e.g., Podcast episode topics]

RULES:
- NO PREAMBLE - start with TITLE
- Be specific to their industry and ICPs
- Make it genuinely useful, not promotional`;
  };

  const getPodcastGuestsPrompt = () => {
    const icpContext = selectedICPs.length > 0 ? selectedICPs.join(", ") : "key decision makers";
    const companyContext = research.company.refined || research.company.initial || "";
    return `You're a podcast producer identifying ideal guests for ${companyName || domain}'s ICP-focused podcast about "${selectedProduct}".

Company context: ${cleanResponse(companyContext).substring(0, 300)}
Target ICPs: ${icpContext}

The goal is to invite ICP-matching guests who:
1. Are themselves potential buyers or influencers
2. Bring credibility to topics your ICPs care about
3. Will share the episode with their network (expanding your reach to more ICPs)

Generate exactly 4 podcast guest suggestions.

Format EXACTLY like this (each on its own line):

GUEST 1:
NAME: [Realistic name and title - make it specific]
COMPANY: [Type of company they'd work at]
ICP MATCH: [Which ICP persona they represent]
TOPIC: [What you'd discuss with them]
VALUE: [Why inviting them is strategic for ${domain}]

GUEST 2:
NAME: [Name and title]
COMPANY: [Company type]
ICP MATCH: [ICP persona]
TOPIC: [Discussion topic]
VALUE: [Strategic value]

GUEST 3:
NAME: [Name and title]
COMPANY: [Company type]
ICP MATCH: [ICP persona]
TOPIC: [Discussion topic]
VALUE: [Strategic value]

GUEST 4:
NAME: [Name and title]
COMPANY: [Company type]
ICP MATCH: [ICP persona]
TOPIC: [Discussion topic]
VALUE: [Strategic value]

RULES:
- NO PREAMBLE - start with GUEST 1
- Make guests realistic personas (not real people unless famous in the space)
- Each guest should match a different ICP or bring different value
- Topics should be genuinely interesting, not promotional`;
  };

  const runResearchPhase = async (phase: string) => {
    const prompts: {[key: string]: () => string} = { company: getCompanyPrompt, icp: getICPPrompt, competitive: getCompetitivePrompt, content: getContentPrompt };
    setResearch(prev => ({ ...prev, [phase]: { ...prev[phase as keyof typeof prev], loading: true } }));
    try {
      const result = await callClaude(prompts[phase]());
      setResearch(prev => ({ ...prev, [phase]: { ...prev[phase as keyof typeof prev], initial: result, loading: false } }));
    } catch {
      setResearch(prev => ({ ...prev, [phase]: { ...prev[phase as keyof typeof prev], initial: "Error loading data.", loading: false } }));
    }
  };

  const parseIntoSections = (text: string) => {
    if (!text) return [{ title: "", content: ["No data"] }];
    const sections: {title: string; content: string[]}[] = [];
    const lines = text.split("\n");
    let current = { title: "", content: [] as string[] };
    for (let i = 0; i < lines.length && i < 200; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;
      const isHeader = /^[A-Z][A-Z\s\-:]+$/.test(trimmed) && trimmed.length >= 2 && trimmed.length < 60;
      if (isHeader) {
        if (current.title || current.content.length > 0) sections.push(current);
        current = { title: trimmed.replace(/:$/, ""), content: [] };
      } else {
        current.content.push(trimmed);
      }
    }
    if (current.title || current.content.length > 0) sections.push(current);
    return sections.length > 0 ? sections : [{ title: "", content: ["No data"] }];
  };

  const formatResearchOutput = (text: string, type: string) => {
    const cleaned = (type === "competitive" || type === "icp") ? cleanCompetitiveResponse(text) : cleanResponse(text);
    const sections = parseIntoSections(cleaned);
    const filteredSections = sections.filter(sec => sec.title !== "WHY" && sec.title !== "WHY IT MATTERS");
    
    return filteredSections.map((sec, i) => {
      const hasCompetitorTable = type === "competitive" && sec.content.some(line => (line.match(/\|/g) || []).length >= 2);
      const titleLooksLikeSignal = sec.title && (sec.title.includes("SIGNAL") || sec.title.includes("ALPHA") || sec.title.includes("BUYING"));
      const contentHasSignalTable = sec.content.some(line => { const pc = (line.match(/\|/g) || []).length; return pc >= 1 && pc <= 3; });
      const hasSignalTable = titleLooksLikeSignal && contentHasSignalTable;
      const isPersonaSection = sec.title && (sec.title.includes("PERSONA") || sec.title.includes("JOBS"));
      
      return (
        <div key={i} className="mb-6 pb-5 border-b border-white/10 last:border-0">
          {sec.title && <div className="text-xs font-semibold text-[#ff6f20] uppercase tracking-wider mb-3">{sec.title}</div>}
          <div className="text-white/90 leading-relaxed">
            {hasSignalTable && (
              <>
                <div className="grid grid-cols-3 gap-3 py-3 border-b-2 border-green-500/50 text-xs font-bold uppercase tracking-wide mb-2">
                  <span className="text-green-400">Signal</span>
                  <span className="text-white/70">Description</span>
                  <span className="text-blue-400">Motion Triggered</span>
                </div>
                {sec.content.map((line, j) => {
                  if (!line.includes("|")) return null;
                  const parts = line.split("|").map(p => p.trim());
                  if (parts.length < 2) return null;
                  return (
                    <div key={j} className="grid grid-cols-3 gap-3 py-3 border-b border-white/10 text-sm items-start">
                      <span className="font-semibold text-green-400">{parts[0]}</span>
                      <span className="text-white/70">{parts[1] || "—"}</span>
                      <span className="text-blue-400">{parts[2] || "—"}</span>
                    </div>
                  );
                })}
              </>
            )}
            {hasCompetitorTable && (
              <>
                <div className="grid grid-cols-4 gap-3 py-3 border-b-2 border-[#ff6f20]/50 text-xs font-bold uppercase tracking-wide mb-2">
                  <span className="text-white">Competitor</span>
                  <span className="text-green-400">Their Strength</span>
                  <span className="text-orange-400">Their Weakness</span>
                  <span className="text-[#ff8f50]">Where You Win</span>
                </div>
                {sec.content.map((line, j) => {
                  if (!line.includes("|")) return null;
                  // Skip header rows that the AI might include
                  const lowerLine = line.toLowerCase();
                  if (lowerLine.includes("competitor") && lowerLine.includes("strength") && lowerLine.includes("weakness")) return null;
                  if (lowerLine.includes("their strength") || lowerLine.includes("where you win")) return null;
                  const parts = line.split("|").map(p => p.trim()).filter(p => p.length > 0);
                  if (parts.length < 2) return null;
                  let competitorName = parts[0];
                  if (competitorName.length > 25) competitorName = competitorName.split(" ").slice(-2).join(" ");
                  return (
                    <div key={j} className="grid grid-cols-4 gap-3 py-3 border-b border-white/10 text-sm items-start">
                      <span className="font-semibold text-white">{competitorName}</span>
                      <span className="text-green-400">{parts[1] || "—"}</span>
                      <span className="text-orange-400">{parts[2] || "—"}</span>
                      <span className="text-[#ff8f50] font-medium">{parts[3] || "—"}</span>
                    </div>
                  );
                })}
              </>
            )}
            {isPersonaSection && (
              <div className="space-y-4">
                {parsePersonas(sec.content).map((persona, j) => (
                  <div key={j} className="bg-gradient-to-br from-[#5b2e5e]/10 to-[#5b2e5e]/5 border border-[#5b2e5e]/30 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-[#5b2e5e]/20 rounded-full flex items-center justify-center text-lg">👤</div>
                      <div>
                        <div className="font-semibold text-[#7a3d7d]">{persona.title}</div>
                        {persona.goal && <div className="text-sm text-white/60">{persona.goal}</div>}
                      </div>
                    </div>
                    {persona.jtbd && (
                      <div className="bg-black/20 rounded-lg p-4 mt-3">
                        <div className="text-xs text-[#7a3d7d] uppercase tracking-wide mb-2">Job to Be Done</div>
                        <p className="text-sm italic text-white/80">&quot;{persona.jtbd}&quot;</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!hasCompetitorTable && !hasSignalTable && !isPersonaSection && (
              sec.content.map((line, j) => <p key={j} className="mb-3 last:mb-0">{line}</p>)
            )}
          </div>
        </div>
      );
    });
  };
  
  const parsePersonas = (content: string[]) => {
    const personas: {title: string; goal: string; jtbd: string}[] = [];
    const fullText = content.join(" ");

    // Try primary format: PERSONA:/GOAL:/JTBD:
    const chunks = fullText.split(/(?=PERSONA:)/i).filter(chunk => chunk.trim() && chunk.toLowerCase().includes('persona:'));

    chunks.forEach(chunk => {
      const persona = { title: "", goal: "", jtbd: "" };

      const titleMatch = chunk.match(/PERSONA:\s*([^]*?)(?=\s*GOAL:|$)/i);
      if (titleMatch) {
        persona.title = titleMatch[1].trim().replace(/\s+/g, ' ');
      }

      const goalMatch = chunk.match(/GOAL:\s*([^]*?)(?=\s*JTBD:|$)/i);
      if (goalMatch) {
        persona.goal = goalMatch[1].trim().replace(/\s+/g, ' ');
      }

      const jtbdMatch = chunk.match(/JTBD:\s*([^]*?)$/i);
      if (jtbdMatch) {
        let jtbd = jtbdMatch[1].trim();
        jtbd = jtbd.split(/PERSONA:/i)[0].trim();
        persona.jtbd = jtbd.replace(/\s+/g, ' ');
      }

      if (persona.title && persona.title.length > 2) {
        personas.push(persona);
      }
    });

    // Fallback: Try numbered list format (1. Title - description)
    if (personas.length === 0) {
      const numberedMatches = fullText.match(/\d+\.\s*([^:\n]+?)(?:\s*[-–:]\s*([^\n]+))?/g);
      if (numberedMatches && numberedMatches.length > 0) {
        numberedMatches.slice(0, 4).forEach(match => {
          const parts = match.replace(/^\d+\.\s*/, '').split(/\s*[-–:]\s*/);
          if (parts[0] && parts[0].length > 2) {
            personas.push({
              title: parts[0].trim(),
              goal: parts[1]?.trim() || "",
              jtbd: ""
            });
          }
        });
      }
    }

    // Fallback: Try bullet point format
    if (personas.length === 0) {
      const bulletMatches = fullText.match(/[•\-\*]\s*([^•\-\*\n]+)/g);
      if (bulletMatches && bulletMatches.length > 0) {
        bulletMatches.slice(0, 4).forEach(match => {
          const text = match.replace(/^[•\-\*]\s*/, '').trim();
          if (text.length > 5) {
            personas.push({
              title: text.split(/\s*[-–:]\s*/)[0] || text.substring(0, 50),
              goal: text.split(/\s*[-–:]\s*/)[1] || "",
              jtbd: ""
            });
          }
        });
      }
    }

    // Final fallback: generic placeholder
    if (personas.length === 0) {
      return [{ title: "Key Buyer Persona", goal: content.join(" ").substring(0, 200), jtbd: "" }];
    }

    return personas;
  };

  const nextStep = () => { if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1); };
  const prevStep = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };

  // Step 1: Just validate URL and move to contact form
  const startDiagnostic = () => {
    if (!websiteUrl) { showError("Please enter a website URL"); return; }
    const d = websiteUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    setDomain(d);
    nextStep(); // Goes to contact-info
  };

  // Step 2: Submit contact info and start actual research
  const submitContactAndStartResearch = async () => {
    if (!email) { showError("Please enter your email"); return; }

    setProductsLoading(true);
    setLoadingStage(0);
    nextStep(); // Goes to select-product (loading state)

    // Fire ALL data fetching in parallel for speed
    const [productsResult, websiteResult, linkedInResult] = await Promise.allSettled([
      // 1. Fetch products/offerings via Claude
      callClaude(`Search the web for "${domain}" and identify their products, solutions, or service offerings.

Return ONLY a simple numbered list of their distinct products/offerings. For example:
1. Product Name A
2. Product Name B
3. Service Offering C

If they only have ONE main product/solution, just return that one item.
If it's a service company with no distinct products, list their main service categories.

RULES:
- Maximum 8 items
- Just the product/service names, no descriptions
- No preamble, just the numbered list`),

      // 2. Fetch website content via Firecrawl
      fetchWebsiteContent(domain),

      // 3. Generate Anysite query for LinkedIn (always works, even without MCP)
      fetchLinkedInData("generateQuery", { domain })
    ]);

    // Process products result
    if (productsResult.status === 'fulfilled') {
      const result = productsResult.value;
      let parsed: string[] = [];

      // Try numbered list format
      const numberedLines = result.match(/^\d+[\.\)]\s*.+$/gm);
      if (numberedLines && numberedLines.length > 0) {
        parsed = numberedLines
          .map((line: string) => line.replace(/^\d+[\.\)]\s*/, '').trim())
          .filter((line: string) => line.length > 0 && line.length < 100);
      }

      // Fallback: Try bullet points
      if (parsed.length === 0) {
        const bulletLines = result.match(/^[•\-\*]\s*.+$/gm);
        if (bulletLines && bulletLines.length > 0) {
          parsed = bulletLines
            .map((line: string) => line.replace(/^[•\-\*]\s*/, '').trim())
            .filter((line: string) => line.length > 0 && line.length < 100);
        }
      }

      // Fallback: Split on newlines
      if (parsed.length === 0) {
        parsed = result.split('\n')
          .map((line: string) => line.replace(/^\d+[\.\)]\s*/, '').replace(/^[•\-\*]\s*/, '').trim())
          .filter((line: string) => line.length > 2 && line.length < 100 && !line.toLowerCase().includes('product') && !line.toLowerCase().includes('here'));
      }

      setProducts(parsed.length > 0 ? parsed.slice(0, 8) : [domain]);
    } else {
      setProducts([domain]);
    }

    // Store background data for later use
    setBackgroundData(prev => ({
      ...prev,
      websiteContent: websiteResult.status === 'fulfilled' ? websiteResult.value : null,
      anysiteQuery: linkedInResult.status === 'fulfilled' ? linkedInResult.value.query : null,
    }));

    setProductsLoading(false);
  };

  const saveBasicAndNext = async () => {
    if (!email) { showError("Please enter your email"); return; }
    
    // Send contact data to HubSpot
    try {
      const response = await fetch("/api/hubspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectType: "contacts",
          searchProperty: "email",
          searchValue: email,
          properties: {
            email,
            company: companyName,
            jobtitle: role,
            website: domain,
          }
        })
      });
      const data = await response.json();
      if (data.id) {
        setContactId(data.id);
      }
    } catch (e) {
      console.error("HubSpot contact sync error:", e);
    }
    
    nextStep();
  };

  // Auto-discover ICPs when product is selected
  const discoverICPs = useCallback(async () => {
    if (!selectedProduct || !domain) return;

    const result = await callClaude(`Search the web for "${domain}" "${selectedProduct}" to understand who buys this product.

List 4-6 distinct Ideal Customer Profiles (buyer segments). For each:
1. [Title/Role] - [Brief description of who they are and why they buy]

Example format:
1. VP of Engineering - Technical leader evaluating tools for their team
2. CTO - Strategic buyer focused on enterprise-wide decisions
3. DevOps Manager - Hands-on implementer looking for efficiency

RULES:
- Maximum 6 ICPs
- Each on its own line
- Title first, then dash, then brief description
- No preamble, just the list`);

    // Parse ICPs from response
    const lines = result.split('\n').filter((l: string) => l.trim());
    const parsed: {id: string; title: string; description: string}[] = [];

    lines.forEach((line: string, i: number) => {
      const match = line.match(/^\d*\.?\s*([^-–]+)\s*[-–]\s*(.+)$/);
      if (match) {
        parsed.push({
          id: `icp-${i}`,
          title: match[1].trim(),
          description: match[2].trim()
        });
      }
    });

    if (parsed.length > 0) {
      setDiscoveredICPs(parsed.slice(0, 6));
    } else {
      // Fallback: generic ICPs
      setDiscoveredICPs([
        { id: 'icp-1', title: 'Decision Maker', description: 'Executive with budget authority' },
        { id: 'icp-2', title: 'Technical Evaluator', description: 'Hands-on user who tests solutions' },
        { id: 'icp-3', title: 'Champion', description: 'Internal advocate who drives adoption' }
      ]);
    }
  }, [selectedProduct, domain]);

  useEffect(() => {
    const step = steps[currentStep];
    const phases: {[key: string]: string} = { "research-company": "company", "research-competitive": "competitive", "research-content": "content" };
    const currentPhase = phases[step];

    if (currentPhase) {
      const phaseData = research[currentPhase as keyof typeof research];
      if (!phaseData.initial && !phaseData.loading) runResearchPhase(currentPhase);
    }

    // Discover ICPs when entering ICP selection step
    if (step === "icp-selection" && discoveredICPs.length === 0 && selectedProduct) {
      discoverICPs();
    }

    // Run ICP research after ICPs are selected (when moving to company research)
    if (step === "research-company" && domain) {
      const companyData = research.company;
      if (!companyData.initial && !companyData.loading) runResearchPhase("company");
      // Also trigger ICP research in background
      const icpData = research.icp;
      if (!icpData.initial && !icpData.loading && selectedICPs.length > 0) runResearchPhase("icp");
    }

    if (step === "generating" && !reportData) {
      // Run competitive analysis in background (not a visible step)
      const competitiveData = research.competitive;
      if (!competitiveData.initial && !competitiveData.loading) {
        runResearchPhase("competitive");
      }
      generateReport();
    }
  }, [currentStep, domain, selectedProduct, discoveredICPs.length, selectedICPs.length, discoverICPs]);

  const generateReport = async () => {
    const getR = (k: string) => cleanResponse(research[k as keyof typeof research].refined || research[k as keyof typeof research].initial || "");
    const getCompetitive = () => research.competitive.refined || research.competitive.initial || "";

    // Generate all outputs in parallel for speed
    const [narrativeResult, alphaResult, pillarResult, podcastResult] = await Promise.allSettled([
      callClaude(`You're a straight-talking GTM advisor. Write an executive summary for ${companyName || domain}'s "${selectedProduct}".

Context: ${getR("company").substring(0, 300)}
ICP: ${getR("icp").substring(0, 200)}
GTM maturity: ${alignment.gtm || "unknown"}

YOUR WRITING STYLE:
- Short, punchy sentences. Some just fragments.
- Use periods for emphasis. Like. This.
- No fluff. No "leverage" or "optimize" or "drive growth"
- Sound like a smart friend giving real talk, not a consultant
- Be specific to THEIR business, not generic advice
- Max 150 words total

Write 3 SHORT paragraphs:
1. What's working (be specific)
2. The gap (what's broken or missing)
3. The unlock (one clear priority)

NO PREAMBLE. Start with paragraph 1.`),
      callClaude(getAlphaSignalsPrompt()),
      callClaude(getPillarContentPrompt()),
      callClaude(getPodcastGuestsPrompt())
    ]);

    const narrative = narrativeResult.status === 'fulfilled' ? narrativeResult.value : '';
    const alphaRaw = alphaResult.status === 'fulfilled' ? alphaResult.value : '';
    const pillarRaw = pillarResult.status === 'fulfilled' ? pillarResult.value : '';
    const podcastRaw = podcastResult.status === 'fulfilled' ? podcastResult.value : '';

    // Parse alpha signals
    const parsedSignals: {name: string; source: string; detection: string; impact: string; example: string}[] = [];
    const signalBlocks = alphaRaw.split(/SIGNAL \d+:/i).filter((s: string) => s.trim());
    signalBlocks.forEach((block: string) => {
      const nameMatch = block.match(/^[^\n]+/);
      const sourceMatch = block.match(/SOURCE:\s*([^\n]+)/i);
      const detectionMatch = block.match(/DETECTION:\s*([^\n]+)/i);
      const impactMatch = block.match(/IMPACT:\s*([^\n]+)/i);
      const exampleMatch = block.match(/EXAMPLE:\s*([^\n]+)/i);
      if (nameMatch) {
        parsedSignals.push({
          name: nameMatch[0].trim(),
          source: sourceMatch ? sourceMatch[1].trim() : '',
          detection: detectionMatch ? detectionMatch[1].trim() : '',
          impact: impactMatch ? impactMatch[1].trim() : 'Medium',
          example: exampleMatch ? exampleMatch[1].trim() : ''
        });
      }
    });
    setAlphaSignals(parsedSignals);

    // Parse pillar content
    const titleMatch = pillarRaw.match(/TITLE:\s*([^\n]+)/i);
    const conceptMatch = pillarRaw.match(/CONCEPT:\s*([^\n]+(?:\n(?!DATA|CADENCE|FORMAT)[^\n]+)*)/i);
    const dataMatch = pillarRaw.match(/DATA SOURCES:\s*([^\n]+(?:\n(?!CADENCE|FORMAT)[^\n]+)*)/i);
    const cadenceMatch = pillarRaw.match(/CADENCE:\s*([^\n]+)/i);
    if (titleMatch) {
      setPillarContent({
        title: titleMatch[1].trim(),
        concept: conceptMatch ? conceptMatch[1].trim() : '',
        dataSources: dataMatch ? dataMatch[1].trim() : '',
        cadence: cadenceMatch ? cadenceMatch[1].trim() : ''
      });
    }

    // Parse podcast guests
    const parsedGuests: {name: string; company: string; icpMatch: string; topic: string; whyInvite: string}[] = [];
    const guestBlocks = podcastRaw.split(/GUEST \d+:/i).filter((s: string) => s.trim());
    guestBlocks.forEach((block: string) => {
      const nameMatch = block.match(/NAME:\s*([^\n]+)/i);
      const companyMatch = block.match(/COMPANY:\s*([^\n]+)/i);
      const icpMatch = block.match(/ICP MATCH:\s*([^\n]+)/i);
      const topicMatch = block.match(/TOPIC:\s*([^\n]+)/i);
      const valueMatch = block.match(/VALUE:\s*([^\n]+)/i);
      if (nameMatch) {
        parsedGuests.push({
          name: nameMatch[1].trim(),
          company: companyMatch ? companyMatch[1].trim() : '',
          icpMatch: icpMatch ? icpMatch[1].trim() : '',
          topic: topicMatch ? topicMatch[1].trim() : '',
          whyInvite: valueMatch ? valueMatch[1].trim() : ''
        });
      }
    });
    setPodcastGuests(parsedGuests);

    const finalReportData = {
      narrative,
      icp: research.icp.refined || research.icp.initial || "",
      content: getR("content"),
      competitive: getCompetitive()
    };

    setReportData(finalReportData);

    // Extract content grade (letter only)
    const contentText = getR("content");
    const gradeMatch = contentText.match(/CONTENT GRADE:\s*([A-F])/i);
    const contentGrade = gradeMatch ? gradeMatch[1].toUpperCase() : "";

    // Send analysis data to HubSpot Company
    try {
      await fetch("/api/hubspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectType: "companies",
          searchProperty: "domain",
          searchValue: domain,
          properties: {
            domain,
            name: companyName || domain,
            gtm_company_analysis: getR("company").substring(0, 65000),
            gtm_icp_summary: getR("icp").substring(0, 65000),
            gtm_competitive_landscape: cleanCompetitiveResponse(getCompetitive()).substring(0, 65000),
            gtm_content_grade: contentGrade,
            gtm_content_analysis: contentText.substring(0, 65000),
            gtm_narrative: cleanResponse(narrative).substring(0, 65000),
            gtm_diagnostic_date: new Date().toISOString().split('T')[0],
            gtm_alpha_signals: JSON.stringify(parsedSignals).substring(0, 65000),
            gtm_pillar_content: JSON.stringify(pillarContent).substring(0, 65000),
            gtm_podcast_guests: JSON.stringify(parsedGuests).substring(0, 65000),
            gtm_selected_icps: selectedICPs.join('; '),
            gtm_anysite_query: backgroundData.anysiteQuery || ''
          },
          associateWith: contactId ? { type: "contacts", id: contactId } : undefined
        })
      });
    } catch (e) {
      console.error("HubSpot company sync error:", e);
    }

    setCurrentStep(steps.indexOf("results"));
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center gap-1.5 mb-7">
      {steps.map((_, i) => (
        <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${i < currentStep ? "bg-green-500" : i === currentStep ? "bg-[#ff6f20] scale-125" : "bg-white/15"}`} />
      ))}
    </div>
  );

  const renderIntro = () => (
    <div className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#3f3b3a] rounded-3xl p-11 text-center relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6f20]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#5b2e5e]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative">
        <div className="inline-block px-4 py-1.5 bg-[#ff6f20]/15 border border-[#ff6f20]/30 rounded-full text-[#ff6f20] text-sm font-semibold mb-6">
          SIGNAL-DRIVEN GTM OS
        </div>

        <h2 className="font-bold text-3xl mb-4 max-w-2xl mx-auto" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>
          Build Your Signal-Driven GTM Operating System
        </h2>

        <p className="text-[#aaa7a6] mb-4 max-w-xl mx-auto leading-relaxed">
          We&apos;ll analyze your business and get your feedback on key assumptions to create a complete signal-driven go-to-market system.
        </p>

        {/* Core value loop */}
        <div className="bg-[#070606]/50 border border-[#3f3b3a] rounded-xl p-4 mb-8 max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-[#ff6f20] font-medium">Signals</span>
            <span className="text-[#5a5654]">→</span>
            <span className="text-[#ffdd1f] font-medium">Content</span>
            <span className="text-[#5a5654]">→</span>
            <span className="text-[#9a5d9d] font-medium">Trust</span>
            <span className="text-[#5a5654]">→</span>
            <span className="text-[#22c55e] font-medium">Demand</span>
          </div>
        </div>

        <div className="max-w-sm mx-auto">
          <input
            type="url"
            placeholder="https://yourcompany.com"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startDiagnostic()}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-5 py-4 text-white text-center mb-4 outline-none focus:border-[#ff6f20] transition-colors"
          />
          <button
            onClick={startDiagnostic}
            className="w-full bg-gradient-to-r from-[#ff6f20] to-[#e56318] text-white py-4 px-8 rounded-xl font-semibold hover:shadow-lg hover:shadow-[#ff6f20]/30 transition-all"
          >
            Start Building Your GTM OS →
          </button>
        </div>

        <p className="mt-6 text-sm text-[#75716f]">5-7 minutes • AI-powered research • Actionable program</p>
      </div>
    </div>
  );

  const renderContactInfo = () => (
    <div className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#3f3b3a] rounded-3xl p-11 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#5b2e5e]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#ff6f20]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative">
        <div className="inline-block px-3 py-1 bg-[#5b2e5e]/20 border border-[#5b2e5e]/30 rounded-full text-[#9a5d9d] text-xs font-semibold mb-4">
          QUICK INFO
        </div>
        <h2 className="font-bold text-2xl mb-2" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>
          Where should we send your report?
        </h2>
        <p className="text-[#aaa7a6] mb-8">We&apos;ll start analyzing <span className="text-white font-medium">{domain}</span> while you fill this out.</p>

        <div className="grid gap-4 max-w-md mx-auto">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white outline-none focus:border-[#ff6f20] transition-colors"
            />
            <input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white outline-none focus:border-[#ff6f20] transition-colors"
            />
          </div>
          <input
            type="email"
            placeholder="Work email *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && email && submitContactAndStartResearch()}
            className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white outline-none focus:border-[#ff6f20] transition-colors"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            aria-label="Your role"
            className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white outline-none focus:border-[#ff6f20] transition-colors appearance-none cursor-pointer"
          >
            <option value="" className="bg-[#232120]">Your role (optional)</option>
            <option value="Founder/CEO" className="bg-[#232120]">Founder/CEO</option>
            <option value="Marketing" className="bg-[#232120]">Marketing</option>
            <option value="Sales" className="bg-[#232120]">Sales</option>
            <option value="RevOps" className="bg-[#232120]">RevOps</option>
            <option value="Other" className="bg-[#232120]">Other</option>
          </select>
        </div>

        <div className="mt-8 flex gap-3 justify-center">
          <button
            onClick={prevStep}
            className="px-6 py-3 text-white/60 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={submitContactAndStartResearch}
            disabled={!email}
            className={`px-8 py-3 rounded-xl font-semibold transition-all ${
              email
                ? "bg-gradient-to-r from-[#ff6f20] to-[#e56318] text-white hover:shadow-lg hover:shadow-[#ff6f20]/30"
                : "bg-white/10 text-white/40 cursor-not-allowed"
            }`}
          >
            Analyze {domain} →
          </button>
        </div>

        <p className="mt-6 text-xs text-[#75716f] text-center">Your info stays private. We just need an email to send your personalized report.</p>
      </div>
    </div>
  );

  const renderSelectProduct = () => {
    if (productsLoading) {
      const stage = loadingStages[loadingStage];
      const insight = gtmInsights[currentInsight];

      return (
        <div className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#3f3b3a] rounded-3xl p-11">
          <div className="text-center py-8">
            {/* Animated loader with stage icon */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-[#3f3b3a] rounded-full" />
              <div className="absolute inset-0 border-4 border-transparent border-t-[#ff6f20] rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">
                {stage.icon}
              </div>
            </div>

            <h3 className="font-semibold text-xl mb-2" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>
              {stage.text}
            </h3>
            <p className="text-[#75716f] text-sm mb-8">{stage.subtext}</p>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-8">
              {loadingStages.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${i <= loadingStage ? 'bg-[#ff6f20]' : 'bg-[#3f3b3a]'}`}
                />
              ))}
            </div>

            {/* Rotating insight */}
            <div className="bg-[#070606]/50 border border-[#3f3b3a] rounded-xl p-4 max-w-md mx-auto">
              <div className="flex items-start gap-3">
                <span className="text-[#ffdd1f] text-lg">💡</span>
                <p className="text-sm text-[#aaa7a6] text-left leading-relaxed">{insight}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-11">
        <h2 className="font-bold text-2xl mb-3">Select Your Focus</h2>
        <p className="text-white/60 mb-6">Which product or offering should we analyze? This helps us give you specific, actionable insights.</p>
        <div className="space-y-3">
          {products.map((product, i) => (
            <div
              key={i}
              onClick={() => setSelectedProduct(product)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedProduct === product ? "border-[#ff6f20] bg-[#ff6f20]/10" : "border-white/15 bg-white/5 hover:border-[#ff6f20]/40"}`}
            >
              <div className="font-semibold">{product}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-7">
          <button type="button" onClick={prevStep} className="bg-white/5 border border-white/15 text-white py-4 px-8 rounded-lg font-medium hover:bg-white/10 transition-all">← Back</button>
          <button
            type="button"
            onClick={() => { if (selectedProduct) nextStep(); else showError("Please select a product to analyze"); }}
            className="flex-1 bg-gradient-to-r from-[#ff6f20] to-[#e56318] text-white py-4 px-8 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#ff6f20]/30 transition-all"
          >Continue →</button>
        </div>
      </div>
    );
  };

  const renderICPSelection = () => {
    const isLoading = discoveredICPs.length === 0;
    const toggleICP = (id: string) => {
      setSelectedICPs(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(0, 3)
      );
    };

    if (isLoading) {
      return (
        <div className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#3f3b3a] rounded-3xl p-11">
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-[#3f3b3a] border-t-[#5b2e5e] rounded-full animate-spin mx-auto mb-5" />
            <h3 className="font-semibold text-xl mb-2">Discovering Your Buyers</h3>
            <p className="text-[#75716f]">Identifying ideal customer profiles for {selectedProduct}...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#3f3b3a] rounded-3xl p-11">
        <div className="inline-block px-3 py-1 bg-[#5b2e5e]/20 border border-[#5b2e5e]/30 rounded-full text-[#9a5d9d] text-xs font-semibold mb-4">
          NARROW YOUR FOCUS
        </div>
        <h2 className="font-bold text-2xl mb-3">Who should we focus on?</h2>
        <p className="text-[#aaa7a6] mb-6">Select 1-3 ideal customer profiles. This helps us generate more targeted signals, content, and outreach strategies.</p>

        <div className="grid gap-3">
          {discoveredICPs.map((icp) => (
            <div
              key={icp.id}
              onClick={() => toggleICP(icp.id)}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                selectedICPs.includes(icp.id)
                  ? "border-[#5b2e5e] bg-[#5b2e5e]/15"
                  : "border-[#3f3b3a] bg-[#070606]/50 hover:border-[#5b2e5e]/50"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                  selectedICPs.includes(icp.id)
                    ? "border-[#5b2e5e] bg-[#5b2e5e]"
                    : "border-[#5a5654]"
                }`}>
                  {selectedICPs.includes(icp.id) && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-white">{stripMarkdown(icp.title)}</div>
                  <div className="text-sm text-[#aaa7a6] mt-1">{stripMarkdown(icp.description)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedICPs.length > 0 && (
          <div className="mt-4 text-sm text-[#75716f]">
            {selectedICPs.length} of 3 max selected
          </div>
        )}

        <div className="flex gap-3 mt-7">
          <button type="button" onClick={prevStep} className="bg-white/5 border border-white/15 text-white py-4 px-8 rounded-lg font-medium hover:bg-white/10 transition-all">← Back</button>
          <button
            type="button"
            onClick={() => { if (selectedICPs.length > 0) nextStep(); else showError("Please select at least one ICP"); }}
            className="flex-1 bg-gradient-to-r from-[#5b2e5e] to-[#7a3d7d] text-white py-4 px-8 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#5b2e5e]/30 transition-all"
          >
            Continue with {selectedICPs.length} ICP{selectedICPs.length !== 1 ? 's' : ''} →
          </button>
        </div>
      </div>
    );
  };

  const renderBasic = () => (
    <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-11">
      <h2 className="font-bold text-2xl mb-3">Quick Details</h2>
      <p className="text-white/60 mb-8">Helps personalize your report.</p>
      <div className="space-y-6">
        <div>
          <label className="block mb-3 font-medium">Email</label>
          <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-4 text-white outline-none focus:border-[#ff6f20]" />
        </div>
        <div>
          <label className="block mb-3 font-medium">Company</label>
          <input type="text" placeholder="Acme Inc" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-4 text-white outline-none focus:border-[#ff6f20]" />
        </div>
        <div>
          <label className="block mb-3 font-medium">Role</label>
          <input type="text" placeholder="VP Marketing" value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-4 text-white outline-none focus:border-[#ff6f20]" />
        </div>
        <div>
          <label className="block mb-3 font-medium">Company size</label>
          <div className="flex flex-wrap gap-2">
            {["1-10", "11-50", "51-200", "201-500", "500+"].map((opt) => (
              <button key={opt} onClick={() => setCompanySize(opt)} className={`px-4 py-3 rounded-lg border-2 transition-all ${companySize === opt ? "border-[#ff6f20] bg-[#ff6f20]/10" : "border-white/15 bg-white/5 hover:border-[#ff6f20]/40"}`}>{opt}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block mb-3 font-medium">CRM</label>
          <div className="flex flex-wrap gap-2">
            {["HubSpot", "Salesforce", "Other", "None"].map((opt) => (
              <button key={opt} onClick={() => setCrm(opt)} className={`px-4 py-3 rounded-lg border-2 transition-all ${crm === opt ? "border-[#ff6f20] bg-[#ff6f20]/10" : "border-white/15 bg-white/5 hover:border-[#ff6f20]/40"}`}>{opt}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-7">
        <button onClick={prevStep} className="bg-white/5 border border-white/15 text-white py-4 px-8 rounded-lg font-medium hover:bg-white/10 transition-all">← Back</button>
        <button onClick={saveBasicAndNext} className="flex-1 bg-gradient-to-r from-[#ff6f20] to-[#e56318] text-white py-4 px-8 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#ff6f20]/30 transition-all">Continue →</button>
      </div>
    </div>
  );

  const renderResearch = (phaseKey: string, title: string) => {
    const r = research[phaseKey as keyof typeof research];
    if (r.loading || !r.initial) {
      return (
        <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-11">
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-white/10 border-t-[#ff6f20] rounded-full animate-spin mx-auto mb-5" />
            <h3 className="font-semibold text-xl mb-2">Analyzing {domain}</h3>
            <p className="text-white/60">Researching {title.toLowerCase()}...</p>
          </div>
        </div>
      );
    }
    const displayText = r.refined || r.initial;
    const isRefined = !!r.refined;
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-11">
        <div className={`inline-block px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide mb-4 ${isRefined ? "bg-green-500/15 text-green-500" : "bg-[#ff6f20]/15 text-[#ff6f20]"}`}>{isRefined ? "✓ REFINED" : "INITIAL ANALYSIS"}</div>
        <h2 className="font-bold text-2xl mb-2">{title}</h2>
        <p className="text-white/60 mb-2">Review and add corrections if needed.</p>
        <div className="bg-gradient-to-br from-black/40 to-black/20 border border-white/10 rounded-2xl p-7 my-6">{formatResearchOutput(displayText, phaseKey)}</div>
        <div className="bg-gradient-to-br from-[#ff6f20]/10 to-[#ff6f20]/5 border border-[#ff6f20]/20 rounded-xl p-6 mt-6">
          <div className="font-medium mb-3">Anything to correct?</div>
          <textarea rows={3} placeholder="e.g., We focus on enterprise..." value={r.feedback} onChange={(e) => setResearch(prev => ({ ...prev, [phaseKey]: { ...prev[phaseKey as keyof typeof prev], feedback: e.target.value } }))} className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-4 text-white outline-none focus:border-[#ff6f20] resize-y" />
          <button onClick={async () => {
            if (!r.feedback.trim()) return;
            setResearch(prev => ({ ...prev, [phaseKey]: { ...prev[phaseKey as keyof typeof prev], loading: true } }));
            const isCompetitive = phaseKey === "competitive";
            const prompt = `You are an expert GTM strategist. Below is your original analysis and the user's feedback.

ORIGINAL ANALYSIS:
${r.initial}

USER FEEDBACK:
${r.feedback}

CRITICAL INSTRUCTIONS:
1. You are the expert. Do NOT simply accept all feedback.
2. If feedback provides useful CONTEXT (company details, market info, corrections to facts), incorporate it.
3. If feedback tries to CHANGE your strategic recommendations without good reason, push back. Explain why your original position is correct.
4. If feedback contradicts GTM best practices, politely disagree and maintain your expert stance.
${isCompetitive ? `5. COMPETITIVE ANALYSIS SPECIAL RULES:
   - If user suggests NEW COMPETITORS, you MUST add them to the COMPARISON TABLE
   - Keep the exact table format: Competitor | Their Strength | Their Weakness | Where You Win
   - Research the new competitors and provide real insights, not placeholders
   - Maintain all existing competitors in the table unless user explicitly says to remove them
6.` : `5.`} At the end, add a section called "ANALYST NOTES" that briefly explains:
   - What feedback you incorporated and why
   - What feedback you respectfully disagreed with and why

Use the same ALL CAPS headers as the original. Write TO them using "you/your". No preamble - start with the first header.`;
            const refined = await callClaude(prompt);
            setResearch(prev => ({ ...prev, [phaseKey]: { ...prev[phaseKey as keyof typeof prev], refined, loading: false } }));
          }} className="mt-3 px-6 py-3 rounded-lg border-2 border-[#ff6f20] text-[#ff6f20] font-semibold hover:bg-[#ff6f20]/10 transition-all">Refine</button>
        </div>
        <div className="flex gap-3 mt-7">
          <button onClick={prevStep} className="bg-white/5 border border-white/15 text-white py-4 px-8 rounded-lg font-medium hover:bg-white/10 transition-all">← Back</button>
          <button onClick={nextStep} className="flex-1 bg-gradient-to-r from-[#ff6f20] to-[#e56318] text-white py-4 px-8 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#ff6f20]/30 transition-all">Looks Good →</button>
        </div>
      </div>
    );
  };

  const renderSignals = () => (
    <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-11">
      <h2 className="font-bold text-2xl mb-3">Your Signal Stack</h2>
      <p className="text-white/60 mb-6">Which tools detect buying signals?</p>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {signalVendors.map((v) => (
          <div key={v.id} onClick={() => setSelectedVendors(prev => prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id])} className={`p-4 rounded-xl border-2 cursor-pointer text-center transition-all ${selectedVendors.includes(v.id) ? "border-[#ff6f20] bg-[#ff6f20]/10" : "border-white/15 bg-white/5 hover:border-[#ff6f20]/40"}`}>
            <div className="w-11 h-11 rounded-lg bg-white/10 mx-auto mb-2 flex items-center justify-center overflow-hidden">
              <img src={v.logo} alt={v.name} className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
              <span className="hidden text-2xl">{v.fallback}</span>
            </div>
            <div className="text-xs font-semibold">{v.name}</div>
          </div>
        ))}
        <div onClick={() => setSelectedVendors(prev => prev.includes("none") ? prev.filter(x => x !== "none") : [...prev, "none"])} className={`p-4 rounded-xl border-2 cursor-pointer text-center transition-all ${selectedVendors.includes("none") ? "border-[#ff6f20] bg-[#ff6f20]/10" : "border-white/15 bg-white/5 hover:border-[#ff6f20]/40"}`}>
          <div className="text-3xl mb-2">🚫</div>
          <div className="text-xs font-semibold">None</div>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-[#ff6f20] mt-8 mb-4">What signals do you track?</h3>
      <div className="grid grid-cols-2 gap-2">
        {signalTypes.map((s) => (
          <div key={s.id} onClick={() => setSelectedSignals(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])} className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${selectedSignals.includes(s.id) ? "border-[#ff6f20] bg-[#ff6f20]/10" : "border-white/15 bg-white/5 hover:border-[#ff6f20]/40"}`}>
            <div className="font-semibold text-sm">{s.label}</div>
            <div className="text-xs text-white/40">{s.desc}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-7">
        <button onClick={prevStep} className="bg-white/5 border border-white/15 text-white py-4 px-8 rounded-lg font-medium hover:bg-white/10 transition-all">← Back</button>
        <button onClick={nextStep} className="flex-1 bg-gradient-to-r from-[#ff6f20] to-[#e56318] text-white py-4 px-8 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#ff6f20]/30 transition-all">Continue →</button>
      </div>
    </div>
  );

  const renderAlignment = () => (
    <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-11">
      <h2 className="font-bold text-2xl mb-3">Team Alignment</h2>
      <p className="text-white/60 mb-8">How connected are Marketing, Sales, CS?</p>
      <div className="space-y-6">
        <div>
          <label className="block mb-3 font-medium">GTM motion?</label>
          <div className="flex flex-col gap-2">
            {[{ v: "random", l: "Random acts of GTM" }, { v: "siloed", l: "Siloed teams" }, { v: "coordinated", l: "Coordinated but gaps" }, { v: "integrated", l: "Integrated" }, { v: "unified", l: "Unified revenue engine" }].map((opt) => (
              <button type="button" key={opt.v} onClick={() => setAlignment(prev => ({ ...prev, gtm: opt.v }))} className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${alignment.gtm === opt.v ? "border-[#ff6f20] bg-[#ff6f20]/10" : "border-white/15 bg-white/5 hover:border-[#ff6f20]/40"}`}>{opt.l}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-7">
        <button type="button" onClick={prevStep} className="bg-white/5 border border-white/15 text-white py-4 px-8 rounded-lg font-medium hover:bg-white/10 transition-all">← Back</button>
        <button type="button" onClick={() => setCurrentStep(steps.indexOf("generating"))} className="flex-1 bg-gradient-to-r from-[#ff6f20] to-[#e56318] text-white py-4 px-8 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#ff6f20]/30 transition-all">Generate Report →</button>
      </div>
    </div>
  );

  // Combined signals + alignment step (moved later in flow as requested)
  const renderSignalsAlignment = () => (
    <div className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#3f3b3a] rounded-3xl p-11 space-y-10">
      {/* Signal Stack Section */}
      <div>
        <div className="inline-block px-3 py-1 bg-[#ff6f20]/15 border border-[#ff6f20]/30 rounded-full text-[#ff6f20] text-xs font-semibold mb-4">
          SIGNAL STACK
        </div>
        <h2 className="font-bold text-2xl mb-3">What signals do you currently track?</h2>
        <p className="text-[#aaa7a6] mb-6">Select your signal tools and the types of buying signals you monitor.</p>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
          {signalVendors.map((v) => (
            <div
              key={v.id}
              onClick={() => setSelectedVendors(prev => prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id])}
              className={`p-4 rounded-xl border-2 cursor-pointer text-center transition-all ${selectedVendors.includes(v.id) ? "border-[#ff6f20] bg-[#ff6f20]/10" : "border-[#3f3b3a] bg-[#070606]/50 hover:border-[#ff6f20]/40"}`}
            >
              <div className="w-10 h-10 rounded-lg bg-white/10 mx-auto mb-2 flex items-center justify-center overflow-hidden">
                <img src={v.logo} alt={v.name} className="w-7 h-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                <span className="hidden text-xl">{v.fallback}</span>
              </div>
              <div className="text-xs font-semibold">{v.name}</div>
            </div>
          ))}
          <div
            onClick={() => setSelectedVendors(prev => prev.includes("none") ? prev.filter(x => x !== "none") : [...prev, "none"])}
            className={`p-4 rounded-xl border-2 cursor-pointer text-center transition-all ${selectedVendors.includes("none") ? "border-[#ff6f20] bg-[#ff6f20]/10" : "border-[#3f3b3a] bg-[#070606]/50 hover:border-[#ff6f20]/40"}`}
          >
            <div className="text-2xl mb-2">🚫</div>
            <div className="text-xs font-semibold">None</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {signalTypes.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedSignals(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${selectedSignals.includes(s.id) ? "border-[#ff6f20] bg-[#ff6f20]/10" : "border-[#3f3b3a] bg-[#070606]/50 hover:border-[#ff6f20]/40"}`}
            >
              <div className="font-semibold text-sm">{s.label}</div>
              <div className="text-xs text-[#75716f]">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Alignment Section */}
      <div className="border-t border-[#3f3b3a] pt-8">
        <div className="inline-block px-3 py-1 bg-[#5b2e5e]/15 border border-[#5b2e5e]/30 rounded-full text-[#9a5d9d] text-xs font-semibold mb-4">
          GTM ALIGNMENT
        </div>
        <h3 className="font-bold text-xl mb-3">How aligned is your GTM team?</h3>
        <p className="text-[#aaa7a6] mb-4">This helps us calibrate recommendations for your maturity level.</p>

        <div className="flex flex-col gap-2">
          {[
            { v: "random", l: "Random acts of GTM", d: "No coordinated strategy" },
            { v: "siloed", l: "Siloed teams", d: "Marketing, Sales, CS work independently" },
            { v: "coordinated", l: "Coordinated but gaps", d: "Some alignment, inconsistent execution" },
            { v: "integrated", l: "Integrated", d: "Shared goals, regular collaboration" },
            { v: "unified", l: "Unified revenue engine", d: "Full alignment, signal-driven" }
          ].map((opt) => (
            <button
              type="button"
              key={opt.v}
              onClick={() => setAlignment(prev => ({ ...prev, gtm: opt.v }))}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                alignment.gtm === opt.v
                  ? "border-[#5b2e5e] bg-[#5b2e5e]/15"
                  : "border-[#3f3b3a] bg-[#070606]/50 hover:border-[#5b2e5e]/40"
              }`}
            >
              <div className="font-semibold">{opt.l}</div>
              <div className="text-xs text-[#75716f]">{opt.d}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <button type="button" onClick={prevStep} className="bg-white/5 border border-white/15 text-white py-4 px-8 rounded-xl font-medium hover:bg-white/10 transition-all">← Back</button>
        <button
          type="button"
          onClick={() => setCurrentStep(steps.indexOf("generating"))}
          className="flex-1 bg-gradient-to-r from-[#ff6f20] to-[#e56318] text-white py-4 px-8 rounded-xl font-semibold hover:shadow-lg hover:shadow-[#ff6f20]/30 transition-all"
        >
          Generate Your GTM OS →
        </button>
      </div>
    </div>
  );

  const renderGenerating = () => (
    <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-11">
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-white/10 border-t-[#ff6f20] rounded-full animate-spin mx-auto mb-5" />
        <h3 className="font-semibold text-xl mb-2">Building Your Report</h3>
        <p className="text-white/60">Synthesizing research...</p>
      </div>
    </div>
  );

 const renderResults = () => {
    if (!reportData) return renderGenerating();
    
    const getContentGrade = () => {
      const content = reportData.content || "";
      const match = content.match(/CONTENT GRADE:\s*([A-F])/i);
      return match ? match[1] : "?";
    };
    
    const grade = getContentGrade();
    const gradeColors: {[key: string]: string} = {
      "A": "text-green-400 border-green-400",
      "B": "text-green-300 border-green-300", 
      "C": "text-yellow-400 border-yellow-400",
      "D": "text-orange-400 border-orange-400",
      "F": "text-red-400 border-red-400",
      "?": "text-white/40 border-white/40"
    };

    const parseCompetitors = () => {
      const text = reportData.competitive || "";
      const competitors: {name: string; strength: string; weakness: string; youWin: string}[] = [];

      // Try pipe-separated format first
      const pipeLines = text.split('\n').filter(l => l.includes('|') && !l.toLowerCase().includes('competitor') && !l.match(/^[\s\-:|]+$/));
      if (pipeLines.length > 0) {
        pipeLines.slice(0, 5).forEach(line => {
          const parts = line.split('|').map(p => p.trim()).filter(p => p.length > 0);
          if (parts.length >= 2 && parts[0].length < 50) {
            competitors.push({
              name: parts[0] || "",
              strength: parts[1] || "",
              weakness: parts[2] || "",
              youWin: parts[3] || ""
            });
          }
        });
      }

      // Fallback: Try numbered list with competitor names
      if (competitors.length === 0) {
        const numberedMatches = text.match(/\d+\.\s*([^\n:]+?)(?:\s*[-–:]\s*([^\n]+))?/g);
        if (numberedMatches && numberedMatches.length > 0) {
          numberedMatches.slice(0, 5).forEach(match => {
            const parts = match.replace(/^\d+\.\s*/, '').split(/\s*[-–:]\s*/);
            if (parts[0] && parts[0].length > 2 && parts[0].length < 50) {
              competitors.push({
                name: parts[0].trim(),
                strength: parts[1]?.trim() || "Established player",
                weakness: "",
                youWin: ""
              });
            }
          });
        }
      }

      // Fallback: Look for company-like words
      if (competitors.length === 0) {
        const companyPatterns = text.match(/(?:vs\.?|versus|competitor|alternative)[\s:]+([A-Z][a-zA-Z0-9\s&]+?)(?:[,.\n]|$)/gi);
        if (companyPatterns) {
          companyPatterns.slice(0, 5).forEach(match => {
            const name = match.replace(/^(?:vs\.?|versus|competitor|alternative)[\s:]*/i, '').trim();
            if (name.length > 2 && name.length < 40) {
              competitors.push({ name, strength: "", weakness: "", youWin: "" });
            }
          });
        }
      }

      return competitors;
    };

    const competitors = parseCompetitors();
    
    const downloadReport = async () => {
      const safeClean = (text: string) => text ? cleanResponse(text) : "(No data)";

      // Create PDF Document
      const GTMReportPDF = () => (
        <Document>
          <Page size="A4" style={pdfStyles.page}>
            {/* Header */}
            <View style={pdfStyles.header}>
              <Text style={pdfStyles.title}>{companyName || domain}</Text>
              <Text style={pdfStyles.subtitle}>{selectedProduct} - GTM Operating System</Text>
              <Text style={pdfStyles.date}>Generated by Smoke Signals AI • {new Date().toLocaleDateString()}</Text>
            </View>

            {/* Executive Summary */}
            <View style={pdfStyles.section}>
              <Text style={pdfStyles.sectionTitle}>The Bottom Line</Text>
              {safeClean(reportData?.narrative).split('\n\n').map((p, i) => (
                <Text key={i} style={pdfStyles.text}>{p}</Text>
              ))}
            </View>

            {/* Alpha Signals */}
            {alphaSignals.length > 0 && (
              <View style={pdfStyles.section}>
                <Text style={pdfStyles.sectionTitle}>Alpha Signals</Text>
                <Text style={pdfStyles.text}>Buying indicators that predict intent before competitors notice</Text>
                {alphaSignals.map((signal, i) => (
                  <View key={i} style={pdfStyles.signalCard}>
                    <Text style={pdfStyles.signalName}>{i + 1}. {signal.name}</Text>
                    <Text style={pdfStyles.signalImpact}>{signal.impact}</Text>
                    <Text style={pdfStyles.label}>Source: <Text style={pdfStyles.value}>{signal.source}</Text></Text>
                    <Text style={pdfStyles.label}>Detection: <Text style={pdfStyles.value}>{signal.detection}</Text></Text>
                    {signal.example && <Text style={pdfStyles.label}>Example: <Text style={pdfStyles.value}>{signal.example}</Text></Text>}
                  </View>
                ))}
              </View>
            )}

            {/* Pillar Content */}
            {pillarContent && (
              <View style={pdfStyles.sectionPurple}>
                <Text style={pdfStyles.sectionTitlePurple}>Pillar Content Concept</Text>
                <Text style={pdfStyles.signalName}>{pillarContent.title}</Text>
                <Text style={pdfStyles.text}>{pillarContent.concept}</Text>
                <Text style={pdfStyles.label}>Data Sources: <Text style={pdfStyles.value}>{pillarContent.dataSources}</Text></Text>
                <Text style={pdfStyles.label}>Cadence: <Text style={pdfStyles.value}>{pillarContent.cadence}</Text></Text>
              </View>
            )}
          </Page>

          <Page size="A4" style={pdfStyles.page}>
            {/* Podcast Guests */}
            {podcastGuests.length > 0 && (
              <View style={pdfStyles.sectionYellow}>
                <Text style={pdfStyles.sectionTitleYellow}>Podcast Guest Suggestions</Text>
                <Text style={pdfStyles.text}>ICP-matching guests who expand your reach to ideal buyers</Text>
                {podcastGuests.map((guest, i) => (
                  <View key={i} style={pdfStyles.guestCard}>
                    <Text style={pdfStyles.guestName}>{i + 1}. {guest.name}</Text>
                    <Text style={pdfStyles.guestCompany}>{guest.company}</Text>
                    <Text style={pdfStyles.label}>ICP Match: <Text style={pdfStyles.value}>{guest.icpMatch}</Text></Text>
                    <Text style={pdfStyles.label}>Topic: <Text style={pdfStyles.value}>{guest.topic}</Text></Text>
                    {guest.whyInvite && <Text style={pdfStyles.label}>Value: <Text style={pdfStyles.value}>{guest.whyInvite}</Text></Text>}
                  </View>
                ))}
              </View>
            )}

            {/* Program Elements */}
            <View style={pdfStyles.section}>
              <Text style={pdfStyles.sectionTitle}>Signal-Driven GTM Program</Text>
              <Text style={pdfStyles.text}>Each element feeds the next — signals generate content, content builds trust, trust accelerates pipeline.</Text>
              <View style={pdfStyles.programGrid}>
                <View style={pdfStyles.programItem}>
                  <Text style={pdfStyles.programTitle}>VOC Program</Text>
                  <Text style={pdfStyles.programDesc}>25 ICP conversations with topic guides</Text>
                </View>
                <View style={pdfStyles.programItem}>
                  <Text style={pdfStyles.programTitle}>Social Listening</Text>
                  <Text style={pdfStyles.programDesc}>50 ICP connections per month</Text>
                </View>
                <View style={pdfStyles.programItem}>
                  <Text style={pdfStyles.programTitle}>ICP Podcasts</Text>
                  <Text style={pdfStyles.programDesc}>4 strategic guest episodes</Text>
                </View>
                <View style={pdfStyles.programItem}>
                  <Text style={pdfStyles.programTitle}>Pillar Content</Text>
                  <Text style={pdfStyles.programDesc}>Signal-based reports</Text>
                </View>
                <View style={pdfStyles.programItem}>
                  <Text style={pdfStyles.programTitle}>Signal Sequences</Text>
                  <Text style={pdfStyles.programDesc}>Trigger-based outreach</Text>
                </View>
                <View style={pdfStyles.programItem}>
                  <Text style={pdfStyles.programTitle}>HubSpot Enablement</Text>
                  <Text style={pdfStyles.programDesc}>Meeting prep, sales process, reporting</Text>
                </View>
              </View>
            </View>

            {/* CTA */}
            <View style={pdfStyles.cta}>
              <Text style={pdfStyles.ctaTitle}>Ready to Build Your Signal-Driven GTM?</Text>
              <Text style={pdfStyles.ctaText}>Turn this diagnostic into a 90-day transformation. Strategy-first, tool-agnostic execution.</Text>
              <Link src="https://smokesignals.ai/contact" style={pdfStyles.ctaLink}>Book a Strategy Session →</Link>
            </View>

            {/* Footer */}
            <Text style={pdfStyles.footer}>© {new Date().getFullYear()} Smoke Signals AI • smokesignals.ai</Text>
          </Page>
        </Document>
      );

      try {
        const blob = await pdf(<GTMReportPDF />).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GTM-OS-${(domain || "report").replace(/[^a-z0-9]/gi, '-')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('PDF generation error:', error);
        // Fallback to text download
        const content = `GTM OPERATING SYSTEM DIAGNOSTIC
================================================================================
For: ${companyName || domain} - ${selectedProduct}
Generated by Smoke Signals AI
Date: ${new Date().toLocaleDateString()}

================================================================================
EXECUTIVE NARRATIVE
================================================================================
${safeClean(reportData?.narrative)}

================================================================================
ALPHA SIGNALS
================================================================================
${alphaSignals.map((s, i) => `${i + 1}. ${s.name}\n   Impact: ${s.impact}\n   Source: ${s.source}\n   Detection: ${s.detection}\n   Example: ${s.example}`).join('\n\n')}

================================================================================
PILLAR CONTENT CONCEPT
================================================================================
${pillarContent ? `${pillarContent.title}\n\n${pillarContent.concept}\n\nData Sources: ${pillarContent.dataSources}\nCadence: ${pillarContent.cadence}` : 'Not generated'}

================================================================================
PODCAST GUESTS
================================================================================
${podcastGuests.map((g, i) => `${i + 1}. ${g.name} - ${g.company}\n   ICP Match: ${g.icpMatch}\n   Topic: ${g.topic}\n   Value: ${g.whyInvite}`).join('\n\n')}
`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GTM-Diagnostic-${(domain || "report").replace(/[^a-z0-9]/gi, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    };

    // Extract signals from ICP data for the flow visualization
    const extractSignals = () => {
      const icpText = reportData.icp || "";
      const signals: string[] = [];
      const lines = icpText.split('\n');
      lines.forEach(line => {
        if (line.includes('|') && !line.toLowerCase().includes('signal name')) {
          const parts = line.split('|').map(p => p.trim());
          if (parts[0] && parts[0].length > 2 && parts[0].length < 50) {
            signals.push(parts[0]);
          }
        }
      });
      return signals.slice(0, 6);
    };

    const signals = extractSignals();
    const personas = parsePersonas(cleanResponse(reportData.icp).split("\n")).slice(0, Math.max(selectedICPs.length, 3));

    return (
      <div className="space-y-8">
        {/* Header with Company Badge */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#232120] to-[#070606] border border-[#3f3b3a] rounded-3xl p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6f20]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#5b2e5e]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <div className="relative text-center">
            <div className="inline-block px-4 py-1 bg-[#ff6f20]/20 border border-[#ff6f20]/30 rounded-full text-[#ff6f20] text-sm font-medium mb-4">
              GTM DIAGNOSTIC COMPLETE
            </div>
            <h2 className="font-bold text-3xl mb-2" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>{companyName || domain}</h2>
            <p className="text-[#ff8f50] font-medium text-lg">{selectedProduct}</p>
            <button onClick={downloadReport} className="mt-6 bg-white/10 border border-white/20 text-white py-3 px-6 rounded-xl text-sm font-medium hover:bg-white/15 transition-all inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download Report
            </button>
          </div>
        </div>

        {/* Signal-to-Action Flow Visualization */}
        <div className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#3f3b3a] rounded-3xl p-8">
          <div className="text-center mb-8">
            <h3 className="font-bold text-xl mb-2" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>Your Signal-Driven GTM System</h3>
            <p className="text-[#aaa7a6] text-sm">How your ICP, signals, and content connect to drive pipeline</p>
          </div>

          {/* Flow Diagram */}
          <div className="relative">
            {/* Connection Lines (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              <defs>
                <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#5b2e5e" />
                  <stop offset="50%" stopColor="#ff6f20" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>

            <div className="grid grid-cols-4 gap-4 relative" style={{ zIndex: 1 }}>
              {/* ICP Node */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#5b2e5e] to-[#5b2e5e]/60 flex items-center justify-center shadow-lg shadow-[#5b2e5e]/30">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <div className="font-semibold text-sm text-[#9a5d9d]">ICP</div>
                <div className="text-xs text-[#75716f] mt-1">{selectedICPs.length || personas.length} Personas</div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <div className="h-0.5 w-full bg-gradient-to-r from-[#5b2e5e] to-[#ff6f20] relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#ff6f20] rotate-45" />
                </div>
              </div>

              {/* Signals Node */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#ff6f20] to-[#e56318] flex items-center justify-center shadow-lg shadow-[#ff6f20]/30">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="font-semibold text-sm text-[#ff8f50]">SIGNALS</div>
                <div className="text-xs text-[#75716f] mt-1">{signals.length || selectedSignals.length} Active</div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <div className="h-0.5 w-full bg-gradient-to-r from-[#ff6f20] to-[#22c55e] relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#22c55e] rotate-45" />
                </div>
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-4 gap-4 mt-6 relative" style={{ zIndex: 1 }}>
              {/* Content Node */}
              <div className="text-center col-start-2">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#ffdd1f] to-[#f59e0b] flex items-center justify-center shadow-lg shadow-[#ffdd1f]/30">
                  <svg className="w-8 h-8 text-[#070606]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                </div>
                <div className="font-semibold text-sm text-[#ffdd1f]">CONTENT</div>
                <div className="text-xs text-[#75716f] mt-1">Grade: {grade}</div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <div className="h-0.5 w-full bg-gradient-to-r from-[#ffdd1f] to-[#22c55e] relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#22c55e] rotate-45" />
                </div>
              </div>

              {/* Outreach Node */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center shadow-lg shadow-[#22c55e]/30">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </div>
                <div className="font-semibold text-sm text-[#22c55e]">OUTREACH</div>
                <div className="text-xs text-[#75716f] mt-1">Signal-Driven</div>
              </div>
            </div>
          </div>
        </div>

        {/* The Bottom Line - Executive Summary */}
        <div className="bg-gradient-to-br from-[#ff6f20]/10 via-[#232120] to-[#5b2e5e]/10 border border-[#ff6f20]/20 rounded-3xl p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#ff6f20]/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#ff6f20]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            </div>
            <div>
              <h3 className="font-bold text-xl mb-3" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>The Bottom Line</h3>
              <div className="text-[#dededd] leading-relaxed space-y-3">
                {cleanResponse(reportData.narrative).split("\n\n").map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content Strategy - Scaffolded for Podcast, VOC, Signal-Based */}
        <div className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#3f3b3a] rounded-3xl p-8">
          <h3 className="font-bold text-xl mb-6" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>Content Engine</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Signal-Based Content */}
            <div className="bg-gradient-to-br from-[#ff6f20]/10 to-transparent border border-[#ff6f20]/20 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-lg bg-[#ff6f20]/20 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-[#ff6f20]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h4 className="font-semibold text-[#ff8f50] mb-2">Signal-Based Content</h4>
              <p className="text-sm text-[#aaa7a6] mb-3">Content triggered by aggregate signals across accounts — addressing pain at the moment it surfaces.</p>
              <div className="text-xs text-[#5a5654] italic">Coming soon: AI-generated content from signal patterns</div>
            </div>

            {/* VOC Content */}
            <div className="bg-gradient-to-br from-[#5b2e5e]/10 to-transparent border border-[#5b2e5e]/20 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-lg bg-[#5b2e5e]/20 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-[#9a5d9d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <h4 className="font-semibold text-[#9a5d9d] mb-2">Voice of Customer</h4>
              <p className="text-sm text-[#aaa7a6] mb-3">LinkedIn-sourced pain points and discussions that reveal what your buyers actually care about.</p>
              <div className="text-xs text-[#5a5654] italic">Coming soon: Pain-point research integration</div>
            </div>

            {/* Podcast */}
            <div className="bg-gradient-to-br from-[#ffdd1f]/10 to-transparent border border-[#ffdd1f]/20 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-lg bg-[#ffdd1f]/20 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-[#ffdd1f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </div>
              <h4 className="font-semibold text-[#ffdd1f] mb-2">Podcast Strategy</h4>
              <p className="text-sm text-[#aaa7a6] mb-3">VOC-driven podcast topics that become posts, all stemming from real buyer pain.</p>
              <div className="text-xs text-[#5a5654] italic">Coming soon: Topic recommendations</div>
            </div>
          </div>

          {/* Current Content Analysis */}
          <div className="border-t border-[#3f3b3a] pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`text-3xl font-bold ${gradeColors[grade]}`}>{grade}</div>
              <div>
                <div className="font-medium text-white">Current Content Grade</div>
                <div className="text-sm text-[#75716f]">Based on ICP alignment and presence</div>
              </div>
            </div>
            <p className="text-[#aaa7a6] text-sm leading-relaxed">
              {cleanResponse(reportData.content).split('\n').slice(0, 3).join(' ').substring(0, 200)}...
            </p>
          </div>
        </div>

        {/* Alpha Signals Section */}
        {alphaSignals.length > 0 && (
          <div className="bg-gradient-to-br from-[#ff6f20]/5 via-[#232120] to-[#070606] border border-[#ff6f20]/30 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#ff6f20]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#ff6f20]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-xl" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>Alpha Signals</h3>
                <p className="text-[#aaa7a6] text-sm">Buying indicators that predict intent before competitors notice</p>
              </div>
            </div>

            <div className="space-y-4">
              {alphaSignals.map((signal, i) => (
                <div key={i} className="bg-gradient-to-r from-[#ff6f20]/10 to-transparent border border-[#ff6f20]/20 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'rgba(255, 111, 32, 0.35)', color: '#ff6f20' }}>
                        {i + 1}
                      </div>
                      <h4 className="font-semibold text-white">{signal.name}</h4>
                    </div>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={
                        signal.impact.toLowerCase().includes('high')
                          ? { backgroundColor: 'rgba(34, 197, 94, 0.25)', color: '#22c55e' }
                          : signal.impact.toLowerCase().includes('medium')
                          ? { backgroundColor: 'rgba(255, 221, 31, 0.25)', color: '#ffdd1f' }
                          : { backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.6)' }
                      }
                    >
                      {signal.impact}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[#75716f]">Source:</span>
                      <span className="text-[#dededd] ml-2">{signal.source}</span>
                    </div>
                    <div>
                      <span className="text-[#75716f]">Detection:</span>
                      <span className="text-[#dededd] ml-2">{signal.detection}</span>
                    </div>
                  </div>
                  {signal.example && (
                    <div className="mt-3 pt-3 border-t border-[#3f3b3a]">
                      <span className="text-[#75716f] text-sm">Example: </span>
                      <span className="text-[#aaa7a6] text-sm italic">{signal.example}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pillar Content Section */}
        {pillarContent && (
          <div className="bg-gradient-to-br from-[#5b2e5e]/5 via-[#232120] to-[#070606] border border-[#5b2e5e]/30 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#5b2e5e]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#9a5d9d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-xl" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>Pillar Content Concept</h3>
                <p className="text-[#aaa7a6] text-sm">Data-driven content that positions you as a thought leader</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#5b2e5e]/10 to-transparent border border-[#5b2e5e]/20 rounded-2xl p-6">
              <h4 className="font-bold text-lg text-[#9a5d9d] mb-3">{pillarContent.title}</h4>
              <p className="text-[#dededd] mb-4">{pillarContent.concept}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-[#070606]/50 rounded-xl p-4">
                  <div className="text-[#75716f] mb-1 font-medium">Data Sources</div>
                  <div className="text-[#aaa7a6]">{pillarContent.dataSources}</div>
                </div>
                <div className="bg-[#070606]/50 rounded-xl p-4">
                  <div className="text-[#75716f] mb-1 font-medium">Cadence</div>
                  <div className="text-[#aaa7a6]">{pillarContent.cadence}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Podcast Guests Section */}
        {podcastGuests.length > 0 && (
          <div className="bg-gradient-to-br from-[#ffdd1f]/5 via-[#232120] to-[#070606] border border-[#ffdd1f]/30 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#ffdd1f]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#ffdd1f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-xl" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>Podcast Guest Suggestions</h3>
                <p className="text-[#aaa7a6] text-sm">ICP-matching guests who expand your reach to ideal buyers</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {podcastGuests.map((guest, i) => (
                <div key={i} className="bg-gradient-to-r from-[#ffdd1f]/10 to-transparent border border-[#ffdd1f]/20 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'rgba(255, 221, 31, 0.35)', color: '#ffdd1f' }}>
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{guest.name}</h4>
                      <p className="text-[#75716f] text-sm">{guest.company}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-[#9a5d9d] font-medium">ICP Match:</span>
                      <span className="text-[#aaa7a6] ml-2">{guest.icpMatch}</span>
                    </div>
                    <div>
                      <span className="text-[#ff8f50] font-medium">Topic:</span>
                      <span className="text-[#dededd] ml-2">{guest.topic}</span>
                    </div>
                    {guest.whyInvite && (
                      <div className="mt-2 pt-2 border-t border-[#3f3b3a]">
                        <span className="text-[#75716f] italic text-xs">{guest.whyInvite}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Program Elements - Value Prop */}
        <div className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#3f3b3a] rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="inline-block px-4 py-1 bg-[#ff6f20]/15 border border-[#ff6f20]/30 rounded-full text-[#ff6f20] text-sm font-medium mb-4">
              SIGNAL-DRIVEN GTM PROGRAM
            </div>
            <h3 className="font-bold text-2xl mb-2" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>The Complete System</h3>
            <p className="text-[#aaa7a6] max-w-xl mx-auto">Each element feeds the next — signals generate content, content builds trust, trust accelerates pipeline.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[#5b2e5e]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#9a5d9d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <h4 className="font-semibold text-white text-sm mb-1">VOC Program</h4>
              <p className="text-xs text-[#75716f]">25 ICP conversations with topic guides</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[#ff6f20]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#ff6f20]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </div>
              <h4 className="font-semibold text-white text-sm mb-1">Social Listening</h4>
              <p className="text-xs text-[#75716f]">50 ICP connections per month</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[#ffdd1f]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#ffdd1f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </div>
              <h4 className="font-semibold text-white text-sm mb-1">ICP Podcasts</h4>
              <p className="text-xs text-[#75716f]">4 strategic guest episodes</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[#22c55e]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#22c55e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h4 className="font-semibold text-white text-sm mb-1">Pillar Content</h4>
              <p className="text-xs text-[#75716f]">Signal-based reports</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[#ef4444]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#ef4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h4 className="font-semibold text-white text-sm mb-1">Signal Sequences</h4>
              <p className="text-xs text-[#75716f]">Trigger-based outreach</p>
            </div>

            <div className="bg-gradient-to-r from-[#ff6f20]/10 to-[#5b2e5e]/10 border border-[#ff6f20]/30 rounded-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-gradient-to-r from-[#ff6f20]/30 to-[#5b2e5e]/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <h4 className="font-semibold text-[#ff8f50] text-sm mb-1">HubSpot Enablement</h4>
              <p className="text-xs text-[#75716f]">Meeting prep, sales process, reporting</p>
            </div>
          </div>
        </div>

        {/* Personas & Signals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personas */}
          <div className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#3f3b3a] rounded-3xl p-6">
            <h3 className="font-bold text-lg mb-4" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>Target Personas</h3>
            <div className="space-y-3">
              {personas.map((p, i) => (
                <div key={i} className="bg-[#5b2e5e]/10 border border-[#5b2e5e]/20 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'rgba(91, 46, 94, 0.35)', color: '#9a5d9d' }}>
                      {i + 1}
                    </div>
                    <div className="font-semibold text-[#9a5d9d]">{p.title}</div>
                  </div>
                  {p.goal && <p className="text-sm text-[#aaa7a6] ml-11">{p.goal}</p>}
                  {p.jtbd && <p className="text-xs text-[#75716f] italic ml-11 mt-1">&quot;{p.jtbd}&quot;</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Competitive Snapshot - Collapsible */}
          {competitors.length > 0 && (
            <div className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#3f3b3a] rounded-3xl overflow-hidden">
              <button
                type="button"
                onClick={() => setCompetitiveExpanded(!competitiveExpanded)}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#3f3b3a]/50 flex items-center justify-center text-sm">🏆</div>
                  <div>
                    <h3 className="font-bold text-lg" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>Competitive Landscape</h3>
                    <p className="text-xs text-[#75716f]">{competitors.length} competitors analyzed</p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-[#75716f] transition-transform ${competitiveExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {competitiveExpanded && (
                <div className="px-6 pb-6 space-y-3">
                  {competitors.map((c, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="font-semibold text-white mb-2">{c.name}</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="text-[#22c55e]">+</span> <span className="text-[#aaa7a6]">{c.strength || "—"}</span></div>
                        <div><span className="text-[#ef4444]">−</span> <span className="text-[#aaa7a6]">{c.weakness || "—"}</span></div>
                        <div><span className="text-[#ff6f20]">→</span> <span className="text-[#aaa7a6]">{c.youWin || "—"}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#ff6f20] to-[#e56318] rounded-3xl p-10 text-center">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <h3 className="font-bold text-2xl mb-3" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>Ready to Build Your Signal-Driven GTM?</h3>
            <p className="text-white/80 mb-6 max-w-lg mx-auto">Turn this diagnostic into a 90-day transformation. Strategy-first, tool-agnostic execution.</p>
            <a href="https://smokesignals.ai/contact" target="_blank" rel="noopener noreferrer" className="inline-block bg-white text-[#e56318] font-bold py-4 px-10 rounded-xl hover:bg-white/90 transition-all shadow-lg shadow-black/20">
              Book a Strategy Session
            </a>
          </div>
        </div>
      </div>
    );
  };

  const step = steps[currentStep];

  // Show loading state while hydrating from localStorage
  if (!isHydrated) {
    return (
      <div className="min-h-screen p-6 text-white flex items-center justify-center" style={{ backgroundImage: "linear-gradient(rgba(7,6,6,0.15), rgba(7,6,6,0.15)), url('/hero-banner.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
        <div className="w-10 h-10 border-4 border-white/10 border-t-[#ff6f20] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 text-[#f9f9f9]" style={{ fontFamily: "var(--font-body), 'Open Sans', sans-serif", backgroundImage: "linear-gradient(rgba(7,6,6,0.15), rgba(7,6,6,0.15)), url('/hero-banner.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
      {/* Error Toast */}
      {errorToast && (
        <div className="fixed top-4 right-4 z-50 bg-[#ff1f40]/90 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2">
          <span className="text-lg">⚠️</span>
          <span>{errorToast}</span>
          <button onClick={() => setErrorToast(null)} className="ml-2 hover:text-white/80">✕</button>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <img src="https://smokesignals.ai/hs-fs/hubfs/Smoke_Signals/img/smokesignal-logo.png" alt="Smoke Signals AI" className="h-12 mx-auto mb-4" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>GTM Operating System Diagnostic</h1>
          <p className="text-[#aaa7a6] mt-2">Signal-driven analysis of your go-to-market engine</p>
          {currentStep > 0 && (
            <button
              onClick={clearSession}
              className="mt-3 text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              ← Start Over
            </button>
          )}
        </div>
        {renderStepIndicator()}
        {step === "intro" && renderIntro()}
        {step === "contact-info" && renderContactInfo()}
        {step === "select-product" && renderSelectProduct()}
        {step === "icp-selection" && renderICPSelection()}
        {step === "research-company" && renderResearch("company", "Company Analysis")}
        {step === "research-content" && renderResearch("content", "Content Strategy")}
        {step === "signals-alignment" && renderSignalsAlignment()}
        {step === "generating" && renderGenerating()}
        {step === "results" && renderResults()}
      </div>
    </div>
  );
}

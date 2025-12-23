"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { pdf, Document, Page, Text, View, Image, Link } from '@react-pdf/renderer';

// Extracted modules
import { STORAGE_KEY, loadingStages, gtmInsights, signalVendors, signalTypes, steps, programElements } from './constants';
import { stripMarkdown, cleanResponse, cleanCompetitiveResponse } from './lib/formatters';
import {
  parseCompanyAnalysis as parseCompanyAnalysisFn,
  parseIcpResearch as parseIcpResearchFn,
  parseCompetitiveAnalysis as parseCompetitiveAnalysisFn,
  parseContentStrategy as parseContentStrategyFn,
  parseIntoSections,
  parsePersonas,
} from './lib/parsers';
import { pdfStyles } from './styles/pdfStyles';
import { VendorIcon } from './components/VendorIcon';
import {
  getCompanyPrompt,
  getICPPrompt,
  getCompetitivePrompt,
  getContentPrompt,
  getAlphaSignalsPrompt,
  getPillarContentPrompt,
  getPodcastGuestsPrompt,
  getRefinementPrompt,
} from './lib/prompts';
import {
  callClaude,
  callClaudeJSON,
  fetchLinkedInData,
  syncHubSpotContact,
} from './lib/api';
import type {
  IdealCompanyProfile,
  BuyingCommitteeMember,
  CompanyAnalysis,
  IcpResearchData,
  SignalSystemEntry,
  CompetitiveData,
  ContentStrategyData,
  DiscoveredICP,
  BackgroundData,
  AlphaSignal,
  PillarContent,
  PodcastGuest,
  ReportData,
  ResearchState,
  Alignment,
  ICPDiscoveryResponse,
  ProductExtractionResponse,
  AlphaSignalsResponse,
  PillarContentResponse,
  PodcastGuestsResponse,
  IcpResearchResponse,
  CompetitiveAnalysisResponse,
  ContentStrategyResponse,
} from './types';

export default function Home() {
  // Core wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [role, setRole] = useState("");

  // === STRUCTURED DATA (Schema-aligned) ===

  // Prompt 1 outputs
  const [primaryOffering, setPrimaryOffering] = useState("");

  // Prompt 2 outputs
  const [idealCompanyProfile, setIdealCompanyProfile] = useState<IdealCompanyProfile>({
    companyStage: "", companySize: "", industryVerticals: [], keyCharacteristics: [], rawText: ""
  });
  const [buyingCommittee, setBuyingCommittee] = useState<BuyingCommitteeMember[]>([]);
  const [primaryBuyerRole, setPrimaryBuyerRole] = useState("");
  const [painTriggers, setPainTriggers] = useState<string[]>([]);

  // Prompt 3 outputs
  const [companyAnalysis, setCompanyAnalysis] = useState<CompanyAnalysis>({
    positioningSummary: "", painAddressed: "", positioningObservation: ""
  });

  // Prompt 4 outputs
  const [icpResearchData, setIcpResearchData] = useState<IcpResearchData>({
    jtbdList: [], signalSystem: [], signalBlindSpot: ""
  });

  // Derived from Prompt 4
  const [signalSystemSummary, setSignalSystemSummary] = useState<string[]>([]);
  const [topSignals, setTopSignals] = useState<SignalSystemEntry[]>([]);

  // Prompt 5 outputs
  const [competitiveData, setCompetitiveData] = useState<CompetitiveData>({
    competitiveLandscape: "", competitorComparison: [], competitiveGaps: "", defensibilityAssessment: ""
  });

  // Prompt 6 outputs
  const [contentStrategyData, setContentStrategyData] = useState<ContentStrategyData>({
    contentFootprint: "", buyerAlignmentAudit: "", signalOpportunityAssessment: "",
    contentGrade: "", contentGradeRationale: "", priorityRecommendations: []
  });
  const [companySize, setCompanySize] = useState("");
  const [crm, setCrm] = useState("");
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [alignment, setAlignment] = useState<Alignment>({});

  // Research phases
  const [research, setResearch] = useState<ResearchState>({
    company: { initial: "", feedback: "", refined: "", loading: false },
    icp: { initial: "", feedback: "", refined: "", loading: false },
    competitive: { initial: "", feedback: "", refined: "", loading: false },
    content: { initial: "", feedback: "", refined: "", loading: false }
  });

  // Products and ICP selection
  const [products, setProducts] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [discoveredICPs, setDiscoveredICPs] = useState<DiscoveredICP[]>([]);
  const [selectedICPs, setSelectedICPs] = useState<string[]>([]);

  // Background data from parallel fetching
  const [backgroundData, setBackgroundData] = useState<BackgroundData>({
    websiteContent: null, companyPosts: null, ceoPosts: null, anysiteQuery: null,
  });

  // New outputs: alpha signals, pillar content, podcast guests
  const [alphaSignals, setAlphaSignals] = useState<AlphaSignal[]>([]);
  const [pillarContent, setPillarContent] = useState<PillarContent[]>([]);
  const [podcastGuests, setPodcastGuests] = useState<PodcastGuest[]>([]);

  // Report and HubSpot
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [contactId, setContactId] = useState<string | null>(null);

  // UI state
  const [isHydrated, setIsHydrated] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [competitiveExpanded, setCompetitiveExpanded] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [currentInsight, setCurrentInsight] = useState(0);

  // Scroll-triggered section expansion state
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set(['targeting'])); // Start with first section expanded
  const [userHasManuallyToggled, setUserHasManuallyToggled] = useState(false); // Track if user has closed a section
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Register a section ref for IntersectionObserver
  const registerSectionRef = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) {
      sectionRefs.current.set(id, element);
    } else {
      sectionRefs.current.delete(id);
    }
  }, []);

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
        if (data.companyType) setCompanyType(data.companyType);
        if (data.role) setRole(data.role);
        // Structured data (schema-aligned)
        if (data.primaryOffering) setPrimaryOffering(data.primaryOffering);
        if (data.idealCompanyProfile) setIdealCompanyProfile(data.idealCompanyProfile);
        if (data.buyingCommittee) setBuyingCommittee(data.buyingCommittee);
        if (data.primaryBuyerRole) setPrimaryBuyerRole(data.primaryBuyerRole);
        if (data.painTriggers) setPainTriggers(data.painTriggers);
        if (data.companyAnalysis) setCompanyAnalysis(data.companyAnalysis);
        if (data.icpResearchData) setIcpResearchData(data.icpResearchData);
        if (data.signalSystemSummary) setSignalSystemSummary(data.signalSystemSummary);
        if (data.topSignals) setTopSignals(data.topSignals);
        if (data.competitiveData) setCompetitiveData(data.competitiveData);
        if (data.contentStrategyData) setContentStrategyData(data.contentStrategyData);
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
        companyType,
        role,
        // Structured data (schema-aligned)
        primaryOffering,
        idealCompanyProfile,
        buyingCommittee,
        primaryBuyerRole,
        painTriggers,
        companyAnalysis,
        icpResearchData,
        signalSystemSummary,
        topSignals,
        competitiveData,
        contentStrategyData,
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
  }, [isHydrated, currentStep, websiteUrl, domain, email, firstName, lastName, companyName, companyType, role, companySize, crm, selectedVendors, selectedSignals, alignment, research, reportData, contactId, products, selectedProduct, discoveredICPs, selectedICPs, backgroundData, alphaSignals, pillarContent, podcastGuests, primaryOffering, idealCompanyProfile, buyingCommittee, primaryBuyerRole, painTriggers, companyAnalysis, icpResearchData, signalSystemSummary, topSignals, competitiveData, contentStrategyData]);

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

  // IntersectionObserver for scroll-triggered section expansion (only if user hasn't manually toggled)
  useEffect(() => {
    if (currentStep !== steps.indexOf("results")) return;
    if (userHasManuallyToggled) return; // Stop auto-expanding once user manually closes a section

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('data-section-id');
            if (sectionId) {
              setVisibleSections(prev => new Set([...prev, sectionId]));
            }
          }
        });
      },
      { threshold: 0.5, rootMargin: '0px' } // 50% visible before auto-expanding
    );

    // Observe all registered sections
    sectionRefs.current.forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [currentStep, userHasManuallyToggled]);

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStep(0);
    setWebsiteUrl("");
    setDomain("");
    setEmail("");
    setCompanyName("");
    setCompanyType("");
    setRole("");
    // Reset structured data (schema-aligned)
    setPrimaryOffering("");
    setIdealCompanyProfile({ companyStage: "", companySize: "", industryVerticals: [], keyCharacteristics: [], rawText: "" });
    setBuyingCommittee([]);
    setPrimaryBuyerRole("");
    setPainTriggers([]);
    setCompanyAnalysis({ positioningSummary: "", painAddressed: "", positioningObservation: "" });
    setIcpResearchData({ jtbdList: [], signalSystem: [], signalBlindSpot: "" });
    setSignalSystemSummary([]);
    setTopSignals([]);
    setCompetitiveData({ competitiveLandscape: "", competitorComparison: [], competitiveGaps: "", defensibilityAssessment: "" });
    setContentStrategyData({ contentFootprint: "", buyerAlignmentAudit: "", signalOpportunityAssessment: "", contentGrade: "", contentGradeRationale: "", priorityRecommendations: [] });
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
    setIsGeneratingReport(false);
    setContactId(null);
    setProducts([]);
    setSelectedProduct("");
    setDiscoveredICPs([]);
    setSelectedICPs([]);
    setBackgroundData({ websiteContent: null, companyPosts: null, ceoPosts: null, anysiteQuery: null });
    setAlphaSignals([]);
    setPillarContent([]);
    setPodcastGuests([]);
    setLoadingStage(0);
    setCurrentInsight(0);
    setVisibleSections(new Set(['targeting'])); // Reset to first section expanded
    setUserHasManuallyToggled(false); // Reset manual toggle state
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

  const showError = useCallback((message: string) => {
    setErrorToast(message);
    setTimeout(() => setErrorToast(null), 5000);
  }, []);

  // Sync data to HubSpot contact record (wrapper using extracted API function)
  const syncToHubSpot = useCallback(async (properties: Record<string, string>, stepName?: string) => {
    const newContactId = await syncHubSpotContact(email, properties, stepName);
    if (newContactId && !contactId) {
      setContactId(newContactId);
    }
  }, [email, contactId]);

  // Parser wrappers - call pure functions and set state
  const handleParseCompanyAnalysis = (text: string) => {
    setCompanyAnalysis(parseCompanyAnalysisFn(text));
  };

  // JSON handlers for structured research phases
  const handleIcpResearchJSON = (data: IcpResearchResponse) => {
    const icpData: IcpResearchData = {
      jtbdList: data.jobsToBeDone.map(j => ({ persona: j.persona, jtbd: j.jtbd })),
      signalSystem: data.signalSystem.map(s => ({
        category: s.category,
        signalName: s.signalName,
        whatToDetect: s.whatToDetect,
        recommendedMotion: s.recommendedMotion
      })),
      signalBlindSpot: data.signalBlindSpot || ""
    };
    console.log("[Data Flow] ICP research JSON parsed:", { jtbdCount: icpData.jtbdList.length, signalCount: icpData.signalSystem.length });
    setIcpResearchData(icpData);
    setSignalSystemSummary(icpData.signalSystem.map(s => s.signalName));
    setTopSignals(icpData.signalSystem.slice(0, 4));
  };

  const handleCompetitiveAnalysisJSON = (data: CompetitiveAnalysisResponse) => {
    setCompetitiveData({
      competitiveLandscape: data.competitiveLandscape || "",
      competitorComparison: data.competitors.map(c => ({
        competitor: c.name,
        primaryStrength: c.primaryStrength,
        primaryWeakness: c.primaryWeakness,
        battleground: c.battleground
      })),
      competitiveGaps: data.competitiveGaps || "",
      defensibilityAssessment: data.defensibilityAssessment || ""
    });
  };

  const handleContentStrategyJSON = (data: ContentStrategyResponse) => {
    setContentStrategyData({
      contentFootprint: data.contentFootprint || "",
      buyerAlignmentAudit: data.buyerAlignmentAudit || "",
      signalOpportunityAssessment: data.signalOpportunityAssessment || "",
      contentGrade: data.contentGrade || "",
      contentGradeRationale: data.contentGradeRationale || "",
      priorityRecommendations: data.priorityRecommendations.map((r, i) => ({
        rank: r.rank || i + 1,
        impact: r.impact || "MEDIUM IMPACT",
        title: r.title || "",
        explanation: r.explanation || ""
      }))
    });
  };

  // Helper to build prompt with parameters for each phase
  const buildPromptForPhase = (phase: string): string => {
    switch (phase) {
      case "company":
        return getCompanyPrompt({
          domain,
          companyType,
          selectedProduct,
          idealCompanyProfile,
          primaryBuyerRole
        });
      case "icp":
        return getICPPrompt({
          domain,
          companyType,
          selectedProduct,
          idealCompanyProfile,
          buyingCommittee,
          discoveredICPs
        });
      case "competitive":
        return getCompetitivePrompt({
          domain,
          selectedProduct,
          companyType,
          companyAnalysis,
          idealCompanyProfile
        });
      case "content":
        return getContentPrompt({
          domain,
          selectedProduct,
          idealCompanyProfile,
          buyingCommittee,
          discoveredICPs,
          icpResearchData
        });
      default:
        return "";
    }
  };

  const runResearchPhase = async (phase: string) => {
    console.log(`[Data Flow] Starting ${phase} research phase`);
    setResearch(prev => ({ ...prev, [phase]: { ...prev[phase as keyof typeof prev], loading: true } }));

    const hubspotFieldMap: Record<string, string> = {
      company: "gtmos_company_research",
      icp: "gtmos_icp_profile",
      competitive: "gtmos_competitive_analysis",
      content: "gtmos_content_strategy"
    };

    try {
      // Company uses text output, others use JSON
      if (phase === "company") {
        const result = await callClaude(buildPromptForPhase(phase));
        console.log(`[Data Flow] ${phase} research completed`);
        setResearch(prev => ({ ...prev, [phase]: { ...prev[phase as keyof typeof prev], initial: result, loading: false } }));
        handleParseCompanyAnalysis(result);
        if (hubspotFieldMap[phase]) {
          syncToHubSpot({ [hubspotFieldMap[phase]]: result.substring(0, 65000) }, `research-${phase}`);
        }
      } else if (phase === "icp") {
        const data = await callClaudeJSON<IcpResearchResponse>(
          buildPromptForPhase(phase) + `

OUTPUT AS JSON with this schema:
{
  "jobsToBeDone": [{"persona": "Title", "jtbd": "When [situation], I want to [action], so I can [outcome]"}],
  "signalSystem": [{"category": "Category", "signalName": "Name", "whatToDetect": "Detection criteria", "recommendedMotion": "Action"}],
  "signalBlindSpot": "Description of missed signal opportunity"
}`,
          { model: 'sonnet', useWebSearch: true, fallback: { jobsToBeDone: [], signalSystem: [], signalBlindSpot: "" } }
        );
        console.log(`[Data Flow] ICP research JSON completed`);
        // Format JSON for display
        const displayText = formatIcpResearchForDisplay(data);
        setResearch(prev => ({ ...prev, [phase]: { ...prev[phase as keyof typeof prev], initial: displayText, loading: false } }));
        handleIcpResearchJSON(data);
        if (hubspotFieldMap[phase]) {
          syncToHubSpot({ [hubspotFieldMap[phase]]: displayText.substring(0, 65000) }, `research-${phase}`);
        }
      } else if (phase === "competitive") {
        const data = await callClaudeJSON<CompetitiveAnalysisResponse>(
          buildPromptForPhase(phase) + `

OUTPUT AS JSON with this schema:
{
  "competitiveLandscape": "2-3 sentences about the competitive environment",
  "competitors": [{"name": "Competitor", "primaryStrength": "Their advantage", "primaryWeakness": "Their weakness", "battleground": "Where you compete"}],
  "competitiveGaps": "Market gaps and opportunities",
  "defensibilityAssessment": "Assessment of competitive moat"
}`,
          { model: 'sonnet', useWebSearch: true, fallback: { competitiveLandscape: "", competitors: [], competitiveGaps: "", defensibilityAssessment: "" } }
        );
        console.log(`[Data Flow] Competitive research JSON completed`);
        const displayText = formatCompetitiveForDisplay(data);
        setResearch(prev => ({ ...prev, [phase]: { ...prev[phase as keyof typeof prev], initial: displayText, loading: false } }));
        handleCompetitiveAnalysisJSON(data);
        if (hubspotFieldMap[phase]) {
          syncToHubSpot({ [hubspotFieldMap[phase]]: displayText.substring(0, 65000) }, `research-${phase}`);
        }
      } else if (phase === "content") {
        const data = await callClaudeJSON<ContentStrategyResponse>(
          buildPromptForPhase(phase) + `

OUTPUT AS JSON with this schema:
{
  "contentFootprint": "What content assets exist",
  "buyerAlignmentAudit": "Assessment of content vs buyer personas",
  "signalOpportunityAssessment": "Content as signal generation mechanism",
  "contentGrade": "A/B/C/D/F",
  "contentGradeRationale": "2-3 sentences explaining the grade",
  "priorityRecommendations": [{"rank": 1, "impact": "HIGHEST IMPACT", "title": "Rec title", "explanation": "Why this matters"}]
}`,
          { model: 'sonnet', useWebSearch: true, fallback: { contentFootprint: "", buyerAlignmentAudit: "", signalOpportunityAssessment: "", contentGrade: "", contentGradeRationale: "", priorityRecommendations: [] } }
        );
        console.log(`[Data Flow] Content research JSON completed`);
        const displayText = formatContentStrategyForDisplay(data);
        setResearch(prev => ({ ...prev, [phase]: { ...prev[phase as keyof typeof prev], initial: displayText, loading: false } }));
        handleContentStrategyJSON(data);
        if (hubspotFieldMap[phase]) {
          syncToHubSpot({ [hubspotFieldMap[phase]]: displayText.substring(0, 65000) }, `research-${phase}`);
        }
      }
    } catch (err) {
      console.error(`[Data Flow] ${phase} research failed`, err);
      setResearch(prev => ({ ...prev, [phase]: { ...prev[phase as keyof typeof prev], initial: "Error loading data.", loading: false } }));
    }
  };

  // Format JSON responses for display in UI
  const formatIcpResearchForDisplay = (data: IcpResearchResponse): string => {
    let text = "JOBS TO BE DONE\n\n";
    data.jobsToBeDone.forEach(j => {
      text += `PERSONA: ${j.persona}\nJTBD: ${j.jtbd}\n\n`;
    });
    text += "SIGNAL SYSTEM\n\n";
    let currentCategory = "";
    data.signalSystem.forEach(s => {
      if (s.category !== currentCategory) {
        currentCategory = s.category;
        text += `${s.category.toUpperCase()} SIGNALS\n`;
      }
      text += `${s.signalName} | ${s.whatToDetect} | ${s.recommendedMotion}\n`;
    });
    if (data.signalBlindSpot) {
      text += `\nSIGNAL BLIND SPOT\n${data.signalBlindSpot}`;
    }
    return text;
  };

  const formatCompetitiveForDisplay = (data: CompetitiveAnalysisResponse): string => {
    let text = `COMPETITIVE LANDSCAPE\n${data.competitiveLandscape}\n\n`;
    text += "COMPETITOR COMPARISON\nCompetitor | Primary Strength | Primary Weakness | Battleground\n";
    data.competitors.forEach(c => {
      text += `${c.name} | ${c.primaryStrength} | ${c.primaryWeakness} | ${c.battleground}\n`;
    });
    text += `\nCOMPETITIVE GAPS\n${data.competitiveGaps}\n\n`;
    text += `DEFENSIBILITY ASSESSMENT\n${data.defensibilityAssessment}`;
    return text;
  };

  const formatContentStrategyForDisplay = (data: ContentStrategyResponse): string => {
    let text = `CONTENT FOOTPRINT\n${data.contentFootprint}\n\n`;
    text += `BUYER ALIGNMENT AUDIT\n${data.buyerAlignmentAudit}\n\n`;
    text += `SIGNAL OPPORTUNITY ASSESSMENT\n${data.signalOpportunityAssessment}\n\n`;
    text += `CONTENT GRADE\nGrade: ${data.contentGrade}\nRationale: ${data.contentGradeRationale}\n\n`;
    text += "PRIORITY RECOMMENDATIONS\n";
    data.priorityRecommendations.forEach(r => {
      text += `${r.rank}. [${r.impact}] ${r.title}\n   ${r.explanation}\n\n`;
    });
    return text;
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
              (() => {
                // Join content into proper paragraphs for clean prose rendering
                const joinedContent = sec.content.join(" ");

                // Check for "NOTABLY MISSING:" pattern - render as formatted callout
                if (joinedContent.includes("NOTABLY MISSING:") || joinedContent.includes("NOTABLY MISSING -")) {
                  const parts = joinedContent.split(/NOTABLY MISSING[:\-]\s*/i);
                  const mainText = parts[0]?.trim();
                  const missingItems = parts[1]?.split(/,\s*(?:and\s+)?|,\s*(?=no\s)/i).map(s => s.trim()).filter(Boolean);
                  return (
                    <>
                      {mainText && <p className="mb-4 leading-relaxed">{mainText}</p>}
                      {missingItems && missingItems.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-3">
                          <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Notably Missing</div>
                          <ul className="space-y-1">
                            {missingItems.map((item, idx) => (
                              <li key={idx} className="text-white/80 text-sm flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">×</span>
                                <span>{item.replace(/^no\s+/i, "No ")}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  );
                }

                // Check for numbered impact recommendations (1. [HIGHEST IMPACT], 2. [HIGH IMPACT], etc.)
                const hasNumberedRecs = joinedContent.match(/\d+\.\s*\[(?:HIGHEST|HIGH|MEDIUM|LOW)\s*IMPACT\]/i);
                if (hasNumberedRecs) {
                  const items = joinedContent.split(/(?=\d+\.\s*\[)/).filter(Boolean);
                  const impactColors: Record<string, { border: string; badge: string; bg: string }> = {
                    HIGHEST: { border: "border-red-500", badge: "bg-red-500/20 text-red-400", bg: "bg-red-500/5" },
                    HIGH: { border: "border-orange-500", badge: "bg-orange-500/20 text-orange-400", bg: "bg-orange-500/5" },
                    MEDIUM: { border: "border-yellow-500", badge: "bg-yellow-500/20 text-yellow-400", bg: "bg-yellow-500/5" },
                    LOW: { border: "border-blue-500", badge: "bg-blue-500/20 text-blue-400", bg: "bg-blue-500/5" }
                  };
                  return (
                    <div className="space-y-4">
                      {items.map((item, idx) => {
                        const impactMatch = item.match(/\[(HIGHEST|HIGH|MEDIUM|LOW)\s*IMPACT\]/i);
                        const impact = impactMatch?.[1]?.toUpperCase() || "MEDIUM";
                        const colors = impactColors[impact] || impactColors.MEDIUM;
                        // Extract title (text before first sentence end) and body
                        const contentWithoutPrefix = item.replace(/^\d+\.\s*\[[^\]]+\]\s*/, "").trim();
                        const titleMatch = contentWithoutPrefix.match(/^([^.!?]+[.!?]?)/);
                        const title = titleMatch?.[1]?.trim() || "";
                        const body = contentWithoutPrefix.slice(title.length).trim();
                        return (
                          <div key={idx} className={`${colors.bg} rounded-lg p-4 border-l-4 ${colors.border}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg font-bold text-white/40">{idx + 1}</span>
                              <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded ${colors.badge}`}>{impact} IMPACT</span>
                            </div>
                            {title && <p className="font-semibold text-white mb-2">{title}</p>}
                            {body && <p className="text-white/70 text-sm leading-relaxed">{body}</p>}
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                // Split by double newlines or sentence boundaries for natural paragraph breaks
                const paragraphs = joinedContent
                  .split(/\.\s+(?=[A-Z])/)
                  .map(p => p.trim())
                  .filter(p => p.length > 0)
                  .reduce((acc: string[], sentence) => {
                    // Group sentences into paragraphs (roughly 2-3 sentences each)
                    if (acc.length === 0) {
                      acc.push(sentence + (sentence.endsWith(".") ? "" : "."));
                    } else {
                      const lastPara = acc[acc.length - 1];
                      const sentenceCount = (lastPara.match(/\./g) || []).length;
                      if (sentenceCount < 3 && lastPara.length < 400) {
                        acc[acc.length - 1] = lastPara + " " + sentence + (sentence.endsWith(".") ? "" : ".");
                      } else {
                        acc.push(sentence + (sentence.endsWith(".") ? "" : "."));
                      }
                    }
                    return acc;
                  }, []);

                return paragraphs.map((para, j) => (
                  <p key={j} className="mb-4 last:mb-0 leading-relaxed">{para}</p>
                ));
              })()
            )}
          </div>
        </div>
      );
    });
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

    // Sync basic info to HubSpot (creates or updates contact)
    syncToHubSpot({
      email,
      firstname: companyName ? "" : "",  // HubSpot default fields
      company: companyName,
      gtmos_website_url: websiteUrl,
      gtmos_role: role,
      gtmos_company_size: companySize,
      gtmos_crm: crm
    }, "basic-info");

    setProductsLoading(true);
    setLoadingStage(0);
    nextStep(); // Goes to select-product (loading state)

    // Fire ALL data fetching in parallel for speed
    const [productsResult, websiteResult, linkedInResult] = await Promise.allSettled([
      // 1. Fetch products/offerings via Claude (Haiku for fast extraction)
      callClaudeJSON<ProductExtractionResponse>(
        `You are a B2B market research analyst conducting the first stage of a go-to-market diagnostic.

Given a company domain, identify what they sell and how to categorize their business.

DOMAIN: ${domain}

RESEARCH APPROACH:
1. Primary source: The company's official website — prioritize /products, /solutions, /services, /pricing, and /platform pages
2. Secondary sources: G2, Capterra, Crunchbase, or LinkedIn company page for validation
3. Focus on commercial offerings (what they sell to customers), NOT internal tools, tech stack, or integrations they consume

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
- Maximum 6 additional offerings`,
        {
          model: 'haiku',
          useWebSearch: true,
          schema: `{
  "companyType": "One of: Product-Led SaaS, Sales-Led SaaS, Platform / Marketplace, Professional Services, Agency, Hybrid, Other",
  "primaryOffering": "The core product or service name",
  "additionalOfferings": ["other product 1", "other product 2"]
}`,
          fallback: {
            companyType: "",
            primaryOffering: domain,
            additionalOfferings: []
          }
        }
      ),

      // 2. Fetch website content via Firecrawl
      fetchWebsiteContent(domain),

      // 3. Generate Anysite query for LinkedIn (always works, even without MCP)
      fetchLinkedInData("generateQuery", { domain })
    ]);

    // Process products result - JSON response maps directly to state
    if (productsResult.status === 'fulfilled') {
      const result = productsResult.value;

      // Set company type from JSON
      setCompanyType(result.companyType || "");

      // Set primary offering
      setPrimaryOffering(result.primaryOffering || domain);

      // Build products array: primary + additional offerings
      const allProducts = [
        result.primaryOffering,
        ...(result.additionalOfferings || [])
      ].filter(p => p && p.length > 2 && p.length < 100);

      setProducts(allProducts.length > 0 ? allProducts.slice(0, 8) : [domain]);
    } else {
      setProducts([domain]);
      setCompanyType("");
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

    // JSON schema for validation
    const schema = `{
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
}`;

    const fallbackResponse: ICPDiscoveryResponse = {
      idealCompanyProfile: {
        description: "B2B companies seeking to improve their go-to-market effectiveness",
        companyStage: "Growth",
        companySize: "50-500 employees",
        industryVerticals: ["Technology", "SaaS"],
        keyCharacteristics: ["Revenue-focused", "Data-driven"]
      },
      buyingCommittee: [
        { role: "Economic Buyer", type: "Economic Buyer", painTrigger: "Budget allocation decisions", evaluationPriority: "ROI and cost efficiency" },
        { role: "Champion", type: "Champion", painTrigger: "Internal process inefficiencies", evaluationPriority: "Ease of implementation" },
        { role: "Evaluator", type: "Evaluator", painTrigger: "Technical requirements", evaluationPriority: "Feature completeness" }
      ]
    };

    const result = await callClaudeJSON<ICPDiscoveryResponse>(
      `You are identifying the BUYER PERSONAS for a B2B product. Your job is to identify the specific JOB TITLES of people who buy this product.

PRODUCT: ${selectedProduct}
COMPANY: ${domain}
COMPANY TYPE: ${companyType || "B2B Company"}

IMPORTANT: Return ACTUAL JOB TITLES (like "VP of Sales", "IT Director", "RevOps Manager"), NOT market segments or company descriptions.

RESEARCH:
- Look at G2/Capterra reviewer titles
- Check case studies for buyer titles mentioned
- Search LinkedIn for people who use/implement this product

Return 3-5 buying committee members. Each "role" must be a real job title (2-5 words like "Sales Operations Manager" or "CISO"), not a description.`,
      {
        model: 'sonnet',
        useWebSearch: true,
        schema,
        fallback: fallbackResponse
      }
    );

    // Map JSON response directly to state - no text parsing needed
    const profile = result.idealCompanyProfile;
    setIdealCompanyProfile({
      companyStage: profile.companyStage || "",
      companySize: profile.companySize || "",
      industryVerticals: profile.industryVerticals || [],
      keyCharacteristics: profile.keyCharacteristics || [],
      rawText: profile.description || ""
    });

    // Map buying committee to ICPs and structured data
    const parsedICPs = result.buyingCommittee.map((member, i) => ({
      id: `icp-${i}`,
      title: member.role,
      description: `${member.type}${member.painTrigger ? ` - ${member.painTrigger}` : ""}`
    }));

    const parsedCommittee = result.buyingCommittee.map(member => ({
      role: member.role,
      type: member.type,
      painTrigger: member.painTrigger,
      evaluationPriority: member.evaluationPriority
    }));

    const extractedPainTriggers = result.buyingCommittee
      .map(member => member.painTrigger)
      .filter(Boolean);

    setDiscoveredICPs(parsedICPs.slice(0, 6));
    setPrimaryBuyerRole(parsedICPs[0]?.title || "Economic Buyer");
    setBuyingCommittee(parsedCommittee);
    setPainTriggers(extractedPainTriggers);
  }, [selectedProduct, domain, companyType]);

  useEffect(() => {
    const step = steps[currentStep];
    // Note: "content" removed from auto-trigger - it's now chained to ICP data completion
    // Note: competitive analysis runs in background during "generating" step, not as a separate visible step
    const phases: {[key: string]: string} = { "research-company": "company" };
    const currentPhase = phases[step];

    if (currentPhase) {
      const phaseData = research[currentPhase as keyof typeof research];
      if (!phaseData.initial && !phaseData.loading) runResearchPhase(currentPhase);
    }

    // Discover ICPs when entering ICP selection step
    if (step === "icp-selection" && discoveredICPs.length === 0 && selectedProduct) {
      discoverICPs();
    }

    // Trigger ICP research in background when entering company research step
    if (step === "research-company" && domain && selectedICPs.length > 0) {
      const icpData = research.icp;
      if (!icpData.initial && !icpData.loading) runResearchPhase("icp");
    }

    if (step === "generating" && !reportData && !isGeneratingReport) {
      // Run competitive analysis in background (not a visible step)
      const competitiveData = research.competitive;
      if (!competitiveData.initial && !competitiveData.loading) {
        runResearchPhase("competitive");
      }
      generateReport();
    }
  }, [currentStep, domain, selectedProduct, discoveredICPs.length, selectedICPs.length, discoverICPs]);

  // Chain content research to ICP data - only trigger when ICP data is populated
  useEffect(() => {
    const step = steps[currentStep];
    if (step === "research-content"
        && icpResearchData.jtbdList.length > 0
        && !research.content.initial
        && !research.content.loading) {
      console.log("[Data Flow] ICP data ready, triggering content research with JTBD:", icpResearchData.jtbdList.length, "items");
      runResearchPhase("content");
    }
  }, [currentStep, icpResearchData.jtbdList.length, research.content.initial, research.content.loading]);

  async function generateReport() {
    setIsGeneratingReport(true);
    const getR = (k: string) => cleanResponse(research[k as keyof typeof research].refined || research[k as keyof typeof research].initial || "");
    const getCompetitive = () => research.competitive.refined || research.competitive.initial || "";

    // Format top signals for narrative prompt
    const topSignalsText = topSignals.length > 0
      ? topSignals.slice(0, 3).map(s => `${s.signalName} | ${s.whatToDetect} | ${s.recommendedMotion}`).join('\n')
      : "Not yet defined";

    // Format priority recommendation from structured data
    const priorityRec = contentStrategyData.priorityRecommendations.length > 0
      ? `${contentStrategyData.priorityRecommendations[0].title}: ${contentStrategyData.priorityRecommendations[0].explanation}`
      : "";

    // Generate all outputs in parallel for speed
    const [narrativeResult, alphaResult, pillarResult, podcastResult] = await Promise.allSettled([
      callClaude(`You are a straight-talking GTM advisor delivering the final assessment in a signal-driven GTM diagnostic.

Your job: synthesize everything into a tight, memorable summary that makes the reader feel genuinely understood — and shows them the path forward.

INPUTS:
- COMPANY: ${companyName || domain}
- PRODUCT: ${selectedProduct}
- COMPANY TYPE: ${companyType || "B2B company"}
- POSITIONING SUMMARY: ${companyAnalysis.positioningSummary.substring(0, 400)}
- POSITIONING OBSERVATION: ${companyAnalysis.positioningObservation.substring(0, 200)}
- IDEAL COMPANY PROFILE: ${idealCompanyProfile.rawText || "Not yet defined"}
- PRIMARY BUYER: ${primaryBuyerRole || "Decision maker"}
- KEY BUYING SIGNALS:
${topSignalsText}
- COMPETITIVE POSITION: ${competitiveData.defensibilityAssessment.substring(0, 300)}
- CONTENT GRADE: ${contentStrategyData.contentGrade || "Unknown"}
- CONTENT GAPS: ${contentStrategyData.buyerAlignmentAudit.substring(0, 300)}
- TOP CONTENT REC: ${priorityRec}

---

YOUR VOICE:
- Short, punchy sentences. Fragments when they hit harder.
- Periods for emphasis. Like this.
- No consultant-speak. Ban these words: leverage, optimize, drive, enable, empower, unlock potential, accelerate growth
- Sound like a sharp friend who's seen a hundred GTM motions and knows what actually works
- Be specific to THIS company. Generic = failure.

STRUCTURE:
Write exactly 3 short paragraphs. No headers. No preamble. No sign-off.

PARAGRAPH 1: WHAT'S WORKING
Start with their genuine strength. Be specific — name the product, the positioning, the asset. If very little is working, acknowledge the foundation they have and be honest about the gap.

PARAGRAPH 2: THE GAP
The thing that's holding them back. Not a list of problems — THE problem. The bottleneck that explains why good inputs aren't producing good outputs. Connect it to signals: they're either missing them, ignoring them, or not set up to act on them.

PARAGRAPH 3: THE UNLOCK
One clear priority. Not three things. One. The move that, if they made it, would change the trajectory. Frame it in terms of what becomes possible, not just what they should do.

---

CONSTRAINTS:
- 120-150 words total. Tight.
- No bullet points. No headers. Just three paragraphs.
- Don't soften to be polite. Honesty is the gift.
- End paragraph 3 with forward momentum — they should feel like action is possible, not overwhelmed.

---

OUTPUT:
[Paragraph 1]

[Paragraph 2]

[Paragraph 3]

---

IF THE PICTURE IS BLEAK:
Don't fake positives. Instead, frame paragraph 1 around potential: "The product is there. The market is there. The GTM motion to connect them? That's what's missing." Then proceed honestly.`, { model: 'opus' }),
      // Alpha signals - research-based, Sonnet is fine
      callClaudeJSON<AlphaSignalsResponse>(
        getAlphaSignalsPrompt({
          domain,
          companyName,
          selectedProduct,
          companyType,
          idealCompanyProfile,
          buyingCommittee,
          discoveredICPs,
          painTriggers,
          competitiveData,
          signalSystemSummary
        }) + `

OUTPUT AS JSON with this schema:
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
}`,
        {
          model: 'sonnet',
          useWebSearch: true,
          fallback: { signals: [] }
        }
      ),
      // Pillar content - strategic creative, use Opus
      callClaudeJSON<PillarContentResponse>(
        getPillarContentPrompt({
          domain,
          companyName,
          selectedProduct,
          companyType,
          idealCompanyProfile,
          buyingCommittee,
          discoveredICPs,
          icpResearchData,
          topSignals,
          contentStrategyData,
          competitiveData,
          companyAnalysis
        }) + `

OUTPUT AS JSON with this schema:
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
}`,
        {
          model: 'opus',
          useWebSearch: true,
          fallback: { concepts: [] }
        }
      ),
      // Podcast guests - strategic creative, use Opus
      callClaudeJSON<PodcastGuestsResponse>(
        getPodcastGuestsPrompt({
          domain,
          companyName,
          selectedProduct,
          idealCompanyProfile,
          buyingCommittee,
          discoveredICPs,
          icpResearchData,
          contentStrategyData,
          companyAnalysis,
          topSignals
        }) + `

OUTPUT AS JSON with this schema:
{
  "guests": [
    {
      "archetype": "Guest archetype title",
      "guestType": "ICP Guest or Amplifier Guest",
      "profile": "Role, company type, and characteristics",
      "icpConnection": "Connection to buying committee or audience overlap",
      "topic": "Episode topic",
      "strategicValue": "Relationship, reach, and signal value"
    }
  ]
}`,
        {
          model: 'opus',
          useWebSearch: true,
          fallback: { guests: [] }
        }
      )
    ]);

    const narrative = narrativeResult.status === 'fulfilled' ? narrativeResult.value : '';

    // JSON responses map directly to state - no text parsing needed
    const alphaData = alphaResult.status === 'fulfilled' ? alphaResult.value : { signals: [] };
    const pillarData = pillarResult.status === 'fulfilled' ? pillarResult.value : { concepts: [] };
    const podcastData = podcastResult.status === 'fulfilled' ? podcastResult.value : { guests: [] };

    // Map alpha signals from JSON
    setAlphaSignals(alphaData.signals.map(s => ({
      name: s.name || '',
      whyAlpha: s.whyAlpha || '',
      source: s.source || '',
      detection: s.detection || '',
      motion: s.motion || '',
      example: s.example || ''
    })));

    // Map pillar content from JSON
    setPillarContent(pillarData.concepts.map(c => ({
      title: c.title || '',
      angle: c.angle || '',
      targetBuyer: c.targetBuyer || '',
      dataFoundation: c.dataFoundation || '',
      signalCapture: c.signalCapture || '',
      repurposing: c.repurposing || '',
      cadence: c.cadence || ''
    })));

    // Map podcast guests from JSON
    setPodcastGuests(podcastData.guests.map(g => ({
      archetype: g.archetype || '',
      guestType: g.guestType || '',
      profile: g.profile || '',
      icpConnection: g.icpConnection || '',
      topic: g.topic || '',
      strategicValue: g.strategicValue || ''
    })));

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
            gtm_alpha_signals: JSON.stringify(alphaData.signals).substring(0, 65000),
            gtm_pillar_content: JSON.stringify(pillarData.concepts).substring(0, 65000),
            gtm_podcast_guests: JSON.stringify(podcastData.guests).substring(0, 65000),
            gtm_selected_icps: selectedICPs.join('; '),
            gtm_anysite_query: backgroundData.anysiteQuery || ''
          },
          associateWith: contactId ? { type: "contacts", id: contactId } : undefined
        })
      });
    } catch (e) {
      console.error("HubSpot company sync error:", e);
    }

    // Sync final report data to contact record
    syncToHubSpot({
      gtmos_selected_product: selectedProduct,
      gtmos_signal_vendors: selectedVendors.join(", "),
      gtmos_signal_types: selectedSignals.join(", "),
      gtmos_gtm_alignment: alignment.gtm || "",
      gtmos_report_narrative: cleanResponse(narrative).substring(0, 65000),
      gtmos_report_icp: (research.icp.refined || research.icp.initial || "").substring(0, 65000),
      gtmos_report_content: getR("content").substring(0, 65000),
      gtmos_report_competitive: cleanCompetitiveResponse(getCompetitive()).substring(0, 65000),
      gtmos_completed_at: new Date().toISOString()
    }, "report-complete");

    setCurrentStep(steps.indexOf("results"));
    setIsGeneratingReport(false);
  }

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

        <p className="text-[#e0dedc] mb-4 max-w-xl mx-auto leading-relaxed">
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

        <p className="mt-6 text-sm text-[#d4d2d1]">5-7 minutes • AI-powered research • Actionable program</p>
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
        <p className="text-[#e0dedc] mb-8">We&apos;ll start analyzing <span className="text-white font-medium">{domain}</span> while you fill this out.</p>

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

        <p className="mt-6 text-xs text-[#d4d2d1] text-center">Your info stays private. We just need an email to send your personalized report.</p>
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
            <p className="text-[#d4d2d1] text-sm mb-8">{stage.subtext}</p>

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
                <p className="text-sm text-[#e0dedc] text-left leading-relaxed">{insight}</p>
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
            <p className="text-[#d4d2d1]">Identifying ideal customer profiles for {selectedProduct}...</p>
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
        <p className="text-[#e0dedc] mb-6">Select 1-3 ideal customer profiles. This helps us generate more targeted signals, content, and outreach strategies.</p>

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
                  <div className="text-sm text-[#e0dedc] mt-1">{stripMarkdown(icp.description)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedICPs.length > 0 && (
          <div className="mt-4 text-sm text-[#d4d2d1]">
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

    // For content research, show special loading state if waiting on ICP data
    if (phaseKey === "content" && icpResearchData.jtbdList.length === 0 && !r.initial) {
      return (
        <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-11">
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-white/10 border-t-[#ff6f20] rounded-full animate-spin mx-auto mb-5" />
            <h3 className="font-semibold text-xl mb-2">Preparing Content Analysis</h3>
            <p className="text-white/60">Waiting for ICP insights to complete...</p>
            <p className="text-white/40 text-sm mt-2">Content strategy requires buyer persona data</p>
          </div>
        </div>
      );
    }

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
            // Gather related sections for context
            const relatedParts: string[] = [];
            if (phaseKey === "icp" && research.company.initial) {
              relatedParts.push(`COMPANY ANALYSIS:\n${research.company.refined || research.company.initial}`);
            }
            if (phaseKey === "competitive" && research.icp.initial) {
              relatedParts.push(`ICP ANALYSIS:\n${research.icp.refined || research.icp.initial}`);
            }
            if (phaseKey === "content") {
              if (research.icp.initial) relatedParts.push(`ICP ANALYSIS:\n${research.icp.refined || research.icp.initial}`);
              if (research.competitive.initial) relatedParts.push(`COMPETITIVE ANALYSIS:\n${research.competitive.refined || research.competitive.initial}`);
            }
            const relatedSections = relatedParts.join("\n\n---\n\n");
            const prompt = getRefinementPrompt(phaseKey, r.initial, r.feedback, relatedSections);
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
            <div className="w-11 h-11 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${v.color}20` }}>
              <VendorIcon id={v.id} className="w-6 h-6" style={{ color: v.color }} />
            </div>
            <div className="text-xs font-semibold">{v.name}</div>
          </div>
        ))}
        <div onClick={() => setSelectedVendors(prev => prev.includes("none") ? prev.filter(x => x !== "none") : [...prev, "none"])} className={`p-4 rounded-xl border-2 cursor-pointer text-center transition-all ${selectedVendors.includes("none") ? "border-[#ff6f20] bg-[#ff6f20]/10" : "border-white/15 bg-white/5 hover:border-[#ff6f20]/40"}`}>
          <div className="w-11 h-11 rounded-lg bg-white/10 mx-auto mb-2 flex items-center justify-center text-2xl">🚫</div>
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
        <p className="text-[#e0dedc] mb-6">Select your signal tools and the types of buying signals you monitor.</p>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
          {signalVendors.map((v) => (
            <div
              key={v.id}
              onClick={() => setSelectedVendors(prev => prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id])}
              className={`p-4 rounded-xl border-2 cursor-pointer text-center transition-all ${selectedVendors.includes(v.id) ? "border-[#ff6f20] bg-[#ff6f20]/10" : "border-[#3f3b3a] bg-[#070606]/50 hover:border-[#ff6f20]/40"}`}
            >
              <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${v.color}20` }}>
                <VendorIcon id={v.id} className="w-5 h-5" style={{ color: v.color }} />
              </div>
              <div className="text-xs font-semibold">{v.name}</div>
            </div>
          ))}
          <div
            onClick={() => setSelectedVendors(prev => prev.includes("none") ? prev.filter(x => x !== "none") : [...prev, "none"])}
            className={`p-4 rounded-xl border-2 cursor-pointer text-center transition-all ${selectedVendors.includes("none") ? "border-[#ff6f20] bg-[#ff6f20]/10" : "border-[#3f3b3a] bg-[#070606]/50 hover:border-[#ff6f20]/40"}`}
          >
            <div className="w-10 h-10 rounded-lg bg-white/10 mx-auto mb-2 flex items-center justify-center text-xl">🚫</div>
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
              <div className="text-xs text-[#d4d2d1]">{s.desc}</div>
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
        <p className="text-[#e0dedc] mb-4">This helps us calibrate recommendations for your maturity level.</p>

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
              <div className="text-xs text-[#d4d2d1]">{opt.d}</div>
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

    // Use stored content grade from contentStrategyData instead of re-parsing
    const grade = contentStrategyData.contentGrade || "?";
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
                    {signal.whyAlpha && <Text style={pdfStyles.signalImpact}>{signal.whyAlpha}</Text>}
                    <Text style={pdfStyles.label}>Source: <Text style={pdfStyles.value}>{signal.source}</Text></Text>
                    <Text style={pdfStyles.label}>Detection: <Text style={pdfStyles.value}>{signal.detection}</Text></Text>
                    {signal.motion && <Text style={pdfStyles.label}>Motion: <Text style={pdfStyles.value}>{signal.motion}</Text></Text>}
                    {signal.example && <Text style={pdfStyles.label}>Example: <Text style={pdfStyles.value}>{signal.example}</Text></Text>}
                  </View>
                ))}
              </View>
            )}

            {/* Pillar Content */}
            {pillarContent.length > 0 && (
              <View style={pdfStyles.sectionPurple}>
                <Text style={pdfStyles.sectionTitlePurple}>Pillar Content Concepts</Text>
                <Text style={pdfStyles.text}>High-value anchor assets that establish authority and capture intent signals</Text>
                {pillarContent.map((concept, i) => (
                  <View key={i} style={pdfStyles.signalCard}>
                    <Text style={pdfStyles.signalName}>{i + 1}. {concept.title}</Text>
                    {concept.angle && <Text style={pdfStyles.text}>{concept.angle}</Text>}
                    {concept.targetBuyer && <Text style={pdfStyles.label}>Target: <Text style={pdfStyles.value}>{concept.targetBuyer}</Text></Text>}
                    {concept.signalCapture && <Text style={pdfStyles.label}>Signal Capture: <Text style={pdfStyles.value}>{concept.signalCapture}</Text></Text>}
                    {concept.cadence && <Text style={pdfStyles.label}>Cadence: <Text style={pdfStyles.value}>{concept.cadence}</Text></Text>}
                  </View>
                ))}
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
                    <Text style={pdfStyles.guestName}>{i + 1}. {guest.archetype}</Text>
                    <Text style={pdfStyles.guestCompany}>{guest.guestType}</Text>
                    {guest.profile && <Text style={pdfStyles.label}>Profile: <Text style={pdfStyles.value}>{guest.profile}</Text></Text>}
                    <Text style={pdfStyles.label}>ICP Connection: <Text style={pdfStyles.value}>{guest.icpConnection}</Text></Text>
                    <Text style={pdfStyles.label}>Episode Topic: <Text style={pdfStyles.value}>{guest.topic}</Text></Text>
                    {guest.strategicValue && <Text style={pdfStyles.label}>Strategic Value: <Text style={pdfStyles.value}>{guest.strategicValue}</Text></Text>}
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
${alphaSignals.map((s, i) => `${i + 1}. ${s.name}\n   Why Alpha: ${s.whyAlpha}\n   Source: ${s.source}\n   Detection: ${s.detection}\n   Motion: ${s.motion}\n   Example: ${s.example}`).join('\n\n')}

================================================================================
PILLAR CONTENT CONCEPT
================================================================================
${pillarContent.length > 0 ? pillarContent.map((c, i) => `${i + 1}. ${c.title}\n   Angle: ${c.angle}\n   Target: ${c.targetBuyer}\n   Data: ${c.dataFoundation}\n   Signal Capture: ${c.signalCapture}\n   Cadence: ${c.cadence}`).join('\n\n') : 'Not generated'}

================================================================================
PODCAST GUESTS
================================================================================
${podcastGuests.map((g, i) => `${i + 1}. ${g.archetype} (${g.guestType})\n   Profile: ${g.profile}\n   ICP Connection: ${g.icpConnection}\n   Episode Topic: ${g.topic}\n   Strategic Value: ${g.strategicValue}`).join('\n\n')}
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

        {/* Transformation Overview */}
        <div className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#3f3b3a] rounded-3xl p-8">
          <div className="text-center mb-6">
            <h3 className="font-bold text-xl mb-2" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>Your GTM Transformation</h3>
            <p className="text-[#e0dedc] text-sm">Scroll to explore each dimension of your Signal-Driven GTM system</p>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-[#5b2e5e]/10 rounded-xl border border-[#5b2e5e]/20">
              <div className="text-2xl font-bold text-[#9a5d9d]">{selectedICPs.length || personas.length}</div>
              <div className="text-xs text-[#d4d2d1]">Target Personas</div>
            </div>
            <div className="text-center p-4 bg-[#ff6f20]/10 rounded-xl border border-[#ff6f20]/20">
              <div className="text-2xl font-bold text-[#ff6f20]">{alphaSignals.length}</div>
              <div className="text-xs text-[#d4d2d1]">Alpha Signals</div>
            </div>
            <div className="text-center p-4 bg-[#ffdd1f]/10 rounded-xl border border-[#ffdd1f]/20">
              <div className={`text-2xl font-bold ${gradeColors[grade]}`}>{grade}</div>
              <div className="text-xs text-[#d4d2d1]">Content Grade</div>
            </div>
            <div className="text-center p-4 bg-[#22c55e]/10 rounded-xl border border-[#22c55e]/20">
              <div className="text-2xl font-bold text-[#22c55e]">{podcastGuests.length}</div>
              <div className="text-xs text-[#d4d2d1]">Podcast Guests</div>
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

        {/* ==================== SECTION 1: TARGETING ==================== */}
        <div
          ref={(el) => registerSectionRef('targeting', el)}
          data-section-id="targeting"
          className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#5b2e5e]/30 rounded-3xl overflow-hidden"
        >
          <button
            type="button"
            onClick={() => {
              setUserHasManuallyToggled(true); // User has manually interacted, stop auto-expand
              setVisibleSections(prev => {
                const next = new Set(prev);
                if (next.has('targeting')) next.delete('targeting');
                else next.add('targeting');
                return next;
              });
            }}
            className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#5b2e5e]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#9a5d9d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-xl" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>Targeting & ICP</h3>
                <p className="text-sm text-[#d4d2d1]">From broad demographics to signal-driven personas</p>
              </div>
            </div>
            <svg className={`w-5 h-5 text-[#d4d2d1] transition-transform duration-300 ${visibleSections.has('targeting') ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className={`transition-all duration-500 ease-out ${visibleSections.has('targeting') ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current State */}
                <div className="bg-[#3f3b3a]/20 border border-[#3f3b3a] rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
                      <span className="text-[#ef4444] text-sm">✗</span>
                    </div>
                    <span className="text-[#e0dedc] font-medium uppercase text-xs tracking-wider">Current State</span>
                  </div>
                  <ul className="space-y-3 text-sm text-[#e0dedc]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#ef4444] mt-1">•</span>
                      <span>Broad job title targeting with minimal behavioral data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#ef4444] mt-1">•</span>
                      <span>Static ICPs that don&apos;t evolve with market changes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#ef4444] mt-1">•</span>
                      <span>Missing the &ldquo;jobs to be done&rdquo; context for outreach</span>
                    </li>
                  </ul>
                </div>

                {/* Future State */}
                <div className="bg-[#5b2e5e]/10 border border-[#5b2e5e]/30 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
                      <span className="text-[#22c55e] text-sm">✓</span>
                    </div>
                    <span className="text-[#9a5d9d] font-medium uppercase text-xs tracking-wider">Future State</span>
                  </div>
                  <ul className="space-y-3 text-sm text-[#dededd]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#22c55e] mt-1">•</span>
                      <span>Signal-enriched personas with buying intent indicators</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#22c55e] mt-1">•</span>
                      <span>Dynamic ICP refinement based on closed-won patterns</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#22c55e] mt-1">•</span>
                      <span>JTBD-driven messaging that resonates with real pain</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Your Personas */}
              <div className="mt-6 border-t border-[#3f3b3a] pt-6">
                <h4 className="font-semibold text-[#9a5d9d] mb-4">Your Target Personas</h4>
                <div className="space-y-4">
                  {personas.map((p, i) => (
                    <div key={i} className="bg-[#5b2e5e]/10 border border-[#5b2e5e]/20 rounded-xl p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'rgba(91, 46, 94, 0.35)', color: '#9a5d9d' }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white mb-1">{p.title}</div>
                          {p.goal && <p className="text-sm text-[#e0dedc] mb-2">{p.goal}</p>}
                          {p.jtbd && (
                            <div className="bg-black/20 rounded-lg p-3 mt-2">
                              <div className="text-xs text-[#9a5d9d] uppercase tracking-wide mb-1">Job to Be Done</div>
                              <p className="text-sm text-[#e8e6e4] italic leading-relaxed">&ldquo;{p.jtbd}&rdquo;</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== SECTION 2: SIGNALS ==================== */}
        <div
          ref={(el) => registerSectionRef('signals', el)}
          data-section-id="signals"
          className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#ff6f20]/30 rounded-3xl overflow-hidden"
        >
          <button
            type="button"
            onClick={() => {
              setUserHasManuallyToggled(true);
              setVisibleSections(prev => {
                const next = new Set(prev);
                if (next.has('signals')) next.delete('signals');
                else next.add('signals');
                return next;
              });
            }}
            className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#ff6f20]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#ff6f20]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-xl" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>Signals & Intent</h3>
                <p className="text-sm text-[#d4d2d1]">From reactive prospecting to predictive alpha signals</p>
              </div>
            </div>
            <svg className={`w-5 h-5 text-[#d4d2d1] transition-transform duration-300 ${visibleSections.has('signals') ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className={`transition-all duration-500 ease-out ${visibleSections.has('signals') ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current State */}
                <div className="bg-[#3f3b3a]/20 border border-[#3f3b3a] rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
                      <span className="text-[#ef4444] text-sm">✗</span>
                    </div>
                    <span className="text-[#e0dedc] font-medium uppercase text-xs tracking-wider">Current State</span>
                  </div>
                  <ul className="space-y-3 text-sm text-[#e0dedc]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#ef4444] mt-1">•</span>
                      <span>Reacting to inbound leads after competitors engage</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#ef4444] mt-1">•</span>
                      <span>Generic intent data without actionable triggers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#ef4444] mt-1">•</span>
                      <span>Missing early buying signals that predict pipeline</span>
                    </li>
                  </ul>
                </div>

                {/* Future State */}
                <div className="bg-[#ff6f20]/10 border border-[#ff6f20]/30 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
                      <span className="text-[#22c55e] text-sm">✓</span>
                    </div>
                    <span className="text-[#ff8f50] font-medium uppercase text-xs tracking-wider">Future State</span>
                  </div>
                  <ul className="space-y-3 text-sm text-[#dededd]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#22c55e] mt-1">•</span>
                      <span>Alpha signals detect intent before competitors notice</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#22c55e] mt-1">•</span>
                      <span>Multi-source signal aggregation for higher confidence</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#22c55e] mt-1">•</span>
                      <span>Automated workflows triggered by signal patterns</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Alpha Signals */}
              {alphaSignals.length > 0 && (
                <div className="mt-6 border-t border-[#3f3b3a] pt-6">
                  <h4 className="font-semibold text-[#ff8f50] mb-4">Your Alpha Signals</h4>
                  <p className="text-[#d4d2d1] text-sm mb-4">Buying indicators that predict intent before competitors notice</p>
                  <div className="space-y-4">
                    {alphaSignals.map((signal, i) => (
                      <div key={i} className="bg-gradient-to-r from-[#ff6f20]/10 to-transparent border border-[#ff6f20]/20 rounded-2xl p-5">
                        <div className="flex items-start gap-4 mb-3">
                          <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'rgba(255, 111, 32, 0.35)', color: '#ff6f20' }}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white">{signal.name}</h4>
                          </div>
                        </div>
                        {signal.whyAlpha && (
                          <p className="text-[#ff8f50] text-sm italic mb-3">{signal.whyAlpha}</p>
                        )}
                        {(signal.source || signal.detection) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {signal.source && (
                              <div>
                                <span className="text-[#d4d2d1]">Source:</span>
                                <span className="text-[#dededd] ml-2">{signal.source}</span>
                              </div>
                            )}
                            {signal.detection && (
                              <div>
                                <span className="text-[#d4d2d1]">Detection:</span>
                                <span className="text-[#dededd] ml-2">{signal.detection}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {signal.motion && (
                          <div className="mt-3 pt-3 border-t border-[#3f3b3a]">
                            <span className="text-[#d4d2d1] text-sm">Recommended Motion: </span>
                            <span className="text-[#22c55e] text-sm font-medium">{signal.motion}</span>
                          </div>
                        )}
                        {signal.example && (
                          <div className="mt-2">
                            <span className="text-[#d4d2d1] text-sm">Example: </span>
                            <span className="text-[#e0dedc] text-sm italic">{signal.example}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================== SECTION 3: CONTENT ==================== */}
        <div
          ref={(el) => registerSectionRef('content', el)}
          data-section-id="content"
          className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#ffdd1f]/30 rounded-3xl overflow-hidden"
        >
          <button
            type="button"
            onClick={() => {
              setUserHasManuallyToggled(true);
              setVisibleSections(prev => {
                const next = new Set(prev);
                if (next.has('content')) next.delete('content');
                else next.add('content');
                return next;
              });
            }}
            className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#ffdd1f]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#ffdd1f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-xl" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>Content Strategy</h3>
                <p className="text-sm text-[#d4d2d1]">From generic content to signal-triggered authority</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-lg font-bold ${gradeColors[grade]}`}>{grade}</span>
              <svg className={`w-5 h-5 text-[#d4d2d1] transition-transform duration-300 ${visibleSections.has('content') ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          <div className={`transition-all duration-500 ease-out ${visibleSections.has('content') ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current State */}
                <div className="bg-[#3f3b3a]/20 border border-[#3f3b3a] rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
                      <span className="text-[#ef4444] text-sm">✗</span>
                    </div>
                    <span className="text-[#e0dedc] font-medium uppercase text-xs tracking-wider">Current State</span>
                  </div>
                  <ul className="space-y-3 text-sm text-[#e0dedc]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#ef4444] mt-1">•</span>
                      <span>Content calendar based on internal schedules</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#ef4444] mt-1">•</span>
                      <span>Generic topics that don&apos;t resonate with ICP pain</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#ef4444] mt-1">•</span>
                      <span>Disconnected from buying signals and VOC insights</span>
                    </li>
                  </ul>
                </div>

                {/* Future State */}
                <div className="bg-[#ffdd1f]/10 border border-[#ffdd1f]/30 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
                      <span className="text-[#22c55e] text-sm">✓</span>
                    </div>
                    <span className="text-[#ffdd1f] font-medium uppercase text-xs tracking-wider">Future State</span>
                  </div>
                  <ul className="space-y-3 text-sm text-[#dededd]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#22c55e] mt-1">•</span>
                      <span>Signal-triggered content addressing pain at the moment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#22c55e] mt-1">•</span>
                      <span>VOC-driven topics that build trust with ICPs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#22c55e] mt-1">•</span>
                      <span>Pillar content that positions you as the authority</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Pillar Content Concepts */}
              {pillarContent.length > 0 && (
                <div className="mt-6 border-t border-[#3f3b3a] pt-6">
                  <h4 className="font-semibold text-[#ffdd1f] mb-4">Your Pillar Content Concepts</h4>
                  <p className="text-[#d4d2d1] text-sm mb-4">High-value anchor assets that establish authority and capture intent signals</p>
                  <div className="space-y-4">
                    {pillarContent.map((concept, i) => (
                      <div key={i} className="bg-gradient-to-r from-[#ffdd1f]/10 to-transparent border border-[#ffdd1f]/20 rounded-2xl p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'rgba(255, 221, 31, 0.35)', color: '#ffdd1f' }}>
                            {i + 1}
                          </div>
                          <h5 className="font-bold text-lg text-white">{concept.title}</h5>
                        </div>
                        {concept.angle && (
                          <p className="text-[#dededd] mb-4">{concept.angle}</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {concept.targetBuyer && (
                            <div>
                              <span className="text-[#d4d2d1]">Target:</span>
                              <span className="text-[#dededd] ml-2">{concept.targetBuyer}</span>
                            </div>
                          )}
                          {concept.cadence && (
                            <div>
                              <span className="text-[#d4d2d1]">Cadence:</span>
                              <span className="text-[#dededd] ml-2">{concept.cadence}</span>
                            </div>
                          )}
                        </div>
                        {concept.signalCapture && (
                          <div className="mt-3 pt-3 border-t border-[#3f3b3a]">
                            <span className="text-[#d4d2d1] text-sm">Signal Capture: </span>
                            <span className="text-[#22c55e] text-sm">{concept.signalCapture}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Grade */}
              <div className="mt-6 border-t border-[#3f3b3a] pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`text-3xl font-bold ${gradeColors[grade]}`}>{grade}</div>
                  <div>
                    <div className="font-medium text-white">Current Content Grade</div>
                    <div className="text-sm text-[#d4d2d1]">Based on ICP alignment and presence</div>
                  </div>
                </div>
                {contentStrategyData.contentGradeRationale && (
                  <p className="text-[#e0dedc] text-sm leading-relaxed">
                    {contentStrategyData.contentGradeRationale}
                  </p>
                )}
              </div>

              {/* Priority Recommendations */}
              {contentStrategyData.priorityRecommendations.length > 0 && (
                <div className="mt-6 border-t border-[#3f3b3a] pt-6">
                  <h4 className="font-semibold text-[#ff6f20] mb-2">Priority Recommendations</h4>
                  <p className="text-[#d4d2d1] text-sm mb-4">Actionable next steps ranked by potential impact</p>
                  <div className="space-y-4">
                    {contentStrategyData.priorityRecommendations.map((rec, i) => {
                      const impactColors: Record<string, string> = {
                        'HIGHEST IMPACT': 'border-[#ff6f20]/50 bg-gradient-to-r from-[#ff6f20]/15 to-transparent',
                        'HIGH IMPACT': 'border-[#ffdd1f]/50 bg-gradient-to-r from-[#ffdd1f]/15 to-transparent',
                        'MEDIUM IMPACT': 'border-[#5a5654]/50 bg-gradient-to-r from-[#5a5654]/15 to-transparent'
                      };
                      const badgeColors: Record<string, string> = {
                        'HIGHEST IMPACT': 'bg-[#ff6f20] text-white',
                        'HIGH IMPACT': 'bg-[#ffdd1f] text-[#070606]',
                        'MEDIUM IMPACT': 'bg-[#5a5654] text-white'
                      };
                      return (
                        <div key={i} className={`p-5 rounded-2xl border ${impactColors[rec.impact] || 'border-[#3f3b3a] bg-[#070606]/50'}`}>
                          <div className="flex items-start gap-3">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${badgeColors[rec.impact] || 'bg-[#3f3b3a] text-white'}`}>
                              {rec.impact}
                            </span>
                            <div className="flex-1">
                              <div className="font-semibold text-white mb-2">{rec.title}</div>
                              <p className="text-sm text-[#e0dedc] leading-relaxed">{rec.explanation}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================== SECTION 4: OUTREACH ==================== */}
        <div
          ref={(el) => registerSectionRef('outreach', el)}
          data-section-id="outreach"
          className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#22c55e]/30 rounded-3xl overflow-hidden"
        >
          <button
            type="button"
            onClick={() => {
              setUserHasManuallyToggled(true);
              setVisibleSections(prev => {
                const next = new Set(prev);
                if (next.has('outreach')) next.delete('outreach');
                else next.add('outreach');
                return next;
              });
            }}
            className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#22c55e]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#22c55e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-xl" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>Outreach & Pipeline</h3>
                <p className="text-sm text-[#d4d2d1]">From cold outreach to warm signal-driven connections</p>
              </div>
            </div>
            <svg className={`w-5 h-5 text-[#d4d2d1] transition-transform duration-300 ${visibleSections.has('outreach') ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className={`transition-all duration-500 ease-out ${visibleSections.has('outreach') ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current State */}
                <div className="bg-[#3f3b3a]/20 border border-[#3f3b3a] rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
                      <span className="text-[#ef4444] text-sm">✗</span>
                    </div>
                    <span className="text-[#e0dedc] font-medium uppercase text-xs tracking-wider">Current State</span>
                  </div>
                  <ul className="space-y-3 text-sm text-[#e0dedc]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#ef4444] mt-1">•</span>
                      <span>High-volume cold outreach with low response rates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#ef4444] mt-1">•</span>
                      <span>Generic templates that don&apos;t reference context</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#ef4444] mt-1">•</span>
                      <span>Disconnected from content and trust-building efforts</span>
                    </li>
                  </ul>
                </div>

                {/* Future State */}
                <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
                      <span className="text-[#22c55e] text-sm">✓</span>
                    </div>
                    <span className="text-[#22c55e] font-medium uppercase text-xs tracking-wider">Future State</span>
                  </div>
                  <ul className="space-y-3 text-sm text-[#dededd]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#22c55e] mt-1">•</span>
                      <span>Signal-triggered outreach to warm, pre-engaged contacts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#22c55e] mt-1">•</span>
                      <span>Context-rich messaging referencing their activity</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#22c55e] mt-1">•</span>
                      <span>Trust already established through content engagement</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Podcast Guests */}
              {podcastGuests.length > 0 && (
                <div className="mt-6 border-t border-[#3f3b3a] pt-6">
                  <h4 className="font-semibold text-[#22c55e] mb-4">Podcast Guest Suggestions</h4>
                  <p className="text-sm text-[#e0dedc] mb-4">ICP-matching guests who expand your reach to ideal buyers</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {podcastGuests.map((guest, i) => (
                      <div key={i} className="bg-gradient-to-r from-[#22c55e]/10 to-transparent border border-[#22c55e]/20 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'rgba(34, 197, 94, 0.35)', color: '#22c55e' }}>
                            {i + 1}
                          </div>
                          <div>
                            <h5 className="font-semibold text-white">{guest.archetype}</h5>
                            <p className="text-[#d4d2d1] text-sm">{guest.guestType}</p>
                          </div>
                        </div>
                        {guest.profile && (
                          <p className="text-[#e0dedc] text-sm mb-3">{guest.profile}</p>
                        )}
                        {(guest.icpConnection || guest.topic || guest.strategicValue) && (
                          <div className="space-y-2 text-sm">
                            {guest.icpConnection && (
                              <div>
                                <span className="text-[#9a5d9d] font-medium">ICP Connection:</span>
                                <span className="text-[#e0dedc] ml-2">{guest.icpConnection}</span>
                              </div>
                            )}
                            {guest.topic && (
                              <div>
                                <span className="text-[#ff8f50] font-medium">Episode Topic:</span>
                                <span className="text-[#e8e6e4] ml-2">{guest.topic}</span>
                              </div>
                            )}
                            {guest.strategicValue && (
                              <div className="mt-2 pt-2 border-t border-[#3f3b3a]">
                                <span className="text-[#e8e6e4] italic text-sm leading-relaxed">{guest.strategicValue}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Signal-Driven GTM Program - Standalone Section */}
        <div className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#3f3b3a] rounded-3xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#ff6f20]/20 to-[#5b2e5e]/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#ff6f20]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div>
              <h3 className="font-bold text-xl" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>Your Signal-Driven GTM Program</h3>
              <p className="text-sm text-[#d4d2d1]">Each element feeds the next — signals generate content, content builds trust, trust accelerates pipeline</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[#5b2e5e]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#9a5d9d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <h5 className="font-semibold text-white text-sm mb-1">VOC Program</h5>
              <p className="text-xs text-[#d4d2d1]">25 ICP conversations</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[#ff6f20]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#ff6f20]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </div>
              <h5 className="font-semibold text-white text-sm mb-1">Social Listening</h5>
              <p className="text-xs text-[#d4d2d1]">50 connections/month</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[#ffdd1f]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#ffdd1f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </div>
              <h5 className="font-semibold text-white text-sm mb-1">ICP Podcasts</h5>
              <p className="text-xs text-[#d4d2d1]">4 guest episodes</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[#22c55e]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#22c55e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h5 className="font-semibold text-white text-sm mb-1">Pillar Content</h5>
              <p className="text-xs text-[#d4d2d1]">Signal-based reports</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[#ef4444]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#ef4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h5 className="font-semibold text-white text-sm mb-1">Signal Sequences</h5>
              <p className="text-xs text-[#d4d2d1]">Trigger-based outreach</p>
            </div>
            <div className="bg-gradient-to-r from-[#ff6f20]/10 to-[#5b2e5e]/10 border border-[#ff6f20]/30 rounded-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-gradient-to-r from-[#ff6f20]/30 to-[#5b2e5e]/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <h5 className="font-semibold text-[#ff8f50] text-sm mb-1">HubSpot Enablement</h5>
              <p className="text-xs text-[#d4d2d1]">Meeting prep & reporting</p>
            </div>
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
                  <p className="text-xs text-[#d4d2d1]">{competitors.length} competitors analyzed</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-[#d4d2d1] transition-transform ${competitiveExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {competitiveExpanded && (
              <div className="px-6 pb-6 space-y-3">
                {competitors.map((c, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="font-semibold text-white mb-2">{c.name}</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-[#22c55e]">+</span> <span className="text-[#e0dedc]">{c.strength || "—"}</span></div>
                      <div><span className="text-[#ef4444]">−</span> <span className="text-[#e0dedc]">{c.weakness || "—"}</span></div>
                      <div><span className="text-[#ff6f20]">→</span> <span className="text-[#e0dedc]">{c.youWin || "—"}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
          <p className="text-[#e0dedc] mt-2">Signal-driven analysis of your go-to-market engine</p>
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

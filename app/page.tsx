"use client";
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'gtm-diagnostic-session';

const signalVendors = [
  { id: "clay", name: "Clay", logo: "https://logo.clearbit.com/clay.com" },
  { id: "apollo", name: "Apollo", logo: "https://logo.clearbit.com/apollo.io" },
  { id: "zoominfo", name: "ZoomInfo", logo: "https://logo.clearbit.com/zoominfo.com" },
  { id: "usergems", name: "UserGems", logo: "https://logo.clearbit.com/usergems.com" },
  { id: "warmly", name: "Warmly", logo: "https://logo.clearbit.com/warmly.ai" },
  { id: "commonroom", name: "Common Room", logo: "https://logo.clearbit.com/commonroom.io" }
];

const signalTypes = [
  { id: "job_changes", label: "Job Changes", desc: "Contact role changes" },
  { id: "funding", label: "Funding Events", desc: "Fundraising news" },
  { id: "tech_installs", label: "Tech Stack", desc: "Technology adoption" },
  { id: "intent_data", label: "Intent Data", desc: "Research behavior" },
  { id: "website_visitors", label: "Website Visitors", desc: "De-anonymized" }
];

const steps = ["intro", "select-product", "basic", "research-company", "research-icp", "research-competitive", "research-content", "signals", "alignment", "generating", "results"];
export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [crm, setCrm] = useState("");
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [alignment, setAlignment] = useState<{gtm?: string}>({});
  const [research, setResearch] = useState({
    company: { initial: "", feedback: "", refined: "", loading: false },
    icp: { initial: "", feedback: "", refined: "", loading: false },
    competitive: { initial: "", feedback: "", refined: "", loading: false },
    content: { initial: "", feedback: "", refined: "", loading: false }
  });
  const [reportData, setReportData] = useState<{narrative: string; icp: string; content: string; competitive: string} | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const [products, setProducts] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

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
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save session:', e);
    }
  }, [isHydrated, currentStep, websiteUrl, domain, email, companyName, role, companySize, crm, selectedVendors, selectedSignals, alignment, research, reportData, contactId, products, selectedProduct]);

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
  }, []);

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

  const startDiagnostic = async () => {
    if (!websiteUrl) { showError("Please enter a website URL"); return; }
    const d = websiteUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    setDomain(d);
    setProductsLoading(true);
    nextStep();
    
    // Fetch products/offerings
    try {
      const result = await callClaude(`Search the web for "${d}" and identify their products, solutions, or service offerings.

Return ONLY a simple numbered list of their distinct products/offerings. For example:
1. Product Name A
2. Product Name B
3. Service Offering C

If they only have ONE main product/solution, just return that one item.
If it's a service company with no distinct products, list their main service categories.

RULES:
- Maximum 8 items
- Just the product/service names, no descriptions
- No preamble, just the numbered list`);
      
      // Parse the product list with multiple format support
      let parsed: string[] = [];

      // Try numbered list format (1. Product, 2. Product)
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

      // Fallback: Split on newlines and filter
      if (parsed.length === 0) {
        parsed = result.split('\n')
          .map((line: string) => line.replace(/^\d+[\.\)]\s*/, '').replace(/^[•\-\*]\s*/, '').trim())
          .filter((line: string) => line.length > 2 && line.length < 100 && !line.toLowerCase().includes('product') && !line.toLowerCase().includes('here'));
      }

      setProducts(parsed.length > 0 ? parsed.slice(0, 8) : [d]);
    } catch (e) {
      setProducts([d]);
    }
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

  useEffect(() => {
    const step = steps[currentStep];
    const phases: {[key: string]: string} = { "research-company": "company", "research-icp": "icp", "research-competitive": "competitive", "research-content": "content" };
    const currentPhase = phases[step];
    if (currentPhase) {
      const phaseData = research[currentPhase as keyof typeof research];
      if (!phaseData.initial && !phaseData.loading) runResearchPhase(currentPhase);
    }
    if (step === "basic" && domain) {
      const companyData = research.company;
      if (!companyData.initial && !companyData.loading) runResearchPhase("company");
    }
    if (step === "generating" && !reportData) generateReport();
  }, [currentStep, domain]);

  const generateReport = async () => {
    const getR = (k: string) => cleanResponse(research[k as keyof typeof research].refined || research[k as keyof typeof research].initial || "");
    const getCompetitive = () => research.competitive.refined || research.competitive.initial || "";
    
    const narrative = await callClaude(`You're a straight-talking GTM advisor. Write an executive summary for ${companyName || domain}'s "${selectedProduct}".

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

NO PREAMBLE. Start with paragraph 1.`);

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
            gtm_diagnostic_date: new Date().toISOString().split('T')[0]
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
    <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-11 text-center">
      <div className="text-5xl mb-6">🔬</div>
      <h2 className="font-bold text-2xl mb-3">Get Your Custom GTM Analysis</h2>
      <p className="text-white/60 mb-8 max-w-md mx-auto">Enter your website for AI-powered analysis of your company, customers, and competitors.</p>
      <div className="max-w-sm mx-auto">
        <input type="url" placeholder="https://yourcompany.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-4 text-white text-center mb-4 outline-none focus:border-[#ff6f20]" />
        <button onClick={startDiagnostic} className="w-full bg-gradient-to-r from-[#ff6f20] to-[#e56318] text-white py-4 px-8 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#ff6f20]/30 transition-all">Start Analysis →</button>
      </div>
      <p className="mt-6 text-sm text-white/40">5-7 minutes • AI research • PDF report</p>
    </div>
  );
  const renderSelectProduct = () => {
    if (productsLoading) {
      return (
        <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-11">
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-white/10 border-t-[#ff6f20] rounded-full animate-spin mx-auto mb-5" />
            <h3 className="font-semibold text-xl mb-2">Analyzing {domain}</h3>
            <p className="text-white/60">Identifying products and offerings...</p>
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
          <button onClick={prevStep} className="bg-white/5 border border-white/15 text-white py-4 px-8 rounded-lg font-medium hover:bg-white/10 transition-all">← Back</button>
          <button 
            onClick={() => { if (selectedProduct) nextStep(); else showError("Please select a product to analyze"); }}
            className="flex-1 bg-gradient-to-r from-[#ff6f20] to-[#e56318] text-white py-4 px-8 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#ff6f20]/30 transition-all"
          >Continue →</button>
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
            <img src={v.logo} alt={v.name} className="w-11 h-11 object-contain rounded-lg bg-white p-1 mx-auto mb-2" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
              <button key={opt.v} onClick={() => setAlignment(prev => ({ ...prev, gtm: opt.v }))} className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${alignment.gtm === opt.v ? "border-[#ff6f20] bg-[#ff6f20]/10" : "border-white/15 bg-white/5 hover:border-[#ff6f20]/40"}`}>{opt.l}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-7">
        <button onClick={prevStep} className="bg-white/5 border border-white/15 text-white py-4 px-8 rounded-lg font-medium hover:bg-white/10 transition-all">← Back</button>
        <button onClick={() => setCurrentStep(steps.indexOf("generating"))} className="flex-1 bg-gradient-to-r from-[#ff6f20] to-[#e56318] text-white py-4 px-8 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#ff6f20]/30 transition-all">Generate Report →</button>
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
    
    const downloadReport = () => {
      const safeClean = (text: string) => text ? cleanResponse(text) : "(No data)";
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
ICP & PERSONAS
================================================================================
${safeClean(reportData?.icp)}

================================================================================
COMPETITIVE LANDSCAPE
================================================================================
${safeClean(reportData?.competitive)}

================================================================================
CONTENT STRATEGY
================================================================================
${safeClean(reportData?.content)}
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
    const personas = parsePersonas(cleanResponse(reportData.icp).split("\n")).slice(0, 4);

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
                <div className="text-xs text-[#75716f] mt-1">{personas.length} Personas</div>
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

        {/* Personas & Signals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personas */}
          <div className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#3f3b3a] rounded-3xl p-6">
            <h3 className="font-bold text-lg mb-4" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>Target Personas</h3>
            <div className="space-y-3">
              {personas.map((p, i) => (
                <div key={i} className="bg-[#5b2e5e]/10 border border-[#5b2e5e]/20 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#5b2e5e]/30 flex items-center justify-center text-sm">
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

          {/* Competitive Snapshot */}
          {competitors.length > 0 && (
            <div className="bg-gradient-to-br from-[#232120] to-[#070606] border border-[#3f3b3a] rounded-3xl p-6">
              <h3 className="font-bold text-lg mb-4" style={{ fontFamily: "var(--font-heading), 'Montserrat', sans-serif" }}>Competitive Landscape</h3>
              <div className="space-y-3">
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
      <div className="min-h-screen bg-gradient-to-br from-[#070606] via-[#232120] to-[#070606] p-6 text-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/10 border-t-[#ff6f20] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#070606] via-[#232120] to-[#070606] p-6 text-[#f9f9f9]" style={{ fontFamily: "var(--font-body), 'Open Sans', sans-serif" }}>
      {/* Error Toast */}
      {errorToast && (
        <div className="fixed top-4 right-4 z-50 bg-[#ff1f40]/90 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2">
          <span className="text-lg">⚠️</span>
          <span>{errorToast}</span>
          <button onClick={() => setErrorToast(null)} className="ml-2 hover:text-white/80">✕</button>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
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
        {step === "select-product" && renderSelectProduct()}
        {step === "basic" && renderBasic()}
        {step === "research-company" && renderResearch("company", "Company Analysis")}
        {step === "research-icp" && renderResearch("icp", "Ideal Customer Profile")}
        {step === "research-competitive" && renderResearch("competitive", "Competitive Landscape")}
        {step === "research-content" && renderResearch("content", "Content Strategy")}
        {step === "signals" && renderSignals()}
        {step === "alignment" && renderAlignment()}
        {step === "generating" && renderGenerating()}
        {step === "results" && renderResults()}
      </div>
    </div>
  );
}

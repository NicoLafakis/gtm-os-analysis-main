// GTM OS Builder - Response Parsing Functions
// All parsers are pure functions that take text and return parsed data

import type {
  CompanyAnalysis,
  IcpResearchData,
  CompetitiveData,
  ContentStrategyData,
  SignalSystemEntry,
  CompetitorComparison,
  PriorityRecommendation,
  JtbdEntry,
  ParsedSection,
  ParsedPersona,
} from '../types';

/**
 * Parse company analysis (Prompt 3) response
 */
export function parseCompanyAnalysis(text: string): CompanyAnalysis {
  const whatMatch = text.match(/WHAT YOU DO[:\s]*([\s\S]*?)(?=THE PAIN|HOW YOU|POSITIONING|$)/i);
  const painMatch = text.match(/THE PAIN YOU ADDRESS[:\s]*([\s\S]*?)(?=HOW YOU|POSITIONING|$)/i);
  const howMatch = text.match(/HOW YOU(?:'RE| ARE) POSITIONED[:\s]*([\s\S]*?)(?=POSITIONING OBSERVATION|$)/i);
  const obsMatch = text.match(/POSITIONING OBSERVATION[:\s]*([\s\S]*?)$/i);

  const whatYouDo = whatMatch ? whatMatch[1].trim() : "";
  const howPositioned = howMatch ? howMatch[1].trim() : "";

  return {
    positioningSummary: [whatYouDo, howPositioned].filter(Boolean).join(" "),
    painAddressed: painMatch ? painMatch[1].trim() : "",
    positioningObservation: obsMatch ? obsMatch[1].trim() : ""
  };
}

/**
 * Parse ICP research (Prompt 4) response
 * Returns structured data and derived fields
 */
export function parseIcpResearch(text: string): {
  icpData: IcpResearchData;
  signalSystemSummary: string[];
  topSignals: SignalSystemEntry[];
} {
  const jtbdList: JtbdEntry[] = [];
  const signalSystem: SignalSystemEntry[] = [];

  // Extract JTBDs
  const jtbdMatch = text.match(/JOBS TO BE DONE[\s\S]*?(?=SIGNAL SYSTEM|$)/i);
  if (jtbdMatch) {
    const personaBlocks = jtbdMatch[0].split(/PERSONA:/i).filter((s: string) => s.trim());
    personaBlocks.forEach((block: string) => {
      const titleMatch = block.match(/^([^\n]+)/);
      const jtbdTextMatch = block.match(/JTBD:\s*([^\n]+)/i);
      if (titleMatch && jtbdTextMatch) {
        jtbdList.push({
          persona: titleMatch[1].trim(),
          jtbd: jtbdTextMatch[1].trim()
        });
      }
    });
  }

  // Extract Signal System
  const signalMatch = text.match(/SIGNAL SYSTEM[\s\S]*?(?=SIGNAL BLIND|$)/i);
  if (signalMatch) {
    let currentCategory = "";
    const lines = signalMatch[0].split('\n');
    lines.forEach((line: string) => {
      const trimmed = line.trim();
      // Check if it's a category header
      if (/^[A-Z][A-Z\s]+SIGNALS?$/i.test(trimmed)) {
        currentCategory = trimmed.replace(/SIGNALS?$/i, '').trim();
      }
      // Check if it's a signal row with pipes
      else if (trimmed.includes('|')) {
        const parts = trimmed.split('|').map((p: string) => p.trim());
        if (parts.length >= 3 && parts[0] && !parts[0].toLowerCase().includes('signal name')) {
          signalSystem.push({
            category: currentCategory || "General",
            signalName: parts[0],
            whatToDetect: parts[1] || "",
            recommendedMotion: parts[2] || ""
          });
        }
      }
    });
  }

  // Extract signal blind spot
  const blindSpotMatch = text.match(/SIGNAL BLIND SPOT[:\s]*([\s\S]*?)$/i);

  return {
    icpData: {
      jtbdList,
      signalSystem,
      signalBlindSpot: blindSpotMatch ? blindSpotMatch[1].trim() : ""
    },
    signalSystemSummary: signalSystem.map(s => s.signalName),
    topSignals: signalSystem.slice(0, 4)
  };
}

/**
 * Parse competitive analysis (Prompt 5) response
 */
export function parseCompetitiveAnalysis(text: string): CompetitiveData {
  const landscapeMatch = text.match(/COMPETITIVE LANDSCAPE[:\s]*([\s\S]*?)(?=COMPETITOR COMPARISON|$)/i);
  const gapsMatch = text.match(/COMPETITIVE GAPS[:\s]*([\s\S]*?)(?=DEFENSIBILITY|$)/i);
  const defMatch = text.match(/DEFENSIBILITY ASSESSMENT[:\s]*([\s\S]*?)$/i);

  // Parse competitor comparison table
  const competitors: CompetitorComparison[] = [];
  const comparisonMatch = text.match(/COMPETITOR COMPARISON[\s\S]*?(?=COMPETITIVE GAPS|DEFENSIBILITY|$)/i);
  if (comparisonMatch) {
    const lines = comparisonMatch[0].split('\n');
    lines.forEach((line: string) => {
      const trimmed = line.trim();
      if (trimmed.includes('|') && !trimmed.toLowerCase().includes('competitor') && !trimmed.match(/^[\-|:]+$/)) {
        const parts = trimmed.split('|').map((p: string) => p.trim());
        if (parts.length >= 4 && parts[0]) {
          competitors.push({
            competitor: parts[0],
            primaryStrength: parts[1] || "",
            primaryWeakness: parts[2] || "",
            battleground: parts[3] || ""
          });
        }
      }
    });
  }

  return {
    competitiveLandscape: landscapeMatch ? landscapeMatch[1].trim() : "",
    competitorComparison: competitors,
    competitiveGaps: gapsMatch ? gapsMatch[1].trim() : "",
    defensibilityAssessment: defMatch ? defMatch[1].trim() : ""
  };
}

/**
 * Parse content strategy (Prompt 6) response
 */
export function parseContentStrategy(text: string): ContentStrategyData {
  const footprintMatch = text.match(/CONTENT FOOTPRINT[:\s]*([\s\S]*?)(?=BUYER ALIGNMENT|SIGNAL OPPORTUNITY|$)/i);
  const alignmentMatch = text.match(/BUYER ALIGNMENT AUDIT[:\s]*([\s\S]*?)(?=SIGNAL OPPORTUNITY|CONTENT GRADE|$)/i);
  const signalOpMatch = text.match(/SIGNAL OPPORTUNITY ASSESSMENT[:\s]*([\s\S]*?)(?=CONTENT GRADE|PRIORITY|$)/i);
  const gradeMatch = text.match(/Grade:\s*([A-F])/i);
  const rationaleMatch = text.match(/Rationale:\s*([^\n]+)/i);

  // Parse priority recommendations
  const recommendations: PriorityRecommendation[] = [];
  const recMatch = text.match(/PRIORITY RECOMMENDATIONS[\s\S]*$/i);
  if (recMatch) {
    const recBlocks = recMatch[0].split(/\d+\.\s*\[/).filter((s: string) => s.trim());
    recBlocks.forEach((block: string, i: number) => {
      const impactMatch = block.match(/^([A-Z\s]+IMPACT)\]/i);
      const titleMatch = block.match(/\]\s*([^\n]+)/);
      const explMatch = block.match(/\]\s*[^\n]+\n\s*([^\n]+)/);

      if (impactMatch && titleMatch) {
        recommendations.push({
          rank: i + 1,
          impact: impactMatch[1].trim(),
          title: titleMatch[1].trim(),
          explanation: explMatch ? explMatch[1].trim() : ""
        });
      }
    });
  }

  return {
    contentFootprint: footprintMatch ? footprintMatch[1].trim() : "",
    buyerAlignmentAudit: alignmentMatch ? alignmentMatch[1].trim() : "",
    signalOpportunityAssessment: signalOpMatch ? signalOpMatch[1].trim() : "",
    contentGrade: gradeMatch ? gradeMatch[1] : "",
    contentGradeRationale: rationaleMatch ? rationaleMatch[1].trim() : "",
    priorityRecommendations: recommendations
  };
}

/**
 * Parse text into sections based on ALL CAPS headers
 */
export function parseIntoSections(text: string): ParsedSection[] {
  if (!text) return [{ title: "", content: ["No data"] }];
  const sections: ParsedSection[] = [];
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
}

/**
 * Parse personas from ICP research content
 * Has multiple fallback strategies for different AI output formats
 */
export function parsePersonas(content: string[]): ParsedPersona[] {
  const personas: ParsedPersona[] = [];
  const fullText = content.join(" ");

  // Try primary format: PERSONA:/GOAL:/JTBD:
  const chunks = fullText.split(/(?=PERSONA:)/i).filter(chunk => chunk.trim() && chunk.toLowerCase().includes('persona:'));

  chunks.forEach(chunk => {
    const persona: ParsedPersona = { title: "", goal: "", jtbd: "" };

    const titleMatch = chunk.match(/PERSONA:\s*([^]*?)(?=\s*GOAL:|JTBD:|$)/i);
    if (titleMatch) {
      let title = titleMatch[1].trim().replace(/\s+/g, ' ');
      title = title.split(/SIGNAL|BEHAVIORAL|TECHNOGRAPHIC|INTENT|CONTEXTUAL|BLIND|---/i)[0].trim();
      persona.title = title.length > 100 ? title.substring(0, 100) : title;
    }

    const goalMatch = chunk.match(/GOAL:\s*([^]*?)(?=\s*JTBD:|SIGNAL|$)/i);
    if (goalMatch) {
      const goal = goalMatch[1].trim().replace(/\s+/g, ' ');
      persona.goal = goal.length > 200 ? goal.substring(0, 200) + '...' : goal;
    }

    const jtbdMatch = chunk.match(/JTBD:\s*([^]*?)$/i);
    if (jtbdMatch) {
      let jtbd = jtbdMatch[1].trim();
      jtbd = jtbd.split(/PERSONA:|SIGNAL\s*SYSTEM|BEHAVIORAL\s*SIGNAL|TECHNOGRAPHIC|INTENT\s*SIGNAL|CONTEXTUAL|BLIND\s*SPOT|---/i)[0].trim();
      jtbd = jtbd.replace(/\s+/g, ' ');
      if (jtbd.length > 400) {
        const lastPeriod = jtbd.lastIndexOf('.', 400);
        jtbd = lastPeriod > 200 ? jtbd.substring(0, lastPeriod + 1) : jtbd.substring(0, 400) + '...';
      }
      persona.jtbd = jtbd;
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
}

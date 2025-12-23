// GTM OS Builder - TypeScript Type Definitions

// === API RESPONSE TYPES (JSON outputs from Claude) ===

/** JSON response from ICP discovery prompt */
export interface ICPDiscoveryResponse {
  idealCompanyProfile: {
    description: string;
    companyStage: string;
    companySize: string;
    industryVerticals: string[];
    keyCharacteristics: string[];
  };
  buyingCommittee: {
    role: string;
    type: 'Economic Buyer' | 'Champion' | 'Evaluator' | 'End User' | string;
    painTrigger: string;
    evaluationPriority: string;
  }[];
}

/** JSON response from product extraction prompt */
export interface ProductExtractionResponse {
  companyType: string;
  primaryOffering: string;
  additionalOfferings: string[];
}

/** JSON response from alpha signals prompt */
export interface AlphaSignalsResponse {
  signals: {
    name: string;
    whyAlpha: string;
    source: string;
    detection: string;
    motion: string;
    example: string;
  }[];
}

/** JSON response from pillar content prompt */
export interface PillarContentResponse {
  concepts: {
    title: string;
    angle: string;
    targetBuyer: string;
    dataFoundation: string;
    signalCapture: string;
    repurposing: string;
    cadence: string;
  }[];
}

/** JSON response from podcast guests prompt */
export interface PodcastGuestsResponse {
  guests: {
    archetype: string;
    guestType: string;
    profile: string;
    icpConnection: string;
    topic: string;
    strategicValue: string;
  }[];
}

/** JSON response from ICP research prompt */
export interface IcpResearchResponse {
  jobsToBeDone: {
    persona: string;
    jtbd: string;
  }[];
  signalSystem: {
    category: string;
    signalName: string;
    whatToDetect: string;
    recommendedMotion: string;
  }[];
  signalBlindSpot: string;
}

/** JSON response from competitive analysis prompt */
export interface CompetitiveAnalysisResponse {
  competitiveLandscape: string;
  competitors: {
    name: string;
    primaryStrength: string;
    primaryWeakness: string;
    battleground: string;
  }[];
  competitiveGaps: string;
  defensibilityAssessment: string;
}

/** JSON response from content strategy prompt */
export interface ContentStrategyResponse {
  contentFootprint: string;
  buyerAlignmentAudit: string;
  signalOpportunityAssessment: string;
  contentGrade: string;
  contentGradeRationale: string;
  priorityRecommendations: {
    rank: number;
    impact: string;
    title: string;
    explanation: string;
  }[];
}

// === STRUCTURED DATA TYPES (Schema-aligned) ===

export interface IdealCompanyProfile {
  companyStage: string;
  companySize: string;
  industryVerticals: string[];
  keyCharacteristics: string[];
  rawText: string;
}

export interface BuyingCommitteeMember {
  role: string;
  type: string;
  painTrigger: string;
  evaluationPriority: string;
}

export interface CompanyAnalysis {
  positioningSummary: string;
  painAddressed: string;
  positioningObservation: string;
}

export interface SignalSystemEntry {
  category: string;
  signalName: string;
  whatToDetect: string;
  recommendedMotion: string;
}

export interface JtbdEntry {
  persona: string;
  jtbd: string;
}

export interface IcpResearchData {
  jtbdList: JtbdEntry[];
  signalSystem: SignalSystemEntry[];
  signalBlindSpot: string;
}

export interface CompetitorComparison {
  competitor: string;
  primaryStrength: string;
  primaryWeakness: string;
  battleground: string;
}

export interface CompetitiveData {
  competitiveLandscape: string;
  competitorComparison: CompetitorComparison[];
  competitiveGaps: string;
  defensibilityAssessment: string;
}

export interface PriorityRecommendation {
  rank: number;
  impact: string;
  title: string;
  explanation: string;
}

export interface ContentStrategyData {
  contentFootprint: string;
  buyerAlignmentAudit: string;
  signalOpportunityAssessment: string;
  contentGrade: string;
  contentGradeRationale: string;
  priorityRecommendations: PriorityRecommendation[];
}

export interface DiscoveredICP {
  id: string;
  title: string;
  description: string;
}

export interface BackgroundData {
  websiteContent: string | null;
  companyPosts: string | null;
  ceoPosts: string | null;
  anysiteQuery: string | null;
}

export interface AlphaSignal {
  name: string;
  whyAlpha: string;
  source: string;
  detection: string;
  motion: string;
  example: string;
}

export interface PillarContent {
  title: string;
  angle: string;
  targetBuyer: string;
  dataFoundation: string;
  signalCapture: string;
  repurposing: string;
  cadence: string;
}

export interface PodcastGuest {
  archetype: string;
  guestType: string;
  profile: string;
  icpConnection: string;
  topic: string;
  strategicValue: string;
}

export interface ReportData {
  narrative: string;
  icp: string;
  content: string;
  competitive: string;
}

export interface ResearchPhase {
  initial: string;
  feedback: string;
  refined: string;
  loading: boolean;
}

export interface ResearchState {
  company: ResearchPhase;
  icp: ResearchPhase;
  competitive: ResearchPhase;
  content: ResearchPhase;
}

export interface Alignment {
  gtm?: string;
}

// Parsed section from AI responses
export interface ParsedSection {
  title: string;
  content: string[];
}

// Persona parsed from ICP research
export interface ParsedPersona {
  title: string;
  goal: string;
  jtbd: string;
}

// Signal vendor configuration
export interface SignalVendor {
  id: string;
  name: string;
  color: string;
}

// Signal type configuration
export interface SignalType {
  id: string;
  label: string;
  desc: string;
}

// Program element for value prop display
export interface ProgramElement {
  title: string;
  deliverable: string;
  icon: string;
}

// Loading stage for engagement during wait
export interface LoadingStage {
  icon: string;
  text: string;
  subtext: string;
}

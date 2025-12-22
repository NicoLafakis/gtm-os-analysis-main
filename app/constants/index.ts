// GTM OS Builder - Constants and Configuration

export const STORAGE_KEY = 'gtm-diagnostic-session';

// Loading stage messages for engagement during wait
export const loadingStages = [
  { icon: '🔍', text: 'Analyzing your website...', subtext: 'Extracting core value proposition' },
  { icon: '📊', text: 'Pulling LinkedIn insights...', subtext: 'Company and CEO thought leadership' },
  { icon: '🎯', text: 'Identifying ideal buyers...', subtext: 'Mapping personas and pain points' },
  { icon: '⚡', text: 'Discovering alpha signals...', subtext: 'Finding unique buying indicators' },
  { icon: '📝', text: 'Crafting your GTM OS...', subtext: 'Building your signal-driven system' },
];

// Rotating insights shown during loading
export const gtmInsights = [
  "Signal-based outreach sees 3x higher reply rates than generic sequences",
  "VOC programs generate 40% of the best-performing content ideas",
  "Companies using pillar content see 2x organic traffic growth",
  "Signal-driven sequences have 2x the meeting conversion rate",
  "The best GTM teams activate signals within 24 hours of detection",
  "Content built on aggregated signal data outperforms opinion pieces by 3x",
];

export const signalVendors = [
  { id: "clay", name: "Clay", color: "#FF6B35" },
  { id: "apollo", name: "Apollo", color: "#6366F1" },
  { id: "zoominfo", name: "ZoomInfo", color: "#00A4BD" },
  { id: "usergems", name: "UserGems", color: "#8B5CF6" },
  { id: "warmly", name: "Warmly", color: "#F97316" },
  { id: "commonroom", name: "Common Room", color: "#10B981" }
];

export const signalTypes = [
  { id: "job_changes", label: "Job Changes", desc: "Contact role changes" },
  { id: "funding", label: "Funding Events", desc: "Fundraising news" },
  { id: "tech_installs", label: "Tech Stack", desc: "Technology adoption" },
  { id: "intent_data", label: "Intent Data", desc: "Research behavior" },
  { id: "website_visitors", label: "Website Visitors", desc: "De-anonymized" }
];

// Wizard step order
// Note: competitive analysis runs in background during generation, not as a visible step
export const steps = [
  "intro",
  "contact-info",
  "select-product",
  "icp-selection",
  "research-company",
  "research-content",
  "signals-alignment",
  "generating",
  "results"
];

// Program elements structure for value prop display
export const programElements = {
  voc: { title: "Voice of Customer Program", deliverable: "25 ICP conversations", icon: "💬" },
  socialListening: { title: "Social Listening Program", deliverable: "50 new ICP connections/month", icon: "👂" },
  podcasts: { title: "ICP Podcast Program", deliverable: "4 podcast episodes", icon: "🎙️" },
  pillarContent: { title: "Pillar Content", deliverable: "Signal-based industry report", icon: "📊" },
  signalSequence: { title: "Signal-Based Sequences", deliverable: "Trigger-driven outreach", icon: "⚡" },
  hubspotEnablement: { title: "HubSpot Enablement", deliverable: "Automated sales workflows", icon: "🔧" },
};

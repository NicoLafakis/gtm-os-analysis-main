// GTM OS Builder - API Layer
// Pure functions for external API calls

/**
 * Model tier for cost/quality optimization
 * - haiku: Fast, cheap - extraction, refinement, simple tasks
 * - sonnet: Balanced - research, analysis (default)
 * - opus: Premium - synthesis, strategy, narrative generation
 */
export type ModelTier = 'haiku' | 'sonnet' | 'opus';

const MODEL_IDS: Record<ModelTier, string> = {
  haiku: 'claude-haiku-4-20250414',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-20250514'
};

interface CallClaudeOptions {
  model?: ModelTier;
  useWebSearch?: boolean;
  maxTokens?: number;
}

/**
 * Call Claude API via the proxy endpoint
 * @param prompt - The prompt to send
 * @param options - Configuration options
 * @param options.model - Model tier: 'haiku' (fast/cheap), 'sonnet' (balanced), 'opus' (premium)
 * @param options.useWebSearch - Whether to enable web search tool (default: true)
 * @param options.maxTokens - Max tokens for response (default: 4000, 8000 for opus)
 */
export async function callClaude(
  prompt: string,
  options: CallClaudeOptions = {}
): Promise<string> {
  const {
    model = 'sonnet',
    useWebSearch = true,
    maxTokens
  } = options;

  // Opus gets more tokens by default for comprehensive synthesis
  const defaultTokens = model === 'opus' ? 8000 : 4000;
  const tokens = maxTokens ?? defaultTokens;

  try {
    const finalPrompt = useWebSearch
      ? `Use your web_search tool to research this request. Search the web first, then provide your analysis.\n\n${prompt}`
      : prompt;

    const body: Record<string, unknown> = {
      model: MODEL_IDS[model],
      max_tokens: tokens,
      messages: [{ role: "user", content: finalPrompt }]
    };

    // Only add web search tool if enabled
    if (useWebSearch) {
      body.tools = [{ type: "web_search_20250305", name: "web_search" }];
    }

    const response = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
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
}

/**
 * Fetch LinkedIn data via Anysite MCP proxy
 */
export async function fetchLinkedInData(
  action: string,
  params: Record<string, unknown>
): Promise<{data: unknown; query: string | null}> {
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
}

/**
 * Sync data to HubSpot contact record
 * Returns the contact ID if created/found
 */
export async function syncHubSpotContact(
  email: string,
  properties: Record<string, string>,
  stepName?: string
): Promise<string | null> {
  if (!email) return null;

  try {
    const payload: Record<string, string> = { ...properties };
    if (stepName) {
      payload.gtmos_last_step = stepName;
    }

    const response = await fetch("/api/hubspot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objectType: "contacts",
        searchProperty: "email",
        searchValue: email,
        properties: payload
      })
    });

    if (!response.ok) {
      console.error("HubSpot sync failed:", await response.text());
      return null;
    }

    const result = await response.json();
    return result.id || null;
  } catch (e) {
    console.error("HubSpot sync error:", e);
    return null;
  }
}

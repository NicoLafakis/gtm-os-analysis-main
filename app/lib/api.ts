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
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-5-20250929',
  opus: 'claude-opus-4-5-20251101'
};

interface CallClaudeOptions {
  model?: ModelTier;
  useWebSearch?: boolean;
  maxTokens?: number;
}

interface CallClaudeJSONOptions<T> extends CallClaudeOptions {
  /** Schema description to help Claude understand the expected structure */
  schema?: string;
  /** Validation function to verify the parsed JSON matches expectations */
  validate?: (data: unknown) => data is T;
  /** Default value to return if parsing/validation fails */
  fallback?: T;
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
 * Call Claude API and parse JSON response
 * Returns typed, validated data - no text parsing needed
 *
 * @param prompt - The prompt (should request JSON output)
 * @param options - Configuration including validation
 * @returns Parsed and validated JSON data, or fallback/throws on failure
 */
export async function callClaudeJSON<T>(
  prompt: string,
  options: CallClaudeJSONOptions<T> = {}
): Promise<T> {
  const {
    model = 'sonnet',
    useWebSearch = true,
    maxTokens,
    schema,
    validate,
    fallback
  } = options;

  const defaultTokens = model === 'opus' ? 8000 : 4000;
  const tokens = maxTokens ?? defaultTokens;

  // Wrap prompt to enforce JSON output
  const jsonPrompt = `${prompt}

CRITICAL: Your response must be ONLY valid JSON. No markdown, no code blocks, no explanation.
Start directly with { or [ and end with } or ].
${schema ? `\nExpected schema:\n${schema}` : ''}`;

  const finalPrompt = useWebSearch
    ? `Use your web_search tool to research this request. Search the web first, then provide your analysis.\n\n${jsonPrompt}`
    : jsonPrompt;

  try {
    const body: Record<string, unknown> = {
      model: MODEL_IDS[model],
      max_tokens: tokens,
      messages: [{ role: "user", content: finalPrompt }]
    };

    if (useWebSearch) {
      body.tools = [{ type: "web_search_20250305", name: "web_search" }];
    }

    const response = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error("Claude API error:", response.status);
      if (fallback !== undefined) return fallback;
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      console.error("Claude error:", data.error);
      if (fallback !== undefined) return fallback;
      throw new Error(data.error.message || "Unknown error");
    }

    // Extract text content
    const textContent = (data.content || [])
      .filter((block: {type: string}) => block.type === "text")
      .map((block: {text: string}) => block.text)
      .join("");

    if (!textContent) {
      if (fallback !== undefined) return fallback;
      throw new Error("No response content");
    }

    // Clean up common issues: markdown code blocks, trailing content
    let jsonStr = textContent.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    // Find the JSON object/array boundaries
    const firstBrace = jsonStr.indexOf('{');
    const firstBracket = jsonStr.indexOf('[');
    const startIndex = firstBrace === -1 ? firstBracket :
                       firstBracket === -1 ? firstBrace :
                       Math.min(firstBrace, firstBracket);

    if (startIndex > 0) {
      jsonStr = jsonStr.slice(startIndex);
    }

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "\nContent:", jsonStr.substring(0, 500));
      if (fallback !== undefined) return fallback;
      throw new Error("Invalid JSON response");
    }

    // Validate if validator provided
    if (validate && !validate(parsed)) {
      console.error("JSON validation failed:", parsed);
      if (fallback !== undefined) return fallback;
      throw new Error("Response failed validation");
    }

    return parsed as T;
  } catch (error) {
    console.error("callClaudeJSON error:", error);
    if (fallback !== undefined) return fallback;
    throw error;
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

// GTM OS Builder - API Layer
// Pure functions for external API calls

/**
 * Call Claude API via the proxy endpoint
 * Uses web search tool for research-based prompts
 */
export async function callClaude(prompt: string): Promise<string> {
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

/**
 * Anysite MCP Integration
 *
 * Anysite uses Model Context Protocol (MCP) for communication.
 * This route wraps MCP calls for LinkedIn data extraction.
 *
 * Supported actions:
 * - companyPosts: Get company LinkedIn posts (last 30 days)
 * - personPosts: Get person/CEO LinkedIn posts (last 30 days)
 * - searchPeople: Search for ICP matches on LinkedIn
 * - generateQuery: Generate an Anysite query for manual use
 */

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || process.env.ANYSITE_MCP_URL;
const MCP_KEY = process.env.ANYSITE_MCP_KEY || process.env['Anysite MCP Key'];

// MCP JSON-RPC request helper
async function mcpCall(method, params = {}) {
  const response = await fetch(MCP_SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MCP_KEY}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'MCP call failed');
  }

  return data.result;
}

// Generate Anysite query string for user to use manually
function generateAnysiteQuery(params) {
  const { domain, icps = [], product } = params;

  // Build a query that the user can use in Anysite directly
  const queries = [];

  if (domain) {
    queries.push(`company:${domain}`);
  }

  if (icps.length > 0) {
    const icpQuery = icps.map(icp => `title:"${icp}"`).join(' OR ');
    queries.push(`(${icpQuery})`);
  }

  if (product) {
    queries.push(`content:"${product}"`);
  }

  return {
    query: queries.join(' AND '),
    filters: {
      timeframe: 'last_30_days',
      type: 'posts',
      hasEngagement: true
    },
    usage: 'Use this query in Anysite to find ICP LinkedIn activity'
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, params = {} } = req.body;

  if (!action) {
    return res.status(400).json({ error: 'action is required' });
  }

  // Check for MCP configuration
  if (!MCP_SERVER_URL || !MCP_KEY) {
    // If MCP not configured, return query for manual use
    if (action === 'generateQuery') {
      return res.status(200).json({
        success: true,
        data: generateAnysiteQuery(params),
        note: 'MCP not configured - use this query manually in Anysite'
      });
    }

    return res.status(503).json({
      error: 'Anysite MCP not configured',
      suggestion: 'Set ANYSITE_MCP_URL and ANYSITE_MCP_KEY environment variables',
      fallback: generateAnysiteQuery(params)
    });
  }

  try {
    let result;

    switch (action) {
      case 'companyPosts':
        // Get company LinkedIn posts from last 30 days
        result = await mcpCall('linkedin/company/posts', {
          domain: params.domain,
          companyName: params.companyName,
          days: params.days || 30,
          limit: params.limit || 20
        });
        break;

      case 'personPosts':
        // Get person (CEO/founder) LinkedIn posts
        result = await mcpCall('linkedin/person/posts', {
          name: params.name,
          company: params.company,
          title: params.title,
          days: params.days || 30,
          limit: params.limit || 20
        });
        break;

      case 'searchPeople':
        // Search for ICP matches on LinkedIn
        result = await mcpCall('linkedin/search/people', {
          titles: params.titles || [],
          industries: params.industries || [],
          companySize: params.companySize,
          keywords: params.keywords || [],
          limit: params.limit || 50
        });
        break;

      case 'companyInfo':
        // Get company information from LinkedIn
        result = await mcpCall('linkedin/company/info', {
          domain: params.domain,
          companyName: params.companyName
        });
        break;

      case 'generateQuery':
        // Generate query for manual use (always works, even without MCP)
        result = generateAnysiteQuery(params);
        break;

      default:
        return res.status(400).json({
          error: `Unknown action: ${action}`,
          supportedActions: ['companyPosts', 'personPosts', 'searchPeople', 'companyInfo', 'generateQuery']
        });
    }

    res.status(200).json({
      success: true,
      action,
      data: result
    });

  } catch (error) {
    // On MCP error, return fallback query
    res.status(500).json({
      error: error.message,
      fallback: generateAnysiteQuery(params),
      note: 'MCP call failed - use fallback query manually in Anysite'
    });
  }
}

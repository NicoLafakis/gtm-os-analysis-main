export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, action = 'scrape', options = {} } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  // Determine endpoint based on action
  const endpoints = {
    scrape: 'https://api.firecrawl.dev/v1/scrape',
    crawl: 'https://api.firecrawl.dev/v1/crawl',
    map: 'https://api.firecrawl.dev/v1/map'
  };

  const endpoint = endpoints[action] || endpoints.scrape;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify({
        url,
        formats: options.formats || ['markdown'],
        onlyMainContent: options.onlyMainContent !== false,
        waitFor: options.waitFor || 3000,
        timeout: options.timeout || 30000,
        ...options
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error || 'Firecrawl request failed',
        details: data
      });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// One-time setup endpoint to create GTM OS custom properties in HubSpot
// Run once via: POST /api/hubspot-setup

const PROPERTY_GROUP = {
  name: "gtmos_diagnostic",
  label: "GTM OS Diagnostic",
  displayOrder: 0
};

const CUSTOM_PROPERTIES = [
  // Basic Info
  { name: "gtmos_website_url", label: "GTM OS - Website URL", type: "string", fieldType: "text" },
  { name: "gtmos_role", label: "GTM OS - Role", type: "string", fieldType: "text" },
  { name: "gtmos_company_size", label: "GTM OS - Company Size", type: "string", fieldType: "text" },
  { name: "gtmos_crm", label: "GTM OS - CRM", type: "string", fieldType: "text" },
  { name: "gtmos_selected_product", label: "GTM OS - Selected Product", type: "string", fieldType: "text" },

  // Research Data
  { name: "gtmos_company_research", label: "GTM OS - Company Research", type: "string", fieldType: "textarea" },
  { name: "gtmos_icp_profile", label: "GTM OS - ICP Profile", type: "string", fieldType: "textarea" },
  { name: "gtmos_competitive_analysis", label: "GTM OS - Competitive Analysis", type: "string", fieldType: "textarea" },
  { name: "gtmos_content_strategy", label: "GTM OS - Content Strategy", type: "string", fieldType: "textarea" },

  // Signals
  { name: "gtmos_signal_vendors", label: "GTM OS - Signal Vendors", type: "string", fieldType: "text" },
  { name: "gtmos_signal_types", label: "GTM OS - Signal Types", type: "string", fieldType: "text" },
  { name: "gtmos_gtm_alignment", label: "GTM OS - GTM Alignment", type: "string", fieldType: "textarea" },

  // Final Report
  { name: "gtmos_report_narrative", label: "GTM OS - Report Narrative", type: "string", fieldType: "textarea" },
  { name: "gtmos_report_icp", label: "GTM OS - Report ICP", type: "string", fieldType: "textarea" },
  { name: "gtmos_report_content", label: "GTM OS - Report Content", type: "string", fieldType: "textarea" },
  { name: "gtmos_report_competitive", label: "GTM OS - Report Competitive", type: "string", fieldType: "textarea" },

  // Metadata
  { name: "gtmos_completed_at", label: "GTM OS - Completed At", type: "datetime", fieldType: "date" },
  { name: "gtmos_last_step", label: "GTM OS - Last Step", type: "string", fieldType: "text" }
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. POST to run setup.' });
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`
  };

  const results = { group: null, properties: [], errors: [] };

  try {
    // Step 1: Create property group
    const groupUrl = 'https://api.hubapi.com/crm/v3/properties/contacts/groups';

    const groupResponse = await fetch(groupUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(PROPERTY_GROUP)
    });

    if (groupResponse.ok) {
      results.group = { status: 'created', name: PROPERTY_GROUP.name };
    } else {
      const groupError = await groupResponse.json();
      if (groupError.message?.includes('already exists')) {
        results.group = { status: 'exists', name: PROPERTY_GROUP.name };
      } else {
        results.errors.push({ type: 'group', error: groupError.message });
      }
    }

    // Step 2: Create each property
    const propertyUrl = 'https://api.hubapi.com/crm/v3/properties/contacts';

    for (const prop of CUSTOM_PROPERTIES) {
      const propertyPayload = {
        name: prop.name,
        label: prop.label,
        type: prop.type,
        fieldType: prop.fieldType,
        groupName: PROPERTY_GROUP.name,
        formField: true
      };

      const propResponse = await fetch(propertyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(propertyPayload)
      });

      if (propResponse.ok) {
        results.properties.push({ name: prop.name, status: 'created' });
      } else {
        const propError = await propResponse.json();
        if (propError.message?.includes('already exists')) {
          results.properties.push({ name: prop.name, status: 'exists' });
        } else {
          results.errors.push({ property: prop.name, error: propError.message });
        }
      }
    }

    const successCount = results.properties.filter(p => p.status === 'created').length;
    const existsCount = results.properties.filter(p => p.status === 'exists').length;

    return res.status(200).json({
      success: true,
      message: `Setup complete. Created ${successCount} properties, ${existsCount} already existed.`,
      results
    });

  } catch (error) {
    console.error('HubSpot setup error:', error);
    return res.status(500).json({ error: error.message, results });
  }
}

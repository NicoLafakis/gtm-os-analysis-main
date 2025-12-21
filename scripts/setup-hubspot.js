const fs = require('fs');
const path = require('path');

// Load .env file
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/\r$/, '');
});

const TOKEN = envVars.HUBSPOT_ACCESS_TOKEN;
if (!TOKEN) { console.log('No HUBSPOT_ACCESS_TOKEN found in .env'); process.exit(1); }

const PROPERTY_GROUP = {
  name: 'gtmos_diagnostic',
  label: 'GTM OS Diagnostic',
  displayOrder: 0
};

const CUSTOM_PROPERTIES = [
  { name: 'gtmos_website_url', label: 'GTM OS - Website URL', type: 'string', fieldType: 'text' },
  { name: 'gtmos_role', label: 'GTM OS - Role', type: 'string', fieldType: 'text' },
  { name: 'gtmos_company_size', label: 'GTM OS - Company Size', type: 'string', fieldType: 'text' },
  { name: 'gtmos_crm', label: 'GTM OS - CRM', type: 'string', fieldType: 'text' },
  { name: 'gtmos_selected_product', label: 'GTM OS - Selected Product', type: 'string', fieldType: 'text' },
  { name: 'gtmos_company_research', label: 'GTM OS - Company Research', type: 'string', fieldType: 'textarea' },
  { name: 'gtmos_icp_profile', label: 'GTM OS - ICP Profile', type: 'string', fieldType: 'textarea' },
  { name: 'gtmos_competitive_analysis', label: 'GTM OS - Competitive Analysis', type: 'string', fieldType: 'textarea' },
  { name: 'gtmos_content_strategy', label: 'GTM OS - Content Strategy', type: 'string', fieldType: 'textarea' },
  { name: 'gtmos_signal_vendors', label: 'GTM OS - Signal Vendors', type: 'string', fieldType: 'text' },
  { name: 'gtmos_signal_types', label: 'GTM OS - Signal Types', type: 'string', fieldType: 'text' },
  { name: 'gtmos_gtm_alignment', label: 'GTM OS - GTM Alignment', type: 'string', fieldType: 'textarea' },
  { name: 'gtmos_report_narrative', label: 'GTM OS - Report Narrative', type: 'string', fieldType: 'textarea' },
  { name: 'gtmos_report_icp', label: 'GTM OS - Report ICP', type: 'string', fieldType: 'textarea' },
  { name: 'gtmos_report_content', label: 'GTM OS - Report Content', type: 'string', fieldType: 'textarea' },
  { name: 'gtmos_report_competitive', label: 'GTM OS - Report Competitive', type: 'string', fieldType: 'textarea' },
  { name: 'gtmos_completed_at', label: 'GTM OS - Completed At', type: 'datetime', fieldType: 'date' },
  { name: 'gtmos_last_step', label: 'GTM OS - Last Step', type: 'string', fieldType: 'text' }
];

async function setup() {
  const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN };

  // Create group
  console.log('Creating property group...');
  const groupRes = await fetch('https://api.hubapi.com/crm/v3/properties/contacts/groups', {
    method: 'POST', headers, body: JSON.stringify(PROPERTY_GROUP)
  });
  const groupData = await groupRes.json();
  if (groupRes.ok) console.log('✓ Group created: gtmos_diagnostic');
  else if (groupData.message?.includes('already exists')) console.log('✓ Group already exists: gtmos_diagnostic');
  else console.log('✗ Group error:', groupData.message);

  // Create properties
  let created = 0, existed = 0, errors = 0;
  for (const prop of CUSTOM_PROPERTIES) {
    const payload = { ...prop, groupName: PROPERTY_GROUP.name, formField: true };
    const res = await fetch('https://api.hubapi.com/crm/v3/properties/contacts', {
      method: 'POST', headers, body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) { created++; console.log('✓ Created:', prop.name); }
    else if (data.message?.includes('already exists')) { existed++; console.log('~ Exists:', prop.name); }
    else { errors++; console.log('✗ Error:', prop.name, '-', data.message); }
  }

  console.log('\nDone! Created:', created, '| Already existed:', existed, '| Errors:', errors);
}

setup().catch(e => console.error('Error:', e.message));

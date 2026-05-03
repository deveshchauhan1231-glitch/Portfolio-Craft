export async function deployToNetlify(zipBuffer, ownerName = 'portfolio') {
  if (!process.env.NETLIFY_AUTH_TOKEN) {
    const error = new Error('NETLIFY_AUTH_TOKEN is required for deployment');
    error.status = 400;
    throw error;
  }

  const site = await createSite(ownerName);
  const siteId = site.id;
  const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NETLIFY_AUTH_TOKEN}`,
      'Content-Type': 'application/zip'
    },
    body: zipBuffer
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error(`Netlify deploy failed: ${details}`);
    error.status = 502;
    throw error;
  }

  const deploy = await response.json();
  return {
    siteId,
    siteName: site.name,
    deployId: deploy.id,
    url: deploy.ssl_url || deploy.deploy_ssl_url || deploy.url
  };
}

async function createSite(ownerName) {
  const name = makeSiteName(ownerName);
  const response = await fetch('https://api.netlify.com/api/v1/sites', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NETLIFY_AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name })
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error(`Netlify site creation failed: ${details}`);
    error.status = 502;
    throw error;
  }

  const site = await response.json();
  return { id: site.id, name: site.name || name };
}

function makeSiteName(ownerName) {
  const slug = String(ownerName || 'portfolio')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 38) || 'portfolio';

  return `${slug}-portfolio-${Date.now().toString(36)}`;
}

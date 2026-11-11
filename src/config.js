/**
 * Startup configuration checks.
 *
 * The server refuses to start on missing or invalid configuration rather than
 * failing later, mid-operation, against the wrong site.
 */

// The value shipped in example.env; starting with it means .env was copied
// but never edited.
const PLACEHOLDER_HOSTS = new Set(['your-drupal-site.com']);

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * @param {Record<string, string|undefined>} env
 * @returns {string[]} One message per problem; empty when the config is valid.
 */
function validateConfig(env) {
  const errors = [];

  const baseUrl = (env.BASE_URL || '').trim();
  if (!baseUrl) {
    errors.push('BASE_URL is required. Create .env with `cp example.env .env` and set BASE_URL to your Drupal site.');
  } else if (!isHttpUrl(baseUrl)) {
    errors.push(`BASE_URL must be an http(s) URL, got "${baseUrl}".`);
  } else if (PLACEHOLDER_HOSTS.has(new URL(baseUrl).hostname)) {
    errors.push('BASE_URL is still the example.env placeholder. Set it to your Drupal site in .env.');
  }

  const loginUrl = (env.DEFAULT_LOGIN_URL || '').trim();
  if (loginUrl && !isHttpUrl(loginUrl)) {
    errors.push(`DEFAULT_LOGIN_URL must be an http(s) URL when set, got "${loginUrl}".`);
  }

  return errors;
}

module.exports = { validateConfig };

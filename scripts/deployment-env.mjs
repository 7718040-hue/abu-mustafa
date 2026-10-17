// Never include credential contents in diagnostics.
export function deploymentEnv(source) {
  const env = {...source};
  if (env.CLOUDFLARE_API_TOKEN !== undefined) {
    const token = env.CLOUDFLARE_API_TOKEN.trim();
    if (!token || /[^A-Za-z0-9_-]/.test(token)) {
      throw new Error('Cloudflare API token must contain only the token, on one line. Replace the preview environment secret; its value will not be logged.');
    }
    env.CLOUDFLARE_API_TOKEN = token;
  }
  return env;
}
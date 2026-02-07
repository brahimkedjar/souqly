export function getBaseUrl(req: any) {
  const envUrl = process.env.APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
}

import { isIP } from 'node:net';

const PUBLISHABLE_KEY_PATTERN = /^sb_publishable_[A-Za-z0-9_-]{20,}$/;
const SUPABASE_HOST_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.supabase\.co$/;
const PUBLIC_HOST_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const NON_PUBLIC_SUFFIXES = ['.internal', '.invalid', '.local', '.localhost', '.test'];

function isPublicDomainHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const labels = normalized.split('.');
  return (
    isIP(normalized) === 0 &&
    labels.length >= 2 &&
    labels.every((label) => PUBLIC_HOST_LABEL_PATTERN.test(label)) &&
    !NON_PUBLIC_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
  );
}

function requireHttpsUrl(name, rawValue) {
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    throw new Error(`${name} is missing.`);
  }

  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL.`);
  }

  if (
    parsed.protocol !== 'https:' ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(`${name} must be a credential-free HTTPS URL without a port, query, or fragment.`);
  }

  return parsed;
}

function validatePublicAccountConfig(environment) {
  const supabaseUrl = requireHttpsUrl(
    'EXPO_PUBLIC_SUPABASE_URL',
    environment.EXPO_PUBLIC_SUPABASE_URL,
  );
  if (
    !SUPABASE_HOST_PATTERN.test(supabaseUrl.hostname) ||
    (supabaseUrl.pathname !== '/' && supabaseUrl.pathname !== '')
  ) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL must be a Supabase project root URL.');
  }

  const publishableKey = environment.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (typeof publishableKey !== 'string' || !PUBLISHABLE_KEY_PATTERN.test(publishableKey)) {
    throw new Error('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a browser-safe publishable key.');
  }

  const privacyUrl = requireHttpsUrl(
    'EXPO_PUBLIC_ACCOUNT_PRIVACY_URL',
    environment.EXPO_PUBLIC_ACCOUNT_PRIVACY_URL,
  );
  if (!isPublicDomainHostname(privacyUrl.hostname)) {
    throw new Error('EXPO_PUBLIC_ACCOUNT_PRIVACY_URL must use a public HTTPS hostname.');
  }
}

try {
  validatePublicAccountConfig(process.env);
  console.log('Public account configuration validated.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Public account configuration is invalid.');
  process.exitCode = 1;
}

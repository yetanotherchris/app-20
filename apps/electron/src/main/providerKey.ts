import { validateSecret } from './secretKinds'

/**
 * Resolves the provider API key. The OPENROUTER_API_KEY environment variable
 * takes precedence over the stored secret when it passes the same validation as
 * an imported key; an absent, blank, or malformed value falls back to the store.
 */
export function resolveProviderKey(
  envValue: string | undefined,
  storedValue: string | null,
): string | null {
  if (envValue !== undefined) {
    const result = validateSecret('provider-key', envValue)
    if (result.ok) return result.value
  }
  return storedValue
}

/** True when either source can supply a provider key. */
export function hasProviderKey(envValue: string | undefined, storedValue: string | null): boolean {
  return resolveProviderKey(envValue, storedValue) !== null
}

/**
 * The provider API key can come from two sources. The OPENROUTER_API_KEY
 * environment variable takes precedence over the stored secret, so a developer
 * or a launcher can supply a key without importing one. The env value is
 * trimmed; a blank value is treated as absent. The stored value is returned
 * unchanged.
 */
export function resolveProviderKey(
  envValue: string | undefined,
  storedValue: string | null,
): string | null {
  const value = envValue?.trim()
  return value && value.length > 0 ? value : storedValue
}

/** S3 DNS-compatible bucket names: lowercase, 3-63 chars, no leading/trailing dot or dash. */
export const S3_BUCKET_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/
export const S3_REGION_PATTERN = /^[a-z0-9-]+$/

const DEFAULT_S3_REGION = 'us-east-1'

/**
 * The parsed S3 credential plus the bucket coordinates the sync engine needs.
 * It carries secret material, so it stays in main and never crosses the
 * preload boundary (spec 103 FR-005).
 */
export interface S3Config {
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  region: string
  endpoint?: string
}

export function isHttpUrl(value: string): boolean {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  return url.protocol === 'http:' || url.protocol === 'https:'
}

/**
 * Parses the stored `s3` plaintext and re-applies the field rules, so a value
 * that reached the file without passing the import validator cannot reshape the
 * S3 request target. Returns null when nothing is stored, the JSON is
 * unreadable, or no bucket is present, so sync reports disabled.
 */
export function parseS3Config(stored: string | null): S3Config | null {
  if (stored === null) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(stored)
  } catch {
    return null
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null

  const { accessKeyId, secretAccessKey, bucket, region, endpoint } = parsed as Record<
    string,
    unknown
  >
  if (typeof accessKeyId !== 'string' || accessKeyId.length === 0) return null
  if (typeof secretAccessKey !== 'string' || secretAccessKey.length === 0) return null
  if (typeof bucket !== 'string' || !S3_BUCKET_PATTERN.test(bucket)) return null

  const config: S3Config = {
    accessKeyId,
    secretAccessKey,
    bucket,
    region:
      typeof region === 'string' && S3_REGION_PATTERN.test(region) ? region : DEFAULT_S3_REGION,
  }
  if (endpoint !== undefined) {
    if (typeof endpoint !== 'string' || !isHttpUrl(endpoint)) return null
    config.endpoint = endpoint
  }
  return config
}

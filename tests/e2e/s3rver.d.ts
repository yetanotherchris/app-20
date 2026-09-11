declare module '@20minutes/s3rver' {
  interface S3rverBucketConfig {
    name: string
  }

  interface S3rverOptions {
    port?: number
    address?: string
    silent?: boolean
    directory?: string
    allowMismatchedSignatures?: boolean
    configureBuckets?: S3rverBucketConfig[]
  }

  interface S3rverAddress {
    address: string
    port: number
  }

  class S3rver {
    constructor(options?: S3rverOptions)
    run(): Promise<S3rverAddress>
    close(): Promise<void>
  }

  export default S3rver
}

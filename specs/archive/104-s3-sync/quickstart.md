# Quickstart: S3 Sync

Validate spec 104 locally against the in-repo, S3-compatible test server.

## Prerequisites

- `npm ci`
- A built Electron app: `npm run build:electron`

## Run the automated suites

```powershell
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

The e2e suite starts `@20minutes/s3rver` on a loopback port; no external service is required.

## Manual check against the test server

1. Start an S3-compatible server on a known port and create a bucket, for example with the package's CLI:

   ```powershell
   npx s3rver -d .\tmp-s3 --configure-bucket app20-test -p 9000
   ```

2. Create a credential file that names the bucket and points at the server:

   ```json
   {
     "accessKeyId": "S3RVER",
     "secretAccessKey": "S3RVER",
     "bucket": "app20-test",
     "region": "us-east-1",
     "endpoint": "http://127.0.0.1:9000"
   }
   ```

3. Launch the app with a scratch data directory, import the file through **File > Import S3 Credentials...**, save a conversation, and watch the top-bar sync status. The object appears under `conversations/` in the server's data directory.

4. Edit a conversation on a second profile that shares the bucket, start the app, and confirm the newer content is downloaded.

## Expected observable behavior

- With valid credentials and reachable bucket, saving shows `pending`, then `syncing`, then `Synced`.
- With no S3 credentials or no bucket, the status reads `Sync off` and the app works fully offline (FR-001).
- With an unreachable endpoint or rejected credentials, the status reads `Sync failed` after capped retries and local files are unchanged (SC-004).
- A corrupt or empty remote object is skipped and cannot block startup (FR-006).

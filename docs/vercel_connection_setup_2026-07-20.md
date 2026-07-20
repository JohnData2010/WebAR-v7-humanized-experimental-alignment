# Vercel Connection Setup

**Date:** 2026-07-20  
**Workspace:** `C:\Users\johnd\OneDrive - Deakin University\AR demo code`

## Current Local Link

This workspace already has a Vercel project link in `.vercel/project.json`.

```text
projectName = web-ar-version-21
projectId = prj_fDa2wB0gLIABZ1tt8vrfU89tSyU6
orgId = team_UOBbGwfapD4EFAgGKiE2jIze
```

The file `.vercel/` is intentionally ignored by Git and should not be committed.

## Current Deploy Config

The active `vercel.json` serves the static WebAR stimulus from `public/`.

```json
{
  "version": 2,
  "rewrites": [
    { "source": "/", "destination": "/index.html" },
    { "source": "/test-harness", "destination": "/test-harness.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "ALLOWALL" },
        { "key": "Content-Security-Policy", "value": "frame-ancestors *;" }
      ]
    }
  ]
}
```

## CLI Status

`vercel` is not installed globally in the current PATH.

A temporary Vercel CLI was installed outside the project at:

```text
C:\Users\johnd\AppData\Local\Temp\codex-vercel-cli
```

This did not change `package.json` or install dependencies inside the repository.

## Authentication Needed

The CLI could not complete `vercel whoami` because no usable non-interactive Vercel authentication was available in this session.

Use one of these two options before deployment:

```powershell
# Option A: interactive login on this machine
npx vercel login
```

```powershell
# Option B: temporary token for this shell only
$env:VERCEL_TOKEN = "your_vercel_token_here"
npx vercel whoami --token $env:VERCEL_TOKEN
```

Do not commit a Vercel token to the repository.

## Deployment Commands

After authentication:

```powershell
# Preview deployment
npx vercel --token $env:VERCEL_TOKEN
```

```powershell
# Production deployment
npx vercel --prod --token $env:VERCEL_TOKEN
```

If using interactive login instead of a token, omit the `--token` argument.

## Stop-Ship Gate After Deployment

After Vercel returns the final hosted URL, update:

```text
public/src/telemetryConfig.js
```

Specifically, set:

```javascript
allowedProductionParentOrigins: ["https://YOUR_QUALTRICS_OR_CUSTOM_DOMAIN"]
```

Use the Qualtrics parent origin, not the Vercel deployment URL. The WebAR source intentionally fails closed in production until this allowlist is configured.

## GitHub Route

GitHub is connected through the Codex GitHub plugin as account `JohnData2010`. If the Vercel project is configured in the Vercel dashboard to deploy from a GitHub repository, the clean route is:

1. Push the active WebAR source to the linked GitHub repository.
2. Let Vercel create a deployment from that GitHub push.
3. Capture the deployed URL and exact Qualtrics parent origin.
4. Update `allowedProductionParentOrigins`.
5. Run the 16-cell Qualtrics/WebAR export QA before participant pretest.

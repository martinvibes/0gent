# Cloudflare Email Routing setup for 0GENT

This folder contains the Worker that receives inbound mail to
`*@0gent.xyz` and forwards it to your backend's `/email/webhook` endpoint.

## One-time setup

1. **Buy `0gent.xyz`** on Namecheap (~$10/yr) — or any domain you control.
2. **Add the domain to Cloudflare** (free plan is fine).
   - Cloudflare → Add a site → enter `0gent.xyz`
   - Copy the two NS records and paste them at Namecheap → Domain → Nameservers
3. **Enable Email Routing** in Cloudflare:
   - Cloudflare dashboard → your domain → Email → Email Routing → Get started
   - It will auto-add the right MX + TXT records
   - Add a "Destination address" (your real email) and verify it
4. **Create the Worker**:
   - Cloudflare → Workers & Pages → Create application → Worker
   - Replace the default code with the contents of `email-worker.js`
   - Settings → Variables → Add the two secrets:
     - `BACKEND_URL` = `https://api.0gent.xyz` (your deployed backend)
     - `WEBHOOK_SECRET` = a long random string (also paste this in your backend `.env` as `EMAIL_WEBHOOK_SECRET`)
   - Save and deploy
5. **Bind the Worker as a catch-all route**:
   - Email Routing → Routing rules → Catch-all address
   - Action: "Send to a Worker"
   - Worker: pick `0gent-email-worker`
   - Save

That's it. Any email to `<anything>@0gent.xyz` now hits your backend.

## Backend env vars to set

```
EMAIL_DOMAIN=0gent.xyz
CLOUDFLARE_API_TOKEN=<scoped token with Email:Edit on the zone>
CLOUDFLARE_ZONE_ID=<from your domain overview page>
EMAIL_WEBHOOK_SECRET=<same value you put in the Worker>
```

If you skip the Worker entirely, outbound email still works via Resend —
inbound just won't be captured.

## Local testing without Cloudflare

You can simulate an inbound email by POSTing to the webhook directly:

```bash
curl -X POST http://localhost:3000/email/webhook \
  -H "Content-Type: application/json" \
  -H "X-0GENT-Webhook-Secret: $EMAIL_WEBHOOK_SECRET" \
  -d '{
    "from": "alice@example.com",
    "to": "flow4@0gent.xyz",
    "subject": "hi",
    "text": "Hello agent!"
  }'
```

The backend will store the message in `email_messages`, visible via
`GET /email/<inboxId>/inbox`.

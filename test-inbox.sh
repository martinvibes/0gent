#!/bin/bash
# Read a prod inbox via the SDK. Usage:
#   INBOX=<inbox-id> bash test-inbox.sh
# or just: bash test-inbox.sh   (will use the last test inbox)

set -e
cd "$(dirname "$0")"
[ -f .env ] && set -a && source .env && set +a

INBOX=${INBOX:-$(cat /tmp/0gent-test-inbox.txt 2>/dev/null)}
if [ -z "$INBOX" ]; then
  echo "Usage: INBOX=<inbox-id> bash test-inbox.sh"
  exit 1
fi

node -e "
import('/Users/admin/.pg/0GENT/packages/core/dist/sdk.js').then(async ({ ZeroGent }) => {
  const z = new ZeroGent({
    privateKey: process.env.DEPLOYER_PRIVATE_KEY,
    api: 'https://api.0gent.xyz',
    onPaymentStatus: m => console.log('  [x402]', m),
  });
  console.log('  Reading inbox $INBOX (paid: 0.02 0G)...');
  const messages = await z.emailRead('$INBOX');
  console.log();
  console.log('  ' + messages.length + ' message(s) in inbox:');
  console.log();
  for (const m of messages) {
    const arrow = m.direction === 'inbound' ? '←' : '→';
    console.log('  ' + arrow + ' [' + m.direction + ']  ' + m.from + ' → ' + m.to);
    console.log('     subject: ' + m.subject);
    console.log('     time:    ' + m.timestamp);
    const display = (m.body && m.body.trim()) ? m.body : '(no plaintext body — likely HTML-only — see /email/<id>/inbox)';
    console.log('     body:    ' + display.slice(0, 200).replace(/\n/g, ' ⏎ '));
    console.log();
  }

  const inbound = messages.filter(m => m.direction === 'inbound');
  if (inbound.length > 0) {
    console.log('  ✅ INBOUND WORKING — ' + inbound.length + ' replies received via webhook');
  } else {
    console.log('  ⚠ No inbound replies yet.');
    console.log('    - Did you reply to the email yet?');
    console.log('    - Resend may take ~30 seconds to forward.');
    console.log('    - Check Resend → Webhooks → your endpoint shows recent deliveries with 200');
    console.log('    - If Resend shows 401, EMAIL_WEBHOOK_SECRET on Railway != ?secret= in webhook URL');
  }
});
"

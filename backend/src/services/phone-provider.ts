/**
 * Phone-provider dispatcher.
 *
 * Selection precedence (first match wins):
 *   1. PHONE_PROVIDER env var explicitly set to "twilio" or "telnyx"
 *   2. TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN both present → twilio
 *   3. TELNYX_API_KEY present → telnyx
 *   4. Otherwise → throws on first call with a clear "no provider configured" hint
 *
 * Both implementations export the same surface (searchNumbers, provisionNumber,
 * sendSms, getLogs) so the route layer doesn't care which one is active.
 */

import { config } from "../config";
import * as telnyx from "./phone";
import * as twilio from "./phone-twilio";

type PhoneService = typeof telnyx;

function resolveProvider(): { name: "twilio" | "telnyx"; service: PhoneService } {
  const explicit = (process.env.PHONE_PROVIDER || "").toLowerCase();
  if (explicit === "twilio") return { name: "twilio", service: twilio };
  if (explicit === "telnyx") return { name: "telnyx", service: telnyx };

  if (config.twilioAccountSid && config.twilioAuthToken) {
    return { name: "twilio", service: twilio };
  }
  if (config.telnyxApiKey) {
    return { name: "telnyx", service: telnyx };
  }
  // Fall back to twilio so callers get a clear "Twilio creds missing" error
  // rather than silently picking telnyx and surfacing a different one.
  return { name: "twilio", service: twilio };
}

let _resolved: ReturnType<typeof resolveProvider> | null = null;

export function active(): { name: "twilio" | "telnyx"; service: PhoneService } {
  if (!_resolved) _resolved = resolveProvider();
  return _resolved;
}

// ─── Forward exports — same signatures as ./phone (Telnyx) & ./phone-twilio ───

export const searchNumbers: PhoneService["searchNumbers"] = (...args) =>
  active().service.searchNumbers(...args);

export const provisionNumber: PhoneService["provisionNumber"] = (...args) =>
  active().service.provisionNumber(...args);

export const sendSms: PhoneService["sendSms"] = (...args) =>
  active().service.sendSms(...args);

export const getLogs: PhoneService["getLogs"] = (...args) =>
  active().service.getLogs(...args);

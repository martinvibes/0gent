import { Router, Response, Request, NextFunction } from "express";
import { x402, AuthenticatedRequest } from "../middleware/x402";
import { config } from "../config";
import * as phoneService from "../services/phone-provider";
import { registerResourceOnChain } from "../services/chain";
import { SUPPORTED_COUNTRIES, resolveCountry, suggestCountry } from "../services/phone-countries";
import { db } from "../db";

const router = Router();

// Free — reports which provider is wired and whether it's credentialed.
router.get("/status", (_req: Request, res: Response) => {
  const active = phoneService.active();
  const ready =
    (active.name === "twilio" && !!config.twilioAccountSid && !!config.twilioAuthToken) ||
    (active.name === "telnyx" && !!config.telnyxApiKey);
  res.json({
    provider: active.name,
    ready,
    capabilities: {
      search: ready,
      provision: ready, // may still fail on a trial Twilio account; clear error returned
      sms: ready,       // trial Twilio limited to verified destinations
    },
  });
});

// Free — list of curated supported countries with names. Useful as an
// inventory hint for clients that want to surface a picker.
router.get("/countries", (_req: Request, res: Response) => {
  res.json({
    countries: SUPPORTED_COUNTRIES,
    count: SUPPORTED_COUNTRIES.length,
    note:
      "These are 50 curated picks. Twilio supports 170+ countries total — " +
      "pass any ISO 3166-1 alpha-2 code (e.g. SE, KE, NG) to /phone/search to try, " +
      "even if it isn't on this list. Coverage shifts; not every country has " +
      "live inventory at every moment.",
    curated: true,
    twilioCoverageHint: "https://www.twilio.com/en-us/guidelines/regulatory",
  });
});

router.get("/search", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawCountry = (req.query.country as string) || "US";
    const areaCode = req.query.areaCode as string | undefined;

    // Resolve aliases (UK→GB, USA→US, full names like "United Kingdom").
    // Any unrecognised *2-letter* input is passed through to Twilio — they
    // support 170+ countries; our 50 is just a curated picker hint.
    const resolved = resolveCountry(rawCountry);
    if (!resolved) {
      const hint = suggestCountry(rawCountry);
      res.status(400).json({
        error: `Country "${rawCountry}" doesn't look like a valid ISO 3166-1 alpha-2 code.`,
        suggestion: hint ? { code: hint.code, name: hint.name } : null,
        hint: 'Call GET /phone/countries for 50 curated picks, or pass any 2-letter ISO code to try Twilio inventory directly.',
      });
      return;
    }

    const numbers = await phoneService.searchNumbers(resolved.code, { areaCode });
    res.json({
      numbers,
      country: {
        code: resolved.code,
        name: resolved.name,
        curated: resolved.knownInList,
      },
      provider: phoneService.active().name,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Provision pre-flight — runs BEFORE x402. Catches malformed E.164 input
// when the agent picked a specific number to buy. Without this, the agent
// pays 0.5 0G then Twilio 400s, which is unfair UX.
function provisionPreflight(req: Request, res: Response, next: NextFunction): void {
  const phoneNumber = req.body?.phoneNumber;
  if (phoneNumber !== undefined && phoneNumber !== null && phoneNumber !== "") {
    if (typeof phoneNumber !== "string" || !/^\+[1-9]\d{6,14}$/.test(phoneNumber)) {
      res.status(400).json({
        error: `phoneNumber must be a valid E.164 number, e.g. +14155550100. Got: "${String(phoneNumber).slice(0, 32)}"`,
        code: "BAD_E164",
      });
      return;
    }
  }
  next();
}

router.post(
  "/provision",
  provisionPreflight,
  x402(config.pricePhoneProvision, "phone"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payer = req.payment!.payer;
      const country = req.body.country || "US";
      const areaCode = req.body.areaCode;
      const phoneNumber: string | undefined = req.body.phoneNumber || undefined;

      const phone = await phoneService.provisionNumber(country, payer, areaCode, phoneNumber);
      const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const resourceId = await registerResourceOnChain(payer, 0, phone.phoneNumber, expiresAt);

      res.json({ ...phone, resourceId, expiresAt: new Date(expiresAt * 1000).toISOString(), message: "Phone number provisioned and registered on 0G Chain" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// SMS pre-flight — runs BEFORE x402 so users aren't charged for messages we
// can already tell will fail (missing fields, To==From, malformed E.164, etc.).
// Twilio's other restrictions (trial-account region locks, unverified caller IDs)
// can't be checked locally, so those still cost the agent the SMS fee. Agents
// using a paid Twilio account won't hit those.
function smsPreflight(req: Request, res: Response, next: NextFunction): void {
  const { to, body } = req.body || {};
  if (!to || typeof to !== "string") {
    res.status(400).json({ error: "'to' is required (E.164 format, e.g. +14155550100)", code: "MISSING_TO" });
    return;
  }
  if (!body || typeof body !== "string" || body.length === 0) {
    res.status(400).json({ error: "'body' is required (non-empty string)", code: "MISSING_BODY" });
    return;
  }
  if (!/^\+[1-9]\d{6,14}$/.test(to)) {
    res.status(400).json({
      error: `'to' must be a valid E.164 number, e.g. +14155550100. Got: "${to.slice(0, 32)}"`,
      code: "BAD_E164",
    });
    return;
  }
  const id = String(req.params.id || "");
  const row = db.prepare("SELECT phone_number FROM phone_numbers WHERE id = ?").get(id) as any;
  if (!row) {
    res.status(404).json({ error: "phone number not found", code: "PHONE_NOT_FOUND" });
    return;
  }
  if (row.phone_number === to) {
    res.status(400).json({
      error: "Cannot send SMS from a number to itself. Pick a different 'to' number.",
      code: "TO_EQUALS_FROM",
      from: row.phone_number,
    });
    return;
  }
  next();
}

router.post(
  "/:id/sms",
  smsPreflight,
  x402(config.priceSmsSend, "sms"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payer = req.payment!.payer;
      const msg = await phoneService.sendSms(String(req.params.id), String(req.body.to), String(req.body.body), payer);
      res.json(msg);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get("/:id/logs", async (req: AuthenticatedRequest, res: Response) => {
  // /phone/status is the only sub-route that takes precedence over /:id, so guard
  // any future "magic" path values that could collide with phone-IDs.
  if (req.params.id === "status") { res.status(404).end(); return; }
  try {
    const owner = req.query.owner as string;
    if (!owner) { res.status(400).json({ error: "owner query param required" }); return; }
    const logs = phoneService.getLogs(String(req.params.id), owner);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import { Router, Response, Request } from "express";
import { x402, AuthenticatedRequest } from "../middleware/x402";
import { config } from "../config";
import * as phoneService from "../services/phone-provider";
import { registerResourceOnChain } from "../services/chain";

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

router.get("/search", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const country = (req.query.country as string) || "US";
    const areaCode = req.query.areaCode as string | undefined;
    const numbers = await phoneService.searchNumbers(country, { areaCode });
    res.json({ numbers, provider: phoneService.active().name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  "/provision",
  x402(config.pricePhoneProvision, "phone"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payer = req.payment!.payer;
      const country = req.body.country || "US";
      const areaCode = req.body.areaCode;

      const phone = await phoneService.provisionNumber(country, payer, areaCode);
      const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const resourceId = await registerResourceOnChain(payer, 0, phone.phoneNumber, expiresAt);

      res.json({ ...phone, resourceId, expiresAt: new Date(expiresAt * 1000).toISOString(), message: "Phone number provisioned and registered on 0G Chain" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  "/:id/sms",
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

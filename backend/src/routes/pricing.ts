import { Router, Response } from "express";
import { config } from "../config";

const router = Router();

router.get("/", (_req, res: Response) => {
  res.json({
    currency: "0G",
    network: `0G Chain (${config.zgChainId})`,
    services: {
      identity: { mint: config.priceIdentityMint },
      phone: {
        provision: config.pricePhoneProvision,
        sms: config.priceSmsSend,
      },
      email: {
        provision: config.priceEmailProvision,
        send: config.priceEmailSend,
        read: config.priceEmailRead,
        threads: config.priceEmailRead,
      },
      compute: {
        provision: config.priceComputeProvision,
        infer: config.priceComputeInfer,
      },
      domain: { register: config.priceDomainRegister },
      memory: { read: "free", write: "free" },
    },
  });
});

export default router;

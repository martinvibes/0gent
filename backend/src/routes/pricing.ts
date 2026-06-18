import { Router, Request, Response } from "express";
import { config } from "../config";
import { getChain, getAllChains } from "../chains";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  const chainId = (req.query.chain as string) || "0g";
  const supportedChains = getAllChains().map((c) => c.id);

  // Unknown chain — return 400
  let chain;
  try {
    chain = getChain(chainId);
  } catch {
    res.status(400).json({ error: `Unknown chain: ${chainId}. Supported: ${supportedChains.join(", ")}` });
    return;
  }

  // 0G: preserve existing response shape (prices from config env vars, extra fields like domain/compute.provision)
  if (chainId === "0g") {
    res.json({
      chain: "0g",
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
      supportedChains,
    });
    return;
  }

  // Other chains: pull prices from chain config
  res.json({
    chain: chain.id,
    currency: chain.currency,
    network: `${chain.name} (${chain.chainId})`,
    services: {
      identity: { mint: chain.pricing.identity },
      email: {
        provision: chain.pricing.emailProvision,
        send: chain.pricing.emailSend,
        read: chain.pricing.emailRead,
        threads: chain.pricing.emailRead,
      },
      phone: {
        provision: chain.pricing.phoneProvision,
        sms: chain.pricing.smsSend,
      },
      compute: {
        infer: chain.pricing.computeInfer,
      },
      memory: { read: "free", write: "free" },
    },
    supportedChains,
  });
});

export default router;

import { Router, Request, Response } from "express";
import { getChain, getAllChains } from "../chains";

const router = Router();

function chainPricing(chain: ReturnType<typeof getChain>) {
  return {
    chain: chain.id,
    currency: chain.currency,
    network: `${chain.name} (${chain.chainId})`,
    services: {
      identity: { mint: chain.pricing.identity },
      email: {
        provision: chain.pricing.emailProvision,
        send: chain.pricing.emailSend,
        read: chain.pricing.emailRead,
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
  };
}

router.get("/", (req: Request, res: Response) => {
  const chainId = req.query.chain as string | undefined;
  const allChains = getAllChains();

  if (!chainId) {
    res.json({
      chains: allChains.map((c) => chainPricing(c)),
    });
    return;
  }

  let chain;
  try {
    chain = getChain(chainId);
  } catch {
    res.status(400).json({
      error: `Unknown chain: ${chainId}. Supported: ${allChains.map((c) => c.id).join(", ")}`,
    });
    return;
  }

  res.json(chainPricing(chain));
});

export default router;

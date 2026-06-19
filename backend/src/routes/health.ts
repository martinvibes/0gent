import { Router } from "express";
import { config } from "../config";
import { getAllChains } from "../chains";

const router = Router();

router.get("/", (_req, res) => {
  const chains = getAllChains().map((c) => ({
    id: c.id,
    name: c.name,
    chainId: c.chainId,
    rpc: c.rpc,
    currency: c.currency,
    paymentType: c.paymentType,
    contracts: {
      payment: c.paymentContract,
      registry: c.registryContract,
      identity: c.identityContract,
    },
    ...(c.paymentToken ? { paymentToken: c.paymentToken } : {}),
  }));

  res.json({
    status: "ok",
    service: "0GENT",
    version: "0.3.0",
    chains,
    storage: {
      indexer: config.zgStorageIndexerUrl,
      flowContract: config.zgStorageFlowContract,
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;

import { Router } from "express";
import { config } from "../config";
import { getAllChains } from "../chains";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "0GENT",
    version: "0.2.5",
    chain: {
      name: "0G Chain",
      chainId: config.zgChainId,
      rpc: config.zgRpcUrl,
    },
    contracts: {
      payment: config.paymentContractAddress || "not deployed",
      registry: config.registryContractAddress || "not deployed",
      identity: config.identityContractAddress || "not deployed",
    },
    storage: {
      indexer: config.zgStorageIndexerUrl,
      flowContract: config.zgStorageFlowContract,
    },
    supportedChains: getAllChains().map((c) => c.id),
    timestamp: new Date().toISOString(),
  });
});

export default router;

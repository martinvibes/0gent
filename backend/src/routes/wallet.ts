import { Router, Response, Request } from "express";
import { ethers } from "ethers";
import { config } from "../config";
import { getProvider } from "../services/chain";

const router = Router();

/**
 * Generate a fresh BIP-39 HD wallet. The server NEVER persists the secret —
 * it's returned to the caller once and forgotten. The caller is responsible
 * for storing the mnemonic + private key safely.
 */
router.post("/create", async (req: Request, res: Response) => {
  try {
    const wallet = ethers.Wallet.createRandom();
    const name =
      typeof req.body?.name === "string" && req.body.name.trim()
        ? req.body.name.trim().slice(0, 64)
        : `agent-${Math.random().toString(36).slice(2, 8)}`;

    res.json({
      name,
      address: wallet.address,
      mnemonic: wallet.mnemonic?.phrase ?? null,
      privateKey: wallet.privateKey,
      createdAt: new Date().toISOString(),
      chain: {
        chainId: config.zgChainId,
        rpc: config.zgRpcUrl,
      },
      explorer: `https://chainscan-galileo.0g.ai/address/${wallet.address}`,
      faucet: "https://faucet.0g.ai",
      note: "This is the only time the mnemonic and private key will be returned. Store them safely.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Read 0G balance for any address. Public, free, no auth.
 */
router.get("/:address/balance", async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    if (!ethers.isAddress(address)) {
      res.status(400).json({ error: "Invalid address" });
      return;
    }

    const provider = getProvider();
    const balance = await provider.getBalance(address);

    res.json({
      address,
      balance: balance.toString(),
      balance0G: ethers.formatEther(balance),
      chainId: config.zgChainId,
      explorer: `https://chainscan-galileo.0g.ai/address/${address}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

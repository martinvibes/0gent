import { Request, Response, NextFunction } from "express";
import { verifyPayment } from "../services/chain";
import { getChain, type ChainConfig } from "../chains";
import { db } from "../db";
import { ethers } from "ethers";
import crypto from "crypto";

export interface PaymentInfo {
  txHash: string;
  payer: string;
  amount: bigint;
  nonce: string;
  verifiedAt: number;
  chain: string;
}

export interface AuthenticatedRequest extends Request {
  payment?: PaymentInfo;
}

function build402Response(req: Request, price: string, resourceType: string, chainConfig: ChainConfig) {
  const nonce = "0x" + crypto.randomBytes(32).toString("hex");

  if (chainConfig.paymentType === "erc20") {
    const amountUnits = ethers.parseUnits(price, chainConfig.paymentDecimals).toString();
    return {
      x402Version: 1,
      network: `eip155:${chainConfig.chainId}`,
      description: `0GENT: ${req.method} ${req.originalUrl}`,
      payment: {
        contract: chainConfig.paymentContract,
        function: "pay(bytes32,string,uint256)",
        args: { nonce, resourceType, amount: amountUnits },
        value: "0",
        token: chainConfig.paymentToken,
        tokenSymbol: chainConfig.currency,
        tokenDecimals: chainConfig.paymentDecimals,
      },
      nonce,
      amountHuman: `${price} ${chainConfig.currency}`,
    };
  }

  // Native payment (default, 0G)
  const amountWei = ethers.parseEther(price).toString();
  return {
    x402Version: 1,
    network: `eip155:${chainConfig.chainId}`,
    description: `0GENT: ${req.method} ${req.originalUrl}`,
    payment: {
      contract: chainConfig.paymentContract,
      function: "pay(bytes32,string)",
      args: { nonce, resourceType },
      value: amountWei,
      token: "native",
      tokenSymbol: chainConfig.currency,
    },
    nonce,
    amountHuman: `${price} ${chainConfig.currency}`,
  };
}

const RESOURCE_PRICING_MAP: Record<string, keyof ChainConfig["pricing"]> = {
  identity: "identity",
  email: "emailProvision",
  "email-send": "emailSend",
  "email-read": "emailRead",
  "email-threads": "emailRead",
  phone: "phoneProvision",
  sms: "smsSend",
  "compute-infer": "computeInfer",
};

function resolvePrice(literalPrice: string, resourceType: string, chainConfig: ChainConfig): string {
  if (chainConfig.id !== "0g") {
    const key = RESOURCE_PRICING_MAP[resourceType];
    if (key) return chainConfig.pricing[key];
  }
  return literalPrice;
}

export function x402(priceInZG: string, resourceType: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Determine chain from header, query param, or default to "0g"
    const chainId = (
      (req.headers["x-chain"] as string | undefined) ||
      (req.query.chain as string | undefined) ||
      "0g"
    );

    let chainConfig: ChainConfig;
    try {
      chainConfig = getChain(chainId);
    } catch {
      res.status(400).json({ error: `Unknown chain: ${chainId}` });
      return;
    }

    const price = resolvePrice(priceInZG, resourceType, chainConfig);

    const paymentHeader = (req.headers["x-payment"] || req.headers["payment-signature"]) as string | undefined;

    if (!paymentHeader) {
      const paymentRequired = build402Response(req, price, resourceType, chainConfig);
      res.status(402).json({
        error: "Payment Required",
        message: `This endpoint costs ${price} ${chainConfig.currency} tokens. Send payment to the contract and include the tx hash in the X-Payment header.`,
        ...paymentRequired,
      });
      return;
    }

    try {
      let paymentData: { txHash: string; nonce: string; chain?: string };
      try {
        paymentData = JSON.parse(paymentHeader);
      } catch {
        paymentData = {
          txHash: paymentHeader,
          nonce: req.body?.nonce || "",
        };
      }

      if (!paymentData.txHash || !paymentData.nonce) {
        res.status(400).json({ error: "Payment header must include txHash and nonce" });
        return;
      }

      const existing = db.prepare("SELECT nonce FROM used_payments WHERE nonce = ?").get(paymentData.nonce);
      if (existing) {
        res.status(400).json({ error: "Payment nonce already used (replay detected)" });
        return;
      }

      const minAmount =
        chainConfig.paymentType === "erc20"
          ? ethers.parseUnits(price, chainConfig.paymentDecimals)
          : ethers.parseEther(price);

      const result = await verifyPayment(paymentData.txHash, paymentData.nonce, minAmount, chainConfig);

      if (!result.valid) {
        res.status(402).json({
          error: "Payment verification failed",
          reason: result.reason,
          ...build402Response(req, price, resourceType, chainConfig),
        });
        return;
      }

      db.prepare(
        "INSERT INTO used_payments (nonce, payer, amount, tx_hash, endpoint, verified_at, chain) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(
        paymentData.nonce,
        result.payer,
        result.amount.toString(),
        paymentData.txHash,
        req.originalUrl,
        new Date().toISOString(),
        chainConfig.id
      );

      req.payment = {
        txHash: paymentData.txHash,
        payer: result.payer,
        amount: result.amount,
        nonce: paymentData.nonce,
        verifiedAt: Date.now(),
        chain: chainConfig.id,
      };

      next();
    } catch (err) {
      console.error("[x402] Error:", err);
      res.status(500).json({
        error: "Payment verification failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };
}

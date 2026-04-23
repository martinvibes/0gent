import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { verifyPayment } from "../services/chain";
import { db } from "../db";
import { ethers } from "ethers";
import crypto from "crypto";

export interface PaymentInfo {
  txHash: string;
  payer: string;
  amount: bigint;
  nonce: string;
  verifiedAt: number;
}

export interface AuthenticatedRequest extends Request {
  payment?: PaymentInfo;
}

function build402Response(req: Request, priceInZG: string, resourceType: string) {
  const nonce = "0x" + crypto.randomBytes(32).toString("hex");
  const amountWei = ethers.parseEther(priceInZG).toString();

  return {
    x402Version: 1,
    network: `eip155:${config.zgChainId}`,
    description: `0GENT: ${req.method} ${req.originalUrl}`,
    payment: {
      contract: config.paymentContractAddress,
      function: "pay(bytes32,string)",
      args: { nonce, resourceType },
      value: amountWei,
      token: "native",
      tokenSymbol: "0G",
    },
    nonce,
    amountHuman: `${priceInZG} 0G`,
  };
}

export function x402(priceInZG: string, resourceType: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const paymentHeader = (req.headers["x-payment"] || req.headers["payment-signature"]) as string | undefined;

    if (!paymentHeader) {
      const paymentRequired = build402Response(req, priceInZG, resourceType);
      res.status(402).json({
        error: "Payment Required",
        message: `This endpoint costs ${priceInZG} 0G tokens. Send payment to the contract and include the tx hash in the X-Payment header.`,
        ...paymentRequired,
      });
      return;
    }

    try {
      let paymentData: { txHash: string; nonce: string };
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

      const minAmount = ethers.parseEther(priceInZG);
      const result = await verifyPayment(paymentData.txHash, paymentData.nonce, minAmount);

      if (!result.valid) {
        res.status(402).json({
          error: "Payment verification failed",
          reason: result.reason,
          ...build402Response(req, priceInZG, resourceType),
        });
        return;
      }

      db.prepare(
        "INSERT INTO used_payments (nonce, payer, amount, tx_hash, endpoint, verified_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(
        paymentData.nonce,
        result.payer,
        result.amount.toString(),
        paymentData.txHash,
        req.originalUrl,
        new Date().toISOString()
      );

      req.payment = {
        txHash: paymentData.txHash,
        payer: result.payer,
        amount: result.amount,
        nonce: paymentData.nonce,
        verifiedAt: Date.now(),
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

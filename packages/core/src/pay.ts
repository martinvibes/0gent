/**
 * 0GENT x402 payment client.
 * Flow: call endpoint → get 402 → send 0G token payment on-chain → retry with X-Payment header.
 */
import { Wallet, parseEther, formatEther } from 'ethers';
import { getPaymentContract } from './chain.js';

export interface PaymentRequired {
  x402Version: number;
  network: string;
  description: string;
  payment: {
    contract: string;
    function: string;
    args: { nonce: string; resourceType: string };
    value: string;
    token: string;
    tokenSymbol: string;
  };
  nonce: string;
  amountHuman: string;
}

export interface PaidResponse<T = any> {
  data: T;
  paid: boolean;
  txHash?: string;
  nonce?: string;
}

export interface PaidRequestOpts {
  api: string;
  method: string;
  path: string;
  body?: object;
  signer: Wallet;
  onStatus?: (status: string) => void;
}

async function doFetch(url: string, init: RequestInit): Promise<{ status: number; body: any }> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {}
  return { status: res.status, body };
}

export async function paidRequest<T = any>(opts: PaidRequestOpts): Promise<PaidResponse<T>> {
  const { api, method, path, body, signer, onStatus } = opts;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const init: RequestInit = { method, headers };
  if (body && method !== 'GET' && method !== 'HEAD') {
    init.body = JSON.stringify(body);
  }

  // 1) First request
  const first = await doFetch(api + path, init);

  if (first.status !== 402) {
    if (first.status >= 400) {
      const msg = first.body?.error || first.body?.message || `HTTP ${first.status}`;
      throw new Error(msg);
    }
    return { data: first.body as T, paid: false };
  }

  // 2) Parse payment requirements
  const req = first.body as PaymentRequired;
  if (!req.payment?.contract || !req.nonce) {
    throw new Error('Malformed 402 response: missing payment instructions');
  }
  const amountWei = BigInt(req.payment.value);
  const resourceType = req.payment.args.resourceType;

  // Balance precheck
  const provider = signer.provider!;
  const balance = await provider.getBalance(signer.address);
  if (balance < amountWei) {
    throw new Error(
      `Insufficient 0G balance: need ${formatEther(amountWei)} 0G, have ${formatEther(balance)} 0G`
    );
  }

  // 3) Call ZeroGentPayment.pay() on-chain
  onStatus?.(`Paying ${req.amountHuman} on 0G Chain...`);
  const payment = getPaymentContract(signer);
  const tx = await payment.pay(req.nonce, resourceType, { value: amountWei });
  onStatus?.(`Waiting for confirmation (${tx.hash.slice(0, 10)}...)`);
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) {
    throw new Error('Payment transaction reverted on-chain');
  }

  // 4) Retry with X-Payment header
  onStatus?.('Verifying payment with API...');
  const paymentHeader = JSON.stringify({ txHash: tx.hash, nonce: req.nonce });
  const retryInit: RequestInit = {
    method,
    headers: { ...headers, 'X-Payment': paymentHeader },
  };
  if (body && method !== 'GET' && method !== 'HEAD') {
    retryInit.body = JSON.stringify(body);
  }

  const retry = await doFetch(api + path, retryInit);
  if (retry.status >= 400) {
    const msg = retry.body?.error || retry.body?.message || `HTTP ${retry.status}`;
    throw new Error(`Paid but server rejected: ${msg}`);
  }

  return { data: retry.body as T, paid: true, txHash: tx.hash, nonce: req.nonce };
}

export { parseEther, formatEther };

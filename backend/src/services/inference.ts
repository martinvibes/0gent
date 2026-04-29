/**
 * 0G Compute Network — AI inference via @0glabs/0g-serving-broker.
 *
 * The deployer wallet acts as the broker's payer: when an agent calls
 * `/compute/infer`, our backend uses its 0G Compute ledger to pay the
 * upstream inference provider, and the agent reimburses us via x402.
 *
 * One-time setup needed: the deployer wallet's compute ledger needs funds.
 * Use `0g-compute-cli deposit --amount 1` or call broker.ledger.depositFund(1)
 * once during ops.
 */

import { ethers } from "ethers";
import { config } from "../config";

// The broker SDK is loaded lazily so we don't pay the require cost on cold start
// for endpoints that don't use it.
type Broker = Awaited<ReturnType<typeof loadBrokerLib>> extends infer L
  ? L extends { createZGComputeNetworkBroker: (...a: any[]) => Promise<infer B> }
    ? B
    : never
  : never;

async function loadBrokerLib() {
  const mod: any = await import("@0glabs/0g-serving-broker");
  return mod;
}

let _broker: Broker | null = null;
let _selectedProvider: { providerAddress: string; endpoint: string; model: string } | null = null;

async function getBroker(): Promise<Broker> {
  if (_broker) return _broker;
  if (!config.deployerPrivateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not configured");
  }
  const provider = new ethers.JsonRpcProvider(config.zgRpcUrl);
  const wallet = new ethers.Wallet(config.deployerPrivateKey, provider);
  const lib = await loadBrokerLib();
  _broker = await lib.createZGComputeNetworkBroker(wallet);
  return _broker as Broker;
}

async function ensureProvider(): Promise<NonNullable<typeof _selectedProvider>> {
  if (_selectedProvider) return _selectedProvider;
  const broker: any = await getBroker();
  const services: any[] = await broker.inference.listService();
  if (!services?.length) {
    throw new Error("no inference providers available on 0G Compute");
  }
  // Prefer providers with chat models, fall back to first
  const chat = services.find((s: any) =>
    /llama|gpt|qwen|mistral|chat|deepseek/i.test(s.name || s.model || "")
  );
  const svc = chat || services[0];

  // Acknowledge provider (idempotent — safe if already done)
  try { await broker.inference.acknowledgeProviderSigner(svc.provider); } catch {}

  const meta = await broker.inference.getServiceMetadata(svc.provider);
  _selectedProvider = {
    providerAddress: svc.provider,
    endpoint: meta.endpoint,
    model: meta.model,
  };
  return _selectedProvider;
}

export async function infer(
  prompt: string,
  options: { model?: string; maxTokens?: number; system?: string } = {}
): Promise<{
  response: string;
  model: string;
  provider: string;
  usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | null;
}> {
  const broker: any = await getBroker();
  const p = await ensureProvider();

  const messages: { role: string; content: string }[] = [];
  if (options.system) messages.push({ role: "system", content: options.system });
  messages.push({ role: "user", content: prompt });

  const requestBody = {
    model: options.model || p.model,
    messages,
    max_tokens: Math.min(Math.max(options.maxTokens || 500, 16), 4096),
  };

  const headers = await broker.inference.getRequestHeaders(
    p.providerAddress,
    JSON.stringify(requestBody)
  );

  const res = await fetch(`${p.endpoint}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`0G Compute inference failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data: any = await res.json();
  return {
    response: data.choices?.[0]?.message?.content ?? "",
    model: data.model ?? requestBody.model,
    provider: p.providerAddress,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : null,
  };
}

export async function listProviders(): Promise<
  Array<{ provider: string; name: string; serviceType: string; url: string; model?: string }>
> {
  const broker: any = await getBroker();
  const services: any[] = await broker.inference.listService();
  return services.map((s: any) => ({
    provider: s.provider,
    name: s.name || "",
    serviceType: s.serviceType || "inference",
    url: s.url || "",
    model: s.model,
  }));
}

export async function getLedgerStatus(): Promise<{
  exists: boolean;
  totalBalance: string;
  locked: string;
  available: string;
  message?: string;
}> {
  const broker: any = await getBroker();
  try {
    const ledger = await broker.ledger.getLedger();
    const total = ledger.totalBalance ?? 0n;
    const locked = ledger.locked ?? 0n;
    return {
      exists: true,
      totalBalance: ethers.formatEther(total),
      locked: ethers.formatEther(locked),
      available: ethers.formatEther(total - locked),
    };
  } catch (e: any) {
    return {
      exists: false,
      totalBalance: "0",
      locked: "0",
      available: "0",
      message: e.message || "ledger not found",
    };
  }
}

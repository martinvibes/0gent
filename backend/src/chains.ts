export type PaymentType = "native" | "erc20";
export type IdentityType = "custom" | "erc8004";

export interface ChainConfig {
  id: string;
  name: string;
  chainId: number;
  rpc: string;
  paymentContract: string;
  registryContract: string;
  identityContract: string;
  identityType: IdentityType;
  paymentType: PaymentType;
  paymentToken?: string;
  paymentDecimals: number;
  explorer: string;
  currency: string;
  pricing: {
    identity: string;
    emailProvision: string;
    emailSend: string;
    emailRead: string;
    phoneProvision: string;
    smsSend: string;
    computeInfer: string;
  };
}

const chains: Record<string, ChainConfig> = {
  "0g": {
    id: "0g",
    name: "0G Chain",
    chainId: 16661,
    rpc: process.env.ZG_RPC_URL || "https://evmrpc.0g.ai",
    paymentContract: process.env.PAYMENT_CONTRACT_ADDRESS || "0x124aF88c004e9df6D444a0Afc0Fe7Ef215dc02A2",
    registryContract: process.env.REGISTRY_CONTRACT_ADDRESS || "0x49589C475BBB418B0E069010C923ed18D00E275b",
    identityContract: process.env.IDENTITY_CONTRACT_ADDRESS || "0xa601C569FD008DEd545531a5d3245B2C68ac591d",
    identityType: "custom",
    paymentType: "native",
    paymentDecimals: 18,
    explorer: "https://chainscan.0g.ai",
    currency: "0G",
    pricing: {
      identity: process.env.PRICE_IDENTITY_MINT || "0.5",
      emailProvision: process.env.PRICE_EMAIL || "2.0",
      emailSend: process.env.PRICE_EMAIL_SEND || "0.1",
      emailRead: process.env.PRICE_EMAIL_READ || "0.05",
      phoneProvision: process.env.PRICE_PHONE || "6.0",
      smsSend: process.env.PRICE_SMS || "0.1",
      computeInfer: process.env.PRICE_COMPUTE_INFER || "0.2",
    },
  },
  celo: {
    id: "celo",
    name: "Celo",
    chainId: 42220,
    rpc: process.env.CELO_RPC_URL || "https://forno.celo.org",
    paymentContract: process.env.CELO_PAYMENT_CONTRACT || "",
    registryContract: process.env.CELO_REGISTRY_CONTRACT || "",
    identityContract: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    identityType: "erc8004",
    paymentType: "erc20",
    paymentToken: process.env.CELO_USDC_ADDRESS || "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    paymentDecimals: 6,
    explorer: "https://celoscan.io",
    currency: "USDC",
    pricing: {
      identity: "0.50",
      emailProvision: "2.00",
      emailSend: "0.08",
      emailRead: "0.02",
      phoneProvision: "3.00",
      smsSend: "0.05",
      computeInfer: "0.10",
    },
  },
};

export function getChain(id: string): ChainConfig {
  const chain = chains[id];
  if (!chain) throw new Error(`Unknown chain: ${id}. Supported: ${Object.keys(chains).join(", ")}`);
  return chain;
}

export function getAllChains(): ChainConfig[] {
  return Object.values(chains);
}

export function getDefaultChain(): ChainConfig {
  return chains["0g"];
}

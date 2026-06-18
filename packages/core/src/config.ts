import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

export const CONFIG_DIR = process.env.OGENT_CONFIG_DIR || join(homedir(), '.0gent');
export const WALLET_DIR = join(CONFIG_DIR, 'wallets');
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface Config {
  defaultWalletId?: string;
  defaultWalletAddress?: string;
  apiEndpoint: string;
  chainId: number;
  rpcUrl: string;
  paymentContract: string;
  registryContract: string;
  identityContract: string;
  storageIndexer: string;
  network: string;           // "0g" | "celo"
  paymentType: "native" | "erc20";
  paymentToken?: string;
  paymentDecimals: number;
  currency: string;
  explorer: string;
}

const CHAIN_DEFAULTS: Record<string, Partial<Config>> = {
  "0g": {
    network: "0g",
    chainId: 16661,
    rpcUrl: "https://evmrpc.0g.ai",
    paymentContract: "0x124aF88c004e9df6D444a0Afc0Fe7Ef215dc02A2",
    registryContract: "0x49589C475BBB418B0E069010C923ed18D00E275b",
    identityContract: "0xa601C569FD008DEd545531a5d3245B2C68ac591d",
    storageIndexer: "https://indexer-storage-turbo.0g.ai",
    paymentType: "native",
    paymentDecimals: 18,
    currency: "0G",
    explorer: "https://chainscan.0g.ai",
  },
  celo: {
    network: "celo",
    chainId: 42220,
    rpcUrl: "https://forno.celo.org",
    paymentContract: "",
    registryContract: "",
    identityContract: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    storageIndexer: "",
    paymentType: "erc20",
    paymentToken: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    paymentDecimals: 6,
    currency: "USDC",
    explorer: "https://celoscan.io",
  },
};

export function ensureDirs(): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  if (!existsSync(WALLET_DIR)) mkdirSync(WALLET_DIR, { recursive: true });
}

export function load(): Config {
  ensureDirs();
  const base = { apiEndpoint: process.env.OGENT_API || "https://api.0gent.xyz", ...CHAIN_DEFAULTS["0g"] };
  if (!existsSync(CONFIG_FILE)) return base as Config;
  try {
    const raw = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
    const network = raw.network || "0g";
    const chainDefaults = CHAIN_DEFAULTS[network] || CHAIN_DEFAULTS["0g"];
    return { ...base, ...chainDefaults, ...raw } as Config;
  } catch {
    return base as Config;
  }
}

export function save(patch: Partial<Config>): Config {
  ensureDirs();
  const current = load();
  const next = { ...current, ...patch };
  writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2));
  return next;
}

export function isSetupComplete(): boolean {
  const cfg = load();
  return !!cfg.defaultWalletId && !!cfg.defaultWalletAddress;
}

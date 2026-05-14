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
}

const DEFAULTS: Config = {
  apiEndpoint: process.env.OGENT_API || 'https://api.0gent.xyz',
  chainId: 16661,
  rpcUrl: 'https://evmrpc.0g.ai',
  paymentContract: '0x124aF88c004e9df6D444a0Afc0Fe7Ef215dc02A2',
  registryContract: '0x49589C475BBB418B0E069010C923ed18D00E275b',
  identityContract: '0xa601C569FD008DEd545531a5d3245B2C68ac591d',
  storageIndexer: 'https://indexer-storage-turbo.0g.ai',
};

export function ensureDirs(): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  if (!existsSync(WALLET_DIR)) mkdirSync(WALLET_DIR, { recursive: true });
}

export function load(): Config {
  ensureDirs();
  if (!existsSync(CONFIG_FILE)) return { ...DEFAULTS };
  try {
    const raw = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    return { ...DEFAULTS, ...raw };
  } catch {
    return { ...DEFAULTS };
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

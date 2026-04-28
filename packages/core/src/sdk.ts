/**
 * ZeroGent SDK — programmatic client for the 0GENT API.
 *
 * import { ZeroGent } from '@0gent/core'
 *
 * const z = new ZeroGent({ privateKey: '0x...' })
 * await z.identityMint()
 * await z.phoneProvision('US')
 * await z.emailCreate('support-bot')
 * await z.emailSend(inboxId, 'user@example.com', 'Hi', 'Hello from your AI agent')
 */
import { Wallet, JsonRpcProvider, formatEther, isAddress } from 'ethers';
import { paidRequest, PaidResponse } from './pay.js';
import {
  getProvider,
  getRegistryContract,
  getIdentityContract,
  RESOURCE_LABEL,
  ResourceType,
} from './chain.js';
import { getSigner, resolvePassphrase } from './vault.js';
import { load, type Config } from './config.js';

// ─── public types ───

export interface ZeroGentOptions {
  api?: string;
  rpcUrl?: string;
  chainId?: number;
  privateKey?: string;
  walletId?: string;
  passphrase?: string;
  autoPay?: boolean;
  onPaymentStatus?: (msg: string) => void;
}

export interface HealthData {
  status: string;
  service: string;
  version: string;
  chain: { name: string; chainId: number; rpc: string };
  contracts: { payment: string; registry: string; identity: string };
}

export interface IdentityResult {
  tokenId: number;
  agent: string;
  metadataURI: string;
  txHash: string;
}

export interface IdentityData {
  tokenId: number;
  agent: string;
  metadataURI: string;
  resourceCount: number;
}

export interface AvailableNumber {
  phoneNumber: string;
  region: string;
  type: string;
}

export interface PhoneResult {
  id: string;
  phoneNumber: string;
  country: string;
  owner: string;
  resourceId: number;
  expiresAt: string;
}

export interface SmsResult {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: string;
}

export interface EmailResult {
  id: string;
  address: string;
  localPart: string;
  owner: string;
  resourceId: number;
  createdAt: string;
}

export interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  direction: 'inbound' | 'outbound';
  timestamp: string;
}

export interface SendResult {
  id: string;
  from: string;
  to: string;
  subject: string;
  timestamp: string;
}

export interface EmailThread {
  threadId: string;
  subject: string;
  lastMessageAt: string;
  messageCount: number;
}

export interface Resource {
  id: number;
  type: string;
  providerRef: string;
  active: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface BalanceInfo {
  address: string;
  balance0G: string;
  balanceWei: string;
}

export interface GeneratedWallet {
  name: string;
  address: string;
  mnemonic: string;
  privateKey: string;
  createdAt: string;
}

export interface MemoryEntry {
  key: string;
  rootHash: string;
  updatedAt: string;
}

// ─── class ───

export class ZeroGent {
  public api: string;
  public signer: Wallet;
  public provider: JsonRpcProvider;
  public autoPay: boolean;
  public onPaymentStatus?: (msg: string) => void;
  private cfg: Config;

  constructor(opts: ZeroGentOptions = {}) {
    const cfg = load();
    this.cfg = cfg;
    this.api = opts.api || cfg.apiEndpoint;
    this.autoPay = opts.autoPay ?? true;
    this.onPaymentStatus = opts.onPaymentStatus;

    this.provider = new JsonRpcProvider(opts.rpcUrl || cfg.rpcUrl, {
      chainId: opts.chainId || cfg.chainId,
      name: '0g-chain',
    });

    if (opts.privateKey) {
      this.signer = new Wallet(opts.privateKey, this.provider);
    } else if (opts.walletId || cfg.defaultWalletId) {
      const id = opts.walletId || cfg.defaultWalletId!;
      const pass = resolvePassphrase(opts.passphrase);
      this.signer = getSigner(id, pass, this.provider);
    } else {
      throw new Error(
        'ZeroGent needs a wallet. Pass privateKey, walletId, or run "0gent setup" first.'
      );
    }
  }

  get address(): string {
    return this.signer.address;
  }

  // ─── HTTP helpers ───

  private async rawGet<T = any>(path: string): Promise<T> {
    const res = await fetch(this.api + path);
    const text = await res.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = text; }
    if (res.status >= 400) {
      throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
    }
    return body as T;
  }

  private async rawPost<T = any>(path: string, body?: object): Promise<T> {
    const res = await fetch(this.api + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = text; }
    if (res.status >= 400) {
      throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
    }
    return data as T;
  }

  private async paid<T = any>(method: string, path: string, body?: object): Promise<PaidResponse<T>> {
    if (!this.autoPay) {
      throw new Error('autoPay is disabled — paid endpoints unavailable');
    }
    return paidRequest<T>({
      api: this.api,
      method,
      path,
      body,
      signer: this.signer,
      onStatus: this.onPaymentStatus,
    });
  }

  // ─── Info ───

  async health(): Promise<HealthData> {
    return this.rawGet<HealthData>('/health');
  }

  async pricing(): Promise<Record<string, string>> {
    return this.rawGet<Record<string, string>>('/pricing').catch(() => ({}));
  }

  async skill(): Promise<string> {
    const res = await fetch(this.api + '/skill.md');
    return res.text();
  }

  // ─── Identity ───

  async identityMint(name?: string): Promise<IdentityResult> {
    const { data } = await this.paid<IdentityResult>('POST', '/identity/mint', { name: name || '' });
    return data;
  }

  async identityGet(address?: string): Promise<IdentityData | null> {
    const addr = address || this.address;
    try {
      return await this.rawGet<IdentityData>(`/identity/${addr}`);
    } catch (e: any) {
      if (String(e.message).includes('No identity')) return null;
      throw e;
    }
  }

  async identityExists(address?: string): Promise<boolean> {
    const id = getIdentityContract(this.provider);
    const tokenId = await id.agentTokenId(address || this.address);
    return BigInt(tokenId.toString()) > 0n;
  }

  // ─── Phone / SMS ───

  async phoneSearch(country = 'US', areaCode?: string): Promise<AvailableNumber[]> {
    const q = new URLSearchParams({ country });
    if (areaCode) q.set('areaCode', areaCode);
    const res = await this.rawGet<{ numbers: AvailableNumber[] }>(`/phone/search?${q}`);
    return res.numbers;
  }

  async phoneProvision(country = 'US', areaCode?: string): Promise<PhoneResult> {
    const { data } = await this.paid<PhoneResult>('POST', '/phone/provision', { country, areaCode });
    return data;
  }

  async phoneSms(phoneId: string, to: string, body: string): Promise<SmsResult> {
    const { data } = await this.paid<SmsResult>('POST', `/phone/${phoneId}/sms`, { to, body });
    return data;
  }

  async phoneLogs(phoneId: string): Promise<SmsResult[]> {
    const res = await this.rawGet<{ logs: SmsResult[] }>(
      `/phone/${phoneId}/logs?owner=${this.address}`
    );
    return res.logs;
  }

  // ─── Email ───

  async emailCreate(name: string, walletAddress?: string): Promise<EmailResult> {
    const { data } = await this.paid<EmailResult>('POST', '/email/provision', {
      name,
      walletAddress: walletAddress || this.address,
    });
    return data;
  }

  async emailRead(inboxId: string): Promise<EmailMessage[]> {
    const { data } = await this.paid<{ messages: EmailMessage[] }>(
      'GET',
      `/email/${inboxId}/inbox`
    );
    return data.messages || [];
  }

  async emailSend(inboxId: string, to: string, subject: string, body: string): Promise<SendResult> {
    const { data } = await this.paid<SendResult>('POST', `/email/${inboxId}/send`, {
      to,
      subject,
      body,
    });
    return data;
  }

  async emailThreads(inboxId: string): Promise<EmailThread[]> {
    const { data } = await this.paid<{ threads: EmailThread[] }>(
      'GET',
      `/email/${inboxId}/threads`
    );
    return data.threads || [];
  }

  // ─── Wallet / balance ───

  async balance(): Promise<BalanceInfo> {
    return ZeroGent.balanceOf(this.address, { provider: this.provider });
  }

  async walletBalance(address: string): Promise<BalanceInfo> {
    return ZeroGent.balanceOf(address, { provider: this.provider });
  }

  /**
   * Generate a fresh BIP-39 HD wallet locally. No network call, no server roundtrip,
   * key material never leaves the caller's machine. Returns the mnemonic + private
   * key once — caller is responsible for storing them safely.
   *
   * Use this on the frontend ("Create your agent's wallet") and in scripts that
   * provision a new agent on the fly.
   */
  static createWallet(name?: string): GeneratedWallet {
    const w = Wallet.createRandom();
    return {
      name: name?.trim() || `agent-${Math.random().toString(36).slice(2, 8)}`,
      address: w.address,
      mnemonic: w.mnemonic?.phrase ?? '',
      privateKey: w.privateKey,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Read 0G balance for any address. No instance required — useful for the
   * frontend's "your wallet has X 0G" display before there's a signer.
   */
  static async balanceOf(
    address: string,
    opts?: { rpcUrl?: string; chainId?: number; provider?: JsonRpcProvider }
  ): Promise<BalanceInfo> {
    if (!isAddress(address)) throw new Error(`Invalid address: ${address}`);
    const cfg = load();
    const provider =
      opts?.provider ||
      new JsonRpcProvider(opts?.rpcUrl || cfg.rpcUrl, {
        chainId: opts?.chainId || cfg.chainId,
        name: '0g-chain',
      });
    const bal = await provider.getBalance(address);
    return {
      address,
      balance0G: formatEther(bal),
      balanceWei: bal.toString(),
    };
  }

  async listResources(): Promise<Resource[]> {
    const registry = getRegistryContract(this.provider);
    const ids: bigint[] = await registry.getAgentResourceIds(this.address);
    if (ids.length === 0) return [];
    const resources: Resource[] = [];
    for (const id of ids) {
      const r = await registry.getResource(id);
      resources.push({
        id: Number(r[0]),
        type: RESOURCE_LABEL[Number(r[1])] || 'unknown',
        providerRef: r[3],
        active: Number(r[2]) === 0,
        createdAt: Number(r[4]),
        expiresAt: Number(r[5]),
      });
    }
    return resources;
  }

  // ─── Memory (0G Storage via backend) ───

  memory = {
    set: async (key: string, value: unknown): Promise<{ rootHash: string }> => {
      return this.rawPost<{ rootHash: string }>(`/memory/${this.address}`, { key, value });
    },
    get: async (key: string): Promise<unknown> => {
      const res = await this.rawGet<{ value: unknown }>(
        `/memory/${this.address}?key=${encodeURIComponent(key)}`
      );
      return res.value;
    },
    list: async (): Promise<MemoryEntry[]> => {
      const res = await this.rawGet<{ keys: Array<{ key: string; root_hash: string; updated_at: string }> }>(
        `/memory/${this.address}`
      );
      return (res.keys || []).map(k => ({
        key: k.key,
        rootHash: k.root_hash,
        updatedAt: k.updated_at,
      }));
    },
    delete: async (key: string): Promise<void> => {
      await fetch(`${this.api}/memory/${this.address}/key/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
    },
  };
}

export default ZeroGent;

// Re-export types that developers will want
export { ResourceType };

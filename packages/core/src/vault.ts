/**
 * 0GENT Wallet Vault — local non-custodial HD wallet.
 * Mnemonic encrypted with AES-256-GCM keyed by scrypt(passphrase, salt).
 * Files live at ~/.0gent/wallets/<id>.json. Keys never leave the machine.
 */
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';
import { existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import * as bip39 from 'bip39';
import { HDNodeWallet, Wallet, type Provider } from 'ethers';

import { WALLET_DIR, ensureDirs } from './config.js';

const OGENT_VERSION = 1;
const DERIVATION_PATH = "m/44'/60'/0'/0/0";

export interface EncryptedBlob {
  iv: string;
  salt: string;
  ciphertext: string;
  tag: string;
}

export interface WalletFile {
  ogent_version: number;
  id: string;
  label: string;
  address: string;
  derivation_path: string;
  encrypted: EncryptedBlob;
  created_at: string;
}

export interface WalletSummary {
  id: string;
  label: string;
  address: string;
  createdAt: string;
}

// ─── encryption primitives ───

function encrypt(plaintext: string, passphrase: string): EncryptedBlob {
  if (!passphrase) throw new Error('Passphrase required');
  const salt = randomBytes(32);
  const key = scryptSync(passphrase, salt, 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  let enc = cipher.update(plaintext, 'utf8', 'hex');
  enc += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    salt: salt.toString('hex'),
    ciphertext: enc,
    tag: cipher.getAuthTag().toString('hex'),
  };
}

function decrypt(blob: EncryptedBlob, passphrase: string): string {
  if (!passphrase) throw new Error('Passphrase required');
  const key = scryptSync(passphrase, Buffer.from(blob.salt, 'hex'), 32);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(blob.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(blob.tag, 'hex'));
  let dec = decipher.update(blob.ciphertext, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

// ─── id + filenames ───

function newId(): string {
  return randomBytes(12).toString('hex');
}

function walletPath(id: string): string {
  return join(WALLET_DIR, `${id}.json`);
}

// ─── derive address from mnemonic ───

function deriveAddress(mnemonic: string): string {
  const hd = HDNodeWallet.fromPhrase(mnemonic, undefined, DERIVATION_PATH);
  return hd.address;
}

// ─── create / import ───

export interface CreateResult extends WalletSummary {
  mnemonic: string;
}

export function createWallet(passphrase: string, label = 'default'): CreateResult {
  ensureDirs();
  const mnemonic = bip39.generateMnemonic();
  return _saveWallet(mnemonic, passphrase, label, true) as CreateResult;
}

export function importMnemonic(mnemonic: string, passphrase: string, label = 'imported'): WalletSummary {
  if (!bip39.validateMnemonic(mnemonic)) throw new Error('Invalid mnemonic');
  return _saveWallet(mnemonic, passphrase, label, false);
}

function _saveWallet(
  mnemonic: string,
  passphrase: string,
  label: string,
  returnMnemonic: boolean
): WalletSummary | CreateResult {
  ensureDirs();
  const id = newId();
  const address = deriveAddress(mnemonic);
  const encrypted = encrypt(mnemonic, passphrase);
  const file: WalletFile = {
    ogent_version: OGENT_VERSION,
    id,
    label,
    address,
    derivation_path: DERIVATION_PATH,
    encrypted,
    created_at: new Date().toISOString(),
  };
  writeFileSync(walletPath(id), JSON.stringify(file, null, 2));
  const summary: WalletSummary = { id, label, address, createdAt: file.created_at };
  return returnMnemonic ? { ...summary, mnemonic } : summary;
}

// ─── list ───

export function listWallets(): WalletSummary[] {
  ensureDirs();
  return readdirSync(WALLET_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const data = JSON.parse(readFileSync(join(WALLET_DIR, f), 'utf8')) as WalletFile;
        return {
          id: data.id,
          label: data.label,
          address: data.address,
          createdAt: data.created_at,
        };
      } catch {
        return null;
      }
    })
    .filter((x): x is WalletSummary => x !== null);
}

// ─── load + signer ───

export function getWalletFile(idOrAddress: string): WalletFile {
  const wallets = readdirSync(WALLET_DIR).filter(f => f.endsWith('.json'));
  for (const f of wallets) {
    const data = JSON.parse(readFileSync(join(WALLET_DIR, f), 'utf8')) as WalletFile;
    if (data.id === idOrAddress || data.address.toLowerCase() === idOrAddress.toLowerCase() || data.label === idOrAddress) {
      return data;
    }
  }
  throw new Error(`Wallet not found: ${idOrAddress}`);
}

export function getSigner(idOrAddress: string, passphrase: string, provider?: Provider): Wallet {
  const file = getWalletFile(idOrAddress);
  const mnemonic = decrypt(file.encrypted, passphrase);
  const hd = HDNodeWallet.fromPhrase(mnemonic, undefined, file.derivation_path);
  const wallet = new Wallet(hd.privateKey, provider);
  return wallet;
}

export function exportMnemonic(idOrAddress: string, passphrase: string): string {
  const file = getWalletFile(idOrAddress);
  return decrypt(file.encrypted, passphrase);
}

export function deleteWallet(idOrAddress: string): void {
  const file = getWalletFile(idOrAddress);
  const p = walletPath(file.id);
  if (existsSync(p)) unlinkSync(p);
}

// ─── passphrase resolver ───

export function resolvePassphrase(explicit?: string): string {
  const p = explicit || process.env.OGENT_WALLET_PASSPHRASE;
  if (!p) throw new Error('Wallet passphrase required. Pass --passphrase or set OGENT_WALLET_PASSPHRASE.');
  return p;
}

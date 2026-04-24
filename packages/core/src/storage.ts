/**
 * 0G Storage client wrapper for the @0gent/core package.
 * Thin layer over @0gfoundation/0g-ts-sdk. Read-only here; all writes happen
 * server-side after an x402 payment.
 */
import { load } from './config.js';

export async function downloadByHash(rootHash: string): Promise<Buffer> {
  // Dynamic import — ZgFile constructor can be heavy
  const { Indexer } = await import('@0gfoundation/0g-ts-sdk');
  const { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } = await import('fs');
  const { join } = await import('path');
  const { tmpdir } = await import('os');

  const cfg = load();
  const tmp = join(tmpdir(), '0gent-dl-' + Date.now() + '.bin');
  const tmpDir = tmpdir();
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const indexer = new Indexer(cfg.storageIndexer);
  const err = await indexer.download(rootHash, tmp, true);
  if (err) throw new Error(`0G Storage download failed: ${err}`);

  try {
    return readFileSync(tmp);
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
}

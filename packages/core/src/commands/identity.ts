import { ZeroGent } from '../sdk.js';
import { load } from '../config.js';
import { getZeroGent } from './helpers.js';
import { c, success, info, kv, blank, spinner } from '../ui.js';
import { explorerTx, explorerAddress } from '../chain.js';

export async function identityMintCmd(opts: { name?: string }): Promise<void> {
  const z = await getZeroGent();

  const existing = await z.identityExists();
  if (existing) {
    const identity = await z.identityGet();
    info(`Identity already minted.`);
    if (identity) {
      kv('Token ID', '#' + identity.tokenId);
      kv('Metadata', identity.metadataURI);
    }
    return;
  }

  const sp = spinner('Minting Agent Identity NFT');
  z.onPaymentStatus = (m) => (sp.text = m);
  try {
    const result = await z.identityMint(opts.name);
    sp.stop();
    blank();
    success('Agent Identity minted');
    kv('Token ID', '#' + result.tokenId);
    kv('Owner', z.address);
    kv('Metadata', result.metadataURI);
    kv('Tx', explorerTx(result.txHash));
    blank();
  } catch (e) {
    sp.fail(String((e as Error).message));
    throw e;
  }
}

export async function identityShowCmd(): Promise<void> {
  const z = await getZeroGent();
  const identity = await z.identityGet();
  if (!identity) {
    info('No identity minted yet. Run "0gent identity mint".');
    return;
  }
  blank();
  console.log('  ' + c.bold('Agent Identity'));
  blank();
  kv('Token ID', '#' + identity.tokenId);
  kv('Owner', identity.agent);
  kv('Metadata', identity.metadataURI);
  kv('Resources', String(identity.resourceCount));
  const cfg = load();
  kv('Contract', explorerAddress(cfg.identityContract));
  blank();
}

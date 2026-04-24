import { ZeroGent } from '../sdk.js';
import { load } from '../config.js';
import { getZeroGent } from './helpers.js';
import { c, success, fail, info, kv, blank, spinner, printHeader } from '../ui.js';
import { formatEther } from 'ethers';
import { getProvider } from '../chain.js';

export async function skillCmd(): Promise<void> {
  const cfg = load();
  const res = await fetch(cfg.apiEndpoint + '/skill.md');
  const text = await res.text();
  console.log(text);
}

export async function balanceCmd(): Promise<void> {
  const cfg = load();
  if (!cfg.defaultWalletAddress) {
    info('No wallet configured. Run "0gent setup" first.');
    return;
  }
  const provider = getProvider();
  const bal = await provider.getBalance(cfg.defaultWalletAddress);
  console.log(
    '  ' +
      c.dim('Wallet: ') +
      c.addr(cfg.defaultWalletAddress) +
      c.dim('  |  Balance: ') +
      c.ok(formatEther(bal) + ' 0G') +
      c.dim(' on 0G Chain')
  );
}

export async function pricingCmd(): Promise<void> {
  const cfg = load();
  try {
    const res = await fetch(cfg.apiEndpoint + '/pricing');
    if (res.ok) {
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
      return;
    }
  } catch {}

  // Fallback: hardcoded pricing
  blank();
  console.log(c.bold('  0GENT Pricing (0G Tokens)'));
  blank();
  kv('Phone provision', '0.5 / month');
  kv('SMS send', '0.01');
  kv('Email inbox', '0.2 / month');
  kv('Compute (VPS)', '1.0 / month');
  kv('Domain register', '2.0 / year');
  kv('Identity mint', '0.1');
  kv('Memory r/w', 'free');
  blank();
}

export async function healthCmd(): Promise<void> {
  const cfg = load();
  const sp = spinner('Checking API health');
  try {
    const res = await fetch(cfg.apiEndpoint + '/health');
    const data = (await res.json()) as any;
    sp.stop();
    success('API online');
    kv('Service', data.service + ' v' + data.version);
    kv('Chain', `0G Chain (${data.chain.chainId})`);
    kv('Payment', data.contracts.payment);
    kv('Registry', data.contracts.registry);
    kv('Identity', data.contracts.identity);
  } catch (e) {
    sp.fail('API unreachable');
    info(`Endpoint: ${cfg.apiEndpoint}`);
  }
}

export async function doctorCmd(): Promise<void> {
  printHeader();
  const cfg = load();
  let failed = 0;

  // Config
  if (cfg.defaultWalletId) success('Wallet configured');
  else { fail('No wallet configured (run "0gent setup")'); failed++; }

  // API
  try {
    const r = await fetch(cfg.apiEndpoint + '/health');
    if (r.ok) success(`API reachable (${cfg.apiEndpoint})`);
    else { fail(`API returned ${r.status}`); failed++; }
  } catch {
    fail(`API unreachable: ${cfg.apiEndpoint}`);
    failed++;
  }

  // RPC
  try {
    const provider = getProvider();
    const net = await provider.getNetwork();
    if (Number(net.chainId) === cfg.chainId) success(`RPC connected (chain ${net.chainId})`);
    else { fail(`Chain ID mismatch: got ${net.chainId}, expected ${cfg.chainId}`); failed++; }
  } catch {
    fail(`RPC unreachable: ${cfg.rpcUrl}`);
    failed++;
  }

  // Balance
  if (cfg.defaultWalletAddress) {
    try {
      const provider = getProvider();
      const bal = await provider.getBalance(cfg.defaultWalletAddress);
      if (bal > 0n) success(`Wallet funded (${formatEther(bal)} 0G)`);
      else { fail('Wallet has 0 balance — get testnet tokens at https://faucet.0g.ai'); failed++; }
    } catch {
      fail('Could not check balance');
      failed++;
    }
  }

  blank();
  if (failed === 0) success('All checks passed');
  else fail(`${failed} issue${failed > 1 ? 's' : ''} found`);
  process.exit(failed === 0 ? 0 : 1);
}

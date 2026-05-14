import { ZeroGent } from '../sdk.js';
import { load } from '../config.js';
import { getZeroGent } from './helpers.js';
import { c, success, fail, info, kv, blank, spinner, printHeader } from '../ui.js';
import { formatEther } from 'ethers';
import { getProvider } from '../chain.js';
import Table from 'cli-table3';

// ─── lightweight markdown colorizer for `0gent skill` ──────────────────

function colorizeMarkdown(text: string): string {
  const lines = text.split('\n');
  let inCodeBlock = false;
  return lines
    .map((raw) => {
      // Fenced code block toggle
      if (raw.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return c.dim(raw);
      }
      if (inCodeBlock) return c.mono(raw);

      // Headers
      if (raw.startsWith('# ')) return c.bold(c.brand(raw));
      if (raw.startsWith('## ')) return c.bold(c.accent(raw));
      if (raw.startsWith('### ')) return c.bold(c.addr(raw));
      if (raw.startsWith('#### ')) return c.bold(raw);

      // HTTP verb + path lines (e.g. "POST /email/inboxes")
      const verb = raw.match(/^(GET|POST|PUT|DELETE|PATCH)\s+(\S+)/);
      if (verb) {
        const verbColor =
          verb[1] === 'GET' ? c.ok :
          verb[1] === 'DELETE' ? c.err :
          verb[1] === 'POST' ? c.accent : c.warn;
        return '  ' + verbColor(c.bold(verb[1].padEnd(7))) + c.addr(verb[2]) + raw.slice(verb[0].length);
      }

      // Cost: lines (e.g. "Cost: 0.1 0G", "Cost: Free")
      if (/^\s*Cost:/i.test(raw)) {
        const m = raw.match(/^(\s*Cost:\s*)(.+)$/i);
        if (m) {
          const isFree = /free/i.test(m[2]);
          return c.dim(m[1]) + (isFree ? c.ok(m[2]) : c.warn(m[2]));
        }
      }

      // **bold** inline
      const bolded = raw.replace(/\*\*([^*]+)\*\*/g, (_m, t) => c.bold(t));
      // `code` inline
      const monoed = bolded.replace(/`([^`]+)`/g, (_m, t) => c.mono(t));
      // Bullet lines start with "- "
      if (/^\s*-\s/.test(monoed)) {
        return monoed.replace(/^(\s*)(-)(\s)/, (_m, sp, dash, s) => sp + c.accent(dash) + s);
      }
      return monoed;
    })
    .join('\n');
}

export async function skillCmd(): Promise<void> {
  const cfg = load();
  const res = await fetch(cfg.apiEndpoint + '/skill.md');
  const text = await res.text();
  console.log(colorizeMarkdown(text));
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
  let live: any = null;
  try {
    const res = await fetch(cfg.apiEndpoint + '/pricing');
    if (res.ok) live = await res.json();
  } catch {}

  // Build rows from live data when available, otherwise use known defaults
  type Row = { service: string; price: string };
  const rows: Row[] = [];
  const fmt = (v: any): string => {
    if (v === undefined || v === null) return '—';
    if (typeof v === 'string') return v;
    return `${v} 0G`;
  };
  if (live?.services) {
    const s = live.services;
    if (s.identity) rows.push({ service: 'Identity mint', price: fmt(s.identity.mint) });
    if (s.email) {
      rows.push({ service: 'Email inbox', price: fmt(s.email.provision) });
      rows.push({ service: 'Email send', price: fmt(s.email.send) });
      rows.push({ service: 'Email read', price: fmt(s.email.read) });
      rows.push({ service: 'Email threads', price: fmt(s.email.threads) });
    }
    if (s.phone) {
      rows.push({ service: 'Phone provision', price: fmt(s.phone.provision) });
      rows.push({ service: 'SMS send', price: fmt(s.phone.sms) });
    }
    if (s.compute) rows.push({ service: 'Compute (VPS)', price: fmt(s.compute.provision) });
    if (s.domain) rows.push({ service: 'Domain register', price: fmt(s.domain.register) });
    if (s.memory) {
      rows.push({ service: 'Memory read', price: fmt(s.memory.read) });
      rows.push({ service: 'Memory write', price: fmt(s.memory.write) });
    }
  } else {
    // Fallback if API is down
    rows.push(
      { service: 'Identity mint', price: '0.5 0G' },
      { service: 'Email inbox', price: '2.0 0G' },
      { service: 'Email send', price: '0.1 0G' },
      { service: 'Email read', price: '0.05 0G' },
      { service: 'Phone provision', price: '6.0 0G' },
      { service: 'SMS send', price: '0.1 0G' },
      { service: 'Compute infer', price: '0.2 0G' },
      { service: 'Memory r/w', price: 'free' }
    );
  }

  const network = live?.network || `0G Chain (${cfg.chainId})`;
  const currency = live?.currency || '0G';

  blank();
  console.log('  ' + c.bold(c.brand('▓▓') + c.accent('▓▓')) + '  ' + c.bold('0GENT pricing'));
  console.log('  ' + c.dim('paid in ') + c.accent(currency) + c.dim(' on ') + c.addr(network));
  blank();

  const table = new Table({
    head: [c.dim('Service'), c.dim('Cost')],
    style: { border: ['grey'] },
    colWidths: [22, 18],
  });
  for (const r of rows) {
    const isFree = /free/i.test(r.price);
    table.push([
      c.mono(r.service),
      isFree ? c.ok(r.price) : c.bold(c.accent(r.price)),
    ]);
  }
  console.log(table.toString().split('\n').map((l) => '  ' + l).join('\n'));

  blank();
  info(c.dim('all paid endpoints settle on-chain via x402'));
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

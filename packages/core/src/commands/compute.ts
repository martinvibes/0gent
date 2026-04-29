import Table from 'cli-table3';
import { getZeroGent } from './helpers.js';
import { load } from '../config.js';
import { c, success, info, kv, blank, spinner } from '../ui.js';

// `compute providers` and `compute status` are free read endpoints — they don't
// need a wallet. Talk to the API directly instead of going through ZeroGent.
async function getApi(): Promise<string> {
  const cfg = load();
  return cfg.apiEndpoint;
}

export async function computeProvidersCmd(): Promise<void> {
  const sp = spinner('Fetching 0G Compute providers');
  try {
    const api = await getApi();
    const res = await fetch(api + '/compute/providers');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { providers } = (await res.json()) as { providers: any[] };
    sp.stop();
    if (!providers?.length) {
      info('No providers available right now.');
      return;
    }
    const table = new Table({
      head: [c.dim('Model'), c.dim('Type'), c.dim('Provider'), c.dim('URL')],
      style: { border: ['grey'] },
      colWidths: [30, 16, 22, 40],
      wordWrap: true,
    });
    for (const p of providers) {
      const short = p.provider ? p.provider.slice(0, 6) + '…' + p.provider.slice(-4) : '';
      table.push([
        c.accent(p.model || '(unknown)'),
        p.serviceType,
        c.mono(short),
        c.dim(p.url || ''),
      ]);
    }
    console.log(table.toString());
    info(`${providers.length} provider(s) on 0G Compute Network`);
  } catch (e) {
    sp.fail(String((e as Error).message));
  }
}

export async function computeStatusCmd(): Promise<void> {
  const sp = spinner('Reading 0G Compute status');
  try {
    const api = await getApi();
    const res = await fetch(api + '/compute/status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const s = (await res.json()) as any;
    sp.stop();
    blank();
    if (s.ready) success('0G Compute is ready');
    else info(c.warn('0G Compute is wired but the operator ledger is not funded yet'));
    blank();
    kv('Operator',  s.operator);
    kv('Providers', String(s.providersAvailable));
    kv('Ledger',    s.ledger.exists ? c.ok('exists') : c.warn('not created'));
    kv('Total',     s.ledger.totalBalance + ' 0G');
    kv('Locked',    s.ledger.locked + ' 0G');
    kv('Available', s.ledger.available + ' 0G');
    if (s.ledger.message) {
      blank();
      info(c.dim(s.ledger.message));
    }
    blank();
    if (s.sampleProviders?.length) {
      info('Sample providers:');
      for (const p of s.sampleProviders) {
        console.log('   ' + c.dim('·') + ' ' + c.accent(p.model) + c.dim(' (' + p.type + ')'));
      }
    }
  } catch (e) {
    sp.fail(String((e as Error).message));
  }
}

export async function computeInferCmd(
  prompt: string,
  opts: { model?: string; maxTokens?: string; system?: string }
): Promise<void> {
  if (!prompt || !prompt.trim()) {
    throw new Error('prompt is required: 0gent compute infer "your question"');
  }
  const z = await getZeroGent();
  z.onPaymentStatus = (m) => console.log('  ' + c.dim('[x402]') + ' ' + m);
  const sp = spinner('Calling 0G Compute Network');
  try {
    const r = await z.computeInfer(prompt, {
      model: opts.model,
      maxTokens: opts.maxTokens ? Number(opts.maxTokens) : undefined,
      system: opts.system,
    });
    sp.stop();
    blank();
    success('Inference complete');
    blank();
    console.log(c.dim('  ┌─') + c.accent(' response ') + c.dim('─'.repeat(40)));
    for (const line of (r.response || '').split('\n')) {
      console.log(c.dim('  │ ') + c.mono(line));
    }
    console.log(c.dim('  └' + '─'.repeat(50)));
    blank();
    kv('Model',    r.model);
    kv('Provider', r.provider.slice(0, 6) + '…' + r.provider.slice(-4));
    if (r.usage) kv('Tokens', `${r.usage.totalTokens} (${r.usage.promptTokens} in / ${r.usage.completionTokens} out)`);
    blank();
  } catch (e) {
    sp.fail(String((e as Error).message));
    throw e;
  }
}

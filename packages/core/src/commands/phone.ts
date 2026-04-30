import inquirer from 'inquirer';
import Table from 'cli-table3';
import { getZeroGent } from './helpers.js';
import { load } from '../config.js';
import { c, success, info, kv, blank, spinner } from '../ui.js';
import { explorerTx } from '../chain.js';

export async function phoneSearchCmd(opts: { country?: string; areaCode?: string }): Promise<void> {
  const z = await getZeroGent();
  const sp = spinner(`Searching numbers in ${opts.country || 'US'}`);
  try {
    const numbers = await z.phoneSearch(opts.country || 'US', opts.areaCode);
    sp.stop();
    if (!numbers.length) {
      info('No numbers available.');
      return;
    }
    const table = new Table({
      head: [c.dim('Number'), c.dim('Region'), c.dim('Type')],
      style: { border: ['grey'] },
    });
    for (const n of numbers) {
      table.push([c.addr(n.phoneNumber), n.region, n.type]);
    }
    console.log(table.toString());
  } catch (e) {
    sp.fail(String((e as Error).message));
    info('Tip: run ' + c.accent('0gent phone countries') + ' to see all supported codes.');
  }
}

// `0gent phone countries` — list supported country codes + names.
// Free, no wallet needed; reads directly from the public API.
export async function phoneCountriesCmd(opts: { region?: string }): Promise<void> {
  const cfg = load();
  const sp = spinner('Fetching supported countries');
  try {
    const res = await fetch(cfg.apiEndpoint + '/phone/countries');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any = await res.json();
    sp.stop();
    let list: any[] = data.countries || [];
    if (opts.region) {
      const r = opts.region.toLowerCase();
      list = list.filter((c0: any) => (c0.region || '').toLowerCase().includes(r));
      if (!list.length) {
        info(`No countries match region "${opts.region}". Try: north america, europe, asia-pacific, latin america, middle east, africa.`);
        return;
      }
    }
    // Group by region for readability
    const byRegion: Record<string, any[]> = {};
    for (const c0 of list) {
      (byRegion[c0.region || 'Other'] ||= []).push(c0);
    }
    blank();
    for (const region of Object.keys(byRegion)) {
      console.log('  ' + c.dim('───') + ' ' + c.accent(region) + ' ' + c.dim('───'));
      const rows = byRegion[region];
      for (const c0 of rows) {
        const code = c.brand(c0.code.padEnd(4));
        const name = c0.popular ? c.accent(c0.name) : c0.name;
        console.log('   ' + code + ' ' + name + (c0.popular ? c.dim('  ★') : ''));
      }
      blank();
    }
    info(`${data.count} curated picks shown · use ` + c.accent('0gent phone search --country <CODE>'));
    info(c.dim('Twilio supports 170+ countries — pass any ISO 3166-1 alpha-2 code (e.g. KE, NG, ZA),'));
    info(c.dim('even if it isn\'t on this list. Coverage shifts; some countries have inventory, some don\'t.'));
  } catch (e) {
    sp.fail(String((e as Error).message));
  }
}

export async function phoneProvisionCmd(opts: { country?: string; areaCode?: string; yes?: boolean }): Promise<void> {
  const z = await getZeroGent();

  if (!opts.yes) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Provision a phone number in ${opts.country || 'US'}? (costs 0G tokens)`,
        default: true,
      },
    ]);
    if (!confirm) return;
  }

  const sp = spinner('Provisioning phone number');
  z.onPaymentStatus = (m) => (sp.text = m);
  try {
    const r = await z.phoneProvision(opts.country || 'US', opts.areaCode);
    sp.stop();
    blank();
    success('Phone number provisioned');
    kv('Number', r.phoneNumber);
    kv('Country', r.country);
    kv('Owner', r.owner);
    kv('Resource ID', String(r.resourceId));
    kv('Expires', new Date(r.expiresAt).toLocaleDateString());
    blank();
    info('Send SMS with: ' + c.accent(`0gent phone sms ${r.id} --to +1... --body "..."`));
    blank();
  } catch (e) {
    sp.fail(String((e as Error).message));
    throw e;
  }
}

export async function phoneSmsCmd(phoneId: string, opts: { to?: string; body?: string }): Promise<void> {
  if (!opts.to) throw new Error('--to is required');
  if (!opts.body) throw new Error('--body is required');
  const z = await getZeroGent();
  const sp = spinner(`Sending SMS to ${opts.to}`);
  z.onPaymentStatus = (m) => (sp.text = m);
  try {
    const msg = await z.phoneSms(phoneId, opts.to, opts.body);
    sp.stop();
    success('SMS sent');
    kv('From', msg.from);
    kv('To', msg.to);
    kv('Timestamp', new Date(msg.timestamp).toLocaleString());
  } catch (e) {
    sp.fail(String((e as Error).message));
    throw e;
  }
}

export async function phoneLogsCmd(phoneId: string): Promise<void> {
  const z = await getZeroGent();
  const sp = spinner('Loading SMS logs');
  try {
    const logs = await z.phoneLogs(phoneId);
    sp.stop();
    if (!logs.length) {
      info('No messages yet.');
      return;
    }
    const table = new Table({
      head: [c.dim('Dir'), c.dim('From'), c.dim('To'), c.dim('Body'), c.dim('When')],
      style: { border: ['grey'] },
      colWidths: [6, 18, 18, 40, 22],
      wordWrap: true,
    });
    for (const m of logs) {
      const dir = (m as any).direction === 'inbound' ? c.brand('in') : c.accent('out');
      table.push([dir, m.from, m.to, m.body, new Date(m.timestamp).toLocaleString()]);
    }
    console.log(table.toString());
  } catch (e) {
    sp.fail(String((e as Error).message));
  }
}

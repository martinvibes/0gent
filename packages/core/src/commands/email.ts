import inquirer from 'inquirer';
import Table from 'cli-table3';
import { getZeroGent } from './helpers.js';
import { c, success, info, kv, blank, spinner } from '../ui.js';

export async function emailProvisionCmd(opts: { name?: string; yes?: boolean }): Promise<void> {
  const z = await getZeroGent();
  let name = opts.name;
  if (!name) {
    const ans = await inquirer.prompt([
      { type: 'input', name: 'name', message: 'Local part for your email (e.g. agent):', validate: (v: string) => !!v.match(/^[a-z0-9-_.]{1,32}$/i) || 'letters, numbers, -_.' },
    ]);
    name = ans.name;
  }

  if (!opts.yes) {
    const { confirm } = await inquirer.prompt([
      { type: 'confirm', name: 'confirm', message: `Create inbox ${name}@0gent.xyz?`, default: true },
    ]);
    if (!confirm) return;
  }

  const sp = spinner('Provisioning email inbox');
  z.onPaymentStatus = (m) => (sp.text = m);
  try {
    const r = await z.emailCreate(name!);
    sp.stop();
    blank();
    success('Email inbox provisioned');
    kv('Address', r.address);
    kv('Inbox ID', r.id);
    kv('Owner', r.owner);
    kv('Resource ID', String(r.resourceId));
    blank();
    info('Send with: ' + c.accent(`0gent email send ${r.id} --to you@... --subject "Hi" --body "..."`));
    info('Read with: ' + c.accent(`0gent email read ${r.id}`));
    blank();
  } catch (e) {
    sp.fail(String((e as Error).message));
    throw e;
  }
}

export async function emailSendCmd(inboxId: string, opts: { to?: string; subject?: string; body?: string }): Promise<void> {
  if (!opts.to) throw new Error('--to is required');
  if (!opts.subject) opts.subject = '';
  if (!opts.body) throw new Error('--body is required');
  const z = await getZeroGent();
  const sp = spinner(`Sending email to ${opts.to}`);
  z.onPaymentStatus = (m) => (sp.text = m);
  try {
    const r = await z.emailSend(inboxId, opts.to, opts.subject!, opts.body);
    sp.stop();
    success('Email sent');
    kv('From', r.from);
    kv('To', r.to);
    kv('Subject', r.subject);
    kv('Sent', new Date(r.timestamp).toLocaleString());
  } catch (e) {
    sp.fail(String((e as Error).message));
    throw e;
  }
}

export async function emailReadCmd(inboxId: string): Promise<void> {
  const z = await getZeroGent();
  const sp = spinner('Reading inbox');
  z.onPaymentStatus = (m) => (sp.text = m);
  try {
    const messages = await z.emailRead(inboxId);
    sp.stop();
    if (!messages.length) {
      info('No messages.');
      return;
    }
    const table = new Table({
      head: [c.dim('Dir'), c.dim('From'), c.dim('Subject'), c.dim('When')],
      style: { border: ['grey'] },
      colWidths: [6, 28, 40, 22],
      wordWrap: true,
    });
    for (const m of messages) {
      const dir = m.direction === 'inbound' ? c.brand('in') : c.accent('out');
      table.push([dir, m.from, m.subject, new Date(m.timestamp).toLocaleString()]);
    }
    console.log(table.toString());
    info(`${messages.length} message(s)`);
  } catch (e) {
    sp.fail(String((e as Error).message));
  }
}

export async function emailThreadsCmd(inboxId: string): Promise<void> {
  const z = await getZeroGent();
  const sp = spinner('Loading threads');
  z.onPaymentStatus = (m) => (sp.text = m);
  try {
    const threads = await z.emailThreads(inboxId);
    sp.stop();
    if (!threads.length) {
      info('No threads.');
      return;
    }
    const table = new Table({
      head: [c.dim('Subject'), c.dim('Messages'), c.dim('Last')],
      style: { border: ['grey'] },
    });
    for (const t of threads) {
      table.push([t.subject, String(t.messageCount), new Date(t.lastMessageAt).toLocaleString()]);
    }
    console.log(table.toString());
  } catch (e) {
    sp.fail(String((e as Error).message));
  }
}

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
    kv('Address', c.bold(c.accent(r.address)));
    kv('Inbox ID', c.mono(r.id));
    kv('Owner', c.addr(r.owner));
    kv('Resource ID', c.bold(String(r.resourceId)));
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
    kv('From', c.accent(r.from));
    kv('To', c.addr(r.to));
    kv('Subject', c.bold(r.subject || '(no subject)'));
    kv('Sent', new Date(r.timestamp).toLocaleString());
  } catch (e) {
    sp.fail(String((e as Error).message));
    throw e;
  }
}

export async function emailReadCmd(
  inboxId: string,
  opts: { compact?: boolean; limit?: string } = {}
): Promise<void> {
  const z = await getZeroGent();
  const sp = spinner('Reading inbox');
  z.onPaymentStatus = (m) => (sp.text = m);
  try {
    const all = await z.emailRead(inboxId);
    sp.stop();
    if (!all.length) {
      info('No messages.');
      return;
    }

    const limit = Number(opts.limit) || 0;
    // Show newest first; messages from API are already ordered timestamp DESC
    const messages = limit > 0 ? all.slice(0, limit) : all;

    // Compact mode: keep the old table-only view (great for scripting)
    if (opts.compact) {
      const table = new Table({
        head: [c.dim('Dir'), c.dim('From'), c.dim('Subject'), c.dim('When')],
        style: { border: ['grey'] },
        colWidths: [6, 28, 40, 22],
        wordWrap: true,
      });
      for (const m of messages) {
        const dir = m.direction === 'inbound' ? c.brand('← in') : c.accent('→ out');
        table.push([dir, m.from, m.subject, new Date(m.timestamp).toLocaleString()]);
      }
      console.log(table.toString());
      info(`${all.length} message(s)${limit > 0 && limit < all.length ? ` (showing ${limit})` : ''}`);
      return;
    }

    // Default: card-style with full body content
    blank();
    for (const m of messages) {
      const arrow = m.direction === 'inbound' ? c.brand('←') : c.accent('→');
      const dirLabel = m.direction === 'inbound' ? c.brand('inbound') : c.accent('outbound');
      const when = new Date(m.timestamp).toLocaleString();

      console.log('  ' + c.dim('─'.repeat(70)));
      console.log('  ' + arrow + ' ' + dirLabel + '  ' + c.dim(when));
      console.log();
      console.log('    ' + c.dim('from   ') + c.addr(m.from));
      console.log('    ' + c.dim('to     ') + c.addr(m.to));
      console.log('    ' + c.dim('subject') + ' ' + c.bold(m.subject || '(no subject)'));
      blank();

      // Body content
      const body = (m.body || '').trim();
      if (!body) {
        console.log('    ' + c.dim('(no body)'));
      } else {
        // Indent each line, dim quoted (lines starting with '>')
        for (const line of body.split('\n')) {
          if (line.startsWith('>')) {
            console.log('    ' + c.dim(line));
          } else {
            console.log('    ' + c.mono(line));
          }
        }
      }
      blank();
    }
    console.log('  ' + c.dim('─'.repeat(70)));
    info(`${all.length} message(s)${limit > 0 && limit < all.length ? ` (showing ${limit})` : ''}` +
      c.dim(`  •  use --compact for table view, --limit N to show fewer`));
    blank();
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

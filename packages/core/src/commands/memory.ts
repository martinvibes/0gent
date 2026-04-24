import Table from 'cli-table3';
import { getZeroGent } from './helpers.js';
import { c, success, info, kv, blank, spinner } from '../ui.js';

export async function memoryGetCmd(key: string): Promise<void> {
  const z = await getZeroGent();
  const sp = spinner(`Loading memory key "${key}"`);
  try {
    const value = await z.memory.get(key);
    sp.stop();
    if (value == null) {
      info('Not found.');
      return;
    }
    console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  } catch (e) {
    sp.fail(String((e as Error).message));
  }
}

export async function memorySetCmd(key: string, value: string): Promise<void> {
  const z = await getZeroGent();
  let parsed: unknown = value;
  try {
    parsed = JSON.parse(value);
  } catch {}
  const sp = spinner(`Writing "${key}" to 0G Storage`);
  try {
    const res = await z.memory.set(key, parsed);
    sp.stop();
    success('Stored on 0G Storage');
    kv('Key', key);
    kv('Root hash', res.rootHash);
  } catch (e) {
    sp.fail(String((e as Error).message));
  }
}

export async function memoryListCmd(): Promise<void> {
  const z = await getZeroGent();
  const sp = spinner('Loading memory keys');
  try {
    const entries = await z.memory.list();
    sp.stop();
    if (!entries.length) {
      info('No memory entries.');
      return;
    }
    const table = new Table({
      head: [c.dim('Key'), c.dim('Root hash'), c.dim('Updated')],
      style: { border: ['grey'] },
    });
    for (const e of entries) {
      table.push([c.accent(e.key), c.mono(e.rootHash.slice(0, 20) + '…'), new Date(e.updatedAt).toLocaleString()]);
    }
    console.log(table.toString());
  } catch (e) {
    sp.fail(String((e as Error).message));
  }
}

export async function memoryDeleteCmd(key: string): Promise<void> {
  const z = await getZeroGent();
  await z.memory.delete(key);
  success(`Deleted "${key}"`);
}

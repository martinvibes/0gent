import Table from 'cli-table3';
import { getZeroGent } from './helpers.js';
import { c, kv, blank, info, spinner } from '../ui.js';
import { formatEther } from 'ethers';

const EMOJI: Record<string, string> = {
  phone: '📞',
  email: '📧',
  compute: '🖥️',
  domain: '🌐',
};

export async function listCmd(): Promise<void> {
  const z = await getZeroGent();
  const sp = spinner('Loading agent resources');
  try {
    const [identity, resources, balance] = await Promise.all([
      z.identityGet().catch(() => null),
      z.listResources(),
      z.balance(),
    ]);
    sp.stop();

    blank();
    if (identity) {
      console.log(
        '  ' +
          c.bold('Agent ') +
          c.accent('#' + identity.tokenId) +
          '  ' +
          c.dim('│') +
          '  ' +
          c.addr(z.address.slice(0, 10) + '…') +
          '  ' +
          c.dim('│') +
          '  ' +
          c.ok(Number(balance.balance0G).toFixed(4) + ' 0G')
      );
    } else {
      info('No Agent Identity yet. Run "0gent identity mint".');
    }
    blank();

    if (resources.length === 0) {
      info('No resources provisioned yet. Try "0gent provision phone".');
      return;
    }

    const table = new Table({
      head: [c.dim('Type'), c.dim('Resource'), c.dim('Status'), c.dim('Expires')],
      style: { border: ['grey'] },
    });

    for (const r of resources) {
      const emoji = EMOJI[r.type] || '•';
      table.push([
        `${emoji} ${r.type}`,
        c.addr(r.providerRef),
        r.active ? c.ok('✓ active') : c.err('inactive'),
        new Date(r.expiresAt * 1000).toLocaleDateString(),
      ]);
    }
    console.log(table.toString());
    blank();
    info(`${resources.length} active resource${resources.length === 1 ? '' : 's'}`);
    blank();
  } catch (e) {
    sp.fail(String((e as Error).message));
  }
}

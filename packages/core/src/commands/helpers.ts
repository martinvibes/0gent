import inquirer from 'inquirer';
import { ZeroGent } from '../sdk.js';
import { load } from '../config.js';
import { c } from '../ui.js';

let cached: ZeroGent | null = null;

export async function getZeroGent(passphrase?: string): Promise<ZeroGent> {
  if (cached) return cached;
  const cfg = load();
  if (!cfg.defaultWalletId) {
    throw new Error('No wallet configured. Run "0gent setup" first.');
  }
  let pass = passphrase || process.env.OGENT_WALLET_PASSPHRASE;
  if (!pass) {
    const ans = await inquirer.prompt([
      {
        type: 'password',
        name: 'passphrase',
        message: 'Wallet passphrase ' + c.dim('(or set OGENT_WALLET_PASSPHRASE to skip)') + ':',
        mask: '*',
      },
    ]);
    pass = ans.passphrase;
  }
  cached = new ZeroGent({ walletId: cfg.defaultWalletId, passphrase: pass });
  return cached;
}

export function resetCache(): void {
  cached = null;
}

import inquirer from 'inquirer';
import * as bip39 from 'bip39';
import * as vault from '../vault.js';
import { save, load } from '../config.js';
import { c, printHeader, success, kv, blank, info } from '../ui.js';

export async function setupCmd(): Promise<void> {
  printHeader();
  console.log(c.bold('  Setup — one-time configuration\n'));

  if (vault.listWallets().length > 0) {
    const { replace } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'replace',
        message: 'You already have wallets. Create another?',
        default: false,
      },
    ]);
    if (!replace) {
      info('Skipping. Run "0gent wallet list" to see your wallets.');
      return;
    }
  }

  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Do you have a wallet to import?',
      choices: [
        { name: 'Create a new wallet', value: 'new' },
        { name: 'Import an existing mnemonic', value: 'import' },
      ],
    },
  ]);

  let mnemonic: string;
  if (mode === 'import') {
    const { phrase } = await inquirer.prompt([
      {
        type: 'input',
        name: 'phrase',
        message: 'Enter 12-word mnemonic:',
        validate: (v: string) => (bip39.validateMnemonic(v.trim()) ? true : 'Invalid mnemonic'),
      },
    ]);
    mnemonic = phrase.trim();
  } else {
    mnemonic = bip39.generateMnemonic();
  }

  const { label } = await inquirer.prompt([
    {
      type: 'input',
      name: 'label',
      message: 'Wallet label:',
      default: 'default',
    },
  ]);

  const { passphrase } = await inquirer.prompt([
    {
      type: 'password',
      name: 'passphrase',
      message: 'Passphrase to encrypt the wallet (min 8 chars):',
      mask: '*',
      validate: (v: string) => (v.length >= 8 ? true : 'At least 8 characters'),
    },
  ]);

  await inquirer.prompt([
    {
      type: 'password',
      name: 'confirm',
      message: 'Confirm passphrase:',
      mask: '*',
      validate: (v: string) => (v === passphrase ? true : 'Passphrases do not match'),
    },
  ]);

  if (mode === 'new') {
    blank();
    console.log(c.warn('  ⚠  Save this mnemonic somewhere safe. It will NOT be shown again.\n'));
    console.log('  ' + c.accent(mnemonic));
    blank();
    await inquirer.prompt([
      {
        type: 'confirm',
        name: 'saved',
        message: 'I have saved it securely',
        default: false,
        validate: (v: boolean) => v || 'Please confirm',
      },
    ]);
  }

  const summary = vault.importMnemonic(mnemonic, passphrase, label);

  const cfg = load();
  const { apiEndpoint } = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiEndpoint',
      message: 'API endpoint:',
      default: cfg.apiEndpoint,
    },
  ]);

  save({
    defaultWalletId: summary.id,
    defaultWalletAddress: summary.address,
    apiEndpoint,
  });

  blank();
  success('Wallet ready');
  kv('Address', summary.address);
  kv('Label', summary.label);
  kv('API', apiEndpoint);
  blank();
  info('Next steps:');
  info(`  1. Fund this address with 0G tokens (testnet faucet: https://faucet.0g.ai)`);
  info(`  2. Run: ${c.accent('0gent identity mint')}`);
  info(`  3. Run: ${c.accent('0gent provision phone')}`);
  blank();
}

import inquirer from 'inquirer';
import Table from 'cli-table3';
import qrcode from 'qrcode-terminal';
import * as vault from '../vault.js';
import { load, save } from '../config.js';
import { getProvider, explorerAddress } from '../chain.js';
import { formatEther } from 'ethers';
import { c, success, info, kv, blank, printHeader, spinner } from '../ui.js';

export async function walletCreateCmd(opts: { name?: string }): Promise<void> {
  const label = opts.name || 'agent-' + Math.random().toString(36).slice(2, 8);
  const { passphrase } = await inquirer.prompt([
    { type: 'password', name: 'passphrase', message: 'Passphrase for new wallet:', mask: '*' },
  ]);
  const result = vault.createWallet(passphrase, label);
  blank();
  console.log(c.warn('  ⚠  Save this mnemonic — it will NOT be shown again.\n'));
  console.log('  ' + c.accent(result.mnemonic));
  blank();
  success('Wallet created');
  kv('ID', result.id);
  kv('Label', result.label);
  kv('Address', result.address);
  blank();
}

export async function walletListCmd(): Promise<void> {
  const wallets = vault.listWallets();
  const cfg = load();
  if (wallets.length === 0) {
    info('No wallets yet. Run "0gent setup" to create one.');
    return;
  }
  const table = new Table({
    head: [c.dim('Label'), c.dim('Address'), c.dim('Default'), c.dim('Created')],
    style: { border: ['grey'] },
  });
  for (const w of wallets) {
    table.push([
      w.label,
      c.addr(w.address),
      w.id === cfg.defaultWalletId ? c.accent('✓') : '',
      new Date(w.createdAt).toLocaleDateString(),
    ]);
  }
  console.log(table.toString());
}

export async function walletShowCmd(): Promise<void> {
  const cfg = load();
  if (!cfg.defaultWalletAddress) {
    info('No default wallet. Run "0gent setup" first.');
    return;
  }
  const sp = spinner('Loading wallet');
  const provider = getProvider();
  const balance = await provider.getBalance(cfg.defaultWalletAddress);
  sp.stop();

  printHeader();
  success('Default wallet');
  kv('Address', cfg.defaultWalletAddress);
  kv('Balance', formatEther(balance) + ' 0G');
  kv('Network', `0G Chain (${cfg.chainId})`);
  kv('Explorer', explorerAddress(cfg.defaultWalletAddress));
  blank();
}

export async function walletFundCmd(): Promise<void> {
  const cfg = load();
  if (!cfg.defaultWalletAddress) {
    info('No default wallet. Run "0gent setup" first.');
    return;
  }
  printHeader();
  console.log(c.bold('  Fund your wallet with 0G tokens\n'));
  kv('Address', cfg.defaultWalletAddress);
  kv('Network', `0G Chain (chain ID ${cfg.chainId})`);
  kv('RPC', cfg.rpcUrl);
  blank();
  info(`Testnet faucet: https://faucet.0g.ai (0.1 0G/day)`);
  blank();
  qrcode.generate(cfg.defaultWalletAddress, { small: true });
  blank();
  info('Scan the QR or copy the address. The CLI will watch for incoming transfers for 120s.');

  const provider = getProvider();
  const before = await provider.getBalance(cfg.defaultWalletAddress);
  const sp = spinner('Watching for incoming 0G tokens...');

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5_000));
    const now = await provider.getBalance(cfg.defaultWalletAddress);
    if (now > before) {
      sp.stop();
      success(`Received ${formatEther(now - before)} 0G (new balance: ${formatEther(now)} 0G)`);
      return;
    }
    sp.text = `Still watching... (balance: ${formatEther(now)} 0G)`;
  }
  sp.fail('Timed out. Run "0gent balance" later to check.');
}

export async function walletExportCmd(idOrLabel?: string): Promise<void> {
  const cfg = load();
  const target = idOrLabel || cfg.defaultWalletId;
  if (!target) throw new Error('No wallet to export');
  const { confirm } = await inquirer.prompt([
    { type: 'confirm', name: 'confirm', message: c.err('Show mnemonic in plaintext?'), default: false },
  ]);
  if (!confirm) return;
  const { passphrase } = await inquirer.prompt([
    { type: 'password', name: 'passphrase', message: 'Passphrase:', mask: '*' },
  ]);
  const mnemonic = vault.exportMnemonic(target, passphrase);
  blank();
  console.log(c.warn('  ⚠  Handle this mnemonic with care\n'));
  console.log('  ' + c.accent(mnemonic));
  blank();
}

export async function walletUseCmd(idOrLabel: string): Promise<void> {
  const file = vault.getWalletFile(idOrLabel);
  save({ defaultWalletId: file.id, defaultWalletAddress: file.address });
  success(`Default wallet set to ${c.addr(file.address)}`);
}

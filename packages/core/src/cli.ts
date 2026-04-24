#!/usr/bin/env node
import { Command } from 'commander';
import { setupCmd } from './commands/setup.js';
import {
  walletCreateCmd,
  walletListCmd,
  walletShowCmd,
  walletFundCmd,
  walletExportCmd,
  walletUseCmd,
} from './commands/wallet.js';
import { identityMintCmd, identityShowCmd } from './commands/identity.js';
import {
  phoneSearchCmd,
  phoneProvisionCmd,
  phoneSmsCmd,
  phoneLogsCmd,
} from './commands/phone.js';
import {
  emailProvisionCmd,
  emailSendCmd,
  emailReadCmd,
  emailThreadsCmd,
} from './commands/email.js';
import { listCmd } from './commands/list.js';
import {
  memoryGetCmd,
  memorySetCmd,
  memoryListCmd,
  memoryDeleteCmd,
} from './commands/memory.js';
import {
  skillCmd,
  balanceCmd,
  pricingCmd,
  healthCmd,
  doctorCmd,
} from './commands/misc.js';
import { c } from './ui.js';

const program = new Command();

program
  .name('0gent')
  .description('Decentralized infrastructure for autonomous AI agents on 0G Chain')
  .version('0.1.0');

program.command('setup').description('Interactive first-time setup').action(withErr(setupCmd));

// ── wallet ──
const wallet = program.command('wallet').description('Manage agent wallets');
wallet
  .command('create')
  .description('Create a new wallet')
  .option('-n, --name <name>', 'wallet label')
  .action(withErr(walletCreateCmd));
wallet.command('list').description('List all wallets').action(withErr(walletListCmd));
wallet.command('show').description('Show default wallet').action(withErr(walletShowCmd));
wallet.command('fund').description('Fund your wallet (QR + watcher)').action(withErr(walletFundCmd));
wallet
  .command('export [idOrLabel]')
  .description('Export mnemonic (dangerous)')
  .action(withErr(walletExportCmd));
wallet
  .command('use <idOrLabel>')
  .description('Set default wallet')
  .action(withErr(walletUseCmd));

// ── identity ──
const identity = program.command('identity').description('Manage Agent Identity NFT');
identity
  .command('mint')
  .description('Mint your Agent Identity NFT (costs 0.1 0G)')
  .option('-n, --name <name>', 'optional agent name')
  .action(withErr(identityMintCmd));
identity.command('show').description('Show your agent identity').action(withErr(identityShowCmd));

// ── phone ──
const phone = program.command('phone').description('Phone numbers and SMS');
phone
  .command('search')
  .description('Search available phone numbers')
  .option('-c, --country <code>', 'country ISO-2', 'US')
  .option('-a, --area-code <code>', 'area code')
  .action(withErr(phoneSearchCmd));
phone
  .command('provision')
  .description('Provision a phone number')
  .option('-c, --country <code>', 'country ISO-2', 'US')
  .option('-a, --area-code <code>', 'area code')
  .option('-y, --yes', 'skip confirmation')
  .action(withErr(phoneProvisionCmd));
phone
  .command('sms <phoneId>')
  .description('Send SMS from a provisioned number')
  .option('-t, --to <number>', 'destination E.164 (+1...)')
  .option('-b, --body <text>', 'message body')
  .action(withErr(phoneSmsCmd));
phone
  .command('logs <phoneId>')
  .description('Show SMS history for a number')
  .action(withErr(phoneLogsCmd));

// `0gent provision phone` convenience alias
const provision = program.command('provision').description('Provision a resource (alias)');
provision
  .command('phone')
  .option('-c, --country <code>', 'country ISO-2', 'US')
  .option('-a, --area-code <code>', 'area code')
  .option('-y, --yes')
  .action(withErr(phoneProvisionCmd));
provision
  .command('email')
  .option('-n, --name <localPart>')
  .option('-y, --yes')
  .action(withErr(emailProvisionCmd));

// ── email ──
const email = program.command('email').description('Email inboxes');
email
  .command('create')
  .description('Create a new email inbox (costs 0.2 0G)')
  .option('-n, --name <localPart>', 'local part of address')
  .option('-y, --yes', 'skip confirmation')
  .action(withErr(emailProvisionCmd));
email
  .command('send <inboxId>')
  .description('Send an email from a provisioned inbox')
  .option('-t, --to <address>', 'recipient')
  .option('-s, --subject <text>', 'subject')
  .option('-b, --body <text>', 'body')
  .action(withErr(emailSendCmd));
email.command('read <inboxId>').description('Read inbox').action(withErr(emailReadCmd));
email.command('threads <inboxId>').description('List threads').action(withErr(emailThreadsCmd));

// ── memory ──
const memory = program.command('memory').description('Agent memory on 0G Storage');
memory.command('set <key> <value>').description('Store memory value').action(withErr(memorySetCmd));
memory.command('get <key>').description('Read memory value').action(withErr(memoryGetCmd));
memory.command('list').description('List memory keys').action(withErr(memoryListCmd));
memory.command('delete <key>').description('Delete memory key').action(withErr(memoryDeleteCmd));

// ── info ──
program.command('list').description('List owned resources').action(withErr(listCmd));
program.command('skill').description('Print the skill.md catalog').action(withErr(skillCmd));
program.command('balance').description('Show wallet balance').action(withErr(balanceCmd));
program.command('pricing').description('Show service prices').action(withErr(pricingCmd));
program.command('health').description('API + chain health').action(withErr(healthCmd));
program.command('doctor').description('Diagnose setup').action(withErr(doctorCmd));

program.parseAsync().catch((err) => {
  console.error('\n  ' + c.err('✗') + ' ' + (err.message || String(err)) + '\n');
  process.exit(1);
});

function withErr<T extends (...args: any[]) => Promise<void> | void>(fn: T): T {
  return (async (...args: any[]) => {
    try {
      await fn(...args);
    } catch (err: any) {
      console.error('\n  ' + c.err('✗') + ' ' + (err.message || String(err)) + '\n');
      process.exit(1);
    }
  }) as T;
}

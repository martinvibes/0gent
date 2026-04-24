import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export const c = {
  accent: (s: string) => chalk.hex('#B75FFF')(s),
  brand: (s: string) => chalk.hex('#9200E1')(s),
  ok: (s: string) => chalk.hex('#3fb950')(s),
  err: (s: string) => chalk.hex('#f85149')(s),
  warn: (s: string) => chalk.yellow(s),
  dim: (s: string) => chalk.dim(s),
  addr: (s: string) => chalk.cyan(s),
  mono: (s: string) => chalk.hex('#c9d1d9')(s),
  bold: (s: string) => chalk.bold(s),
};

export function spinner(text: string): Ora {
  return ora({ text, color: 'magenta', spinner: 'dots' }).start();
}

export function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function shortHash(hash: string, n = 8): string {
  if (!hash) return hash;
  return `${hash.slice(0, n + 2)}…`;
}

export function printHeader(): void {
  console.log('');
  console.log('  ' + c.brand('▓▓') + c.accent('▓▓') + '  ' + c.bold('0GENT'));
  console.log('  ' + c.dim('Infrastructure for autonomous AI agents on 0G Chain'));
  console.log('');
}

export function success(msg: string): void {
  console.log('  ' + c.ok('✓') + ' ' + msg);
}

export function fail(msg: string): void {
  console.log('  ' + c.err('✗') + ' ' + msg);
}

export function info(msg: string): void {
  console.log('  ' + c.dim('›') + ' ' + msg);
}

export function kv(key: string, value: string, keyWidth = 14): void {
  const padded = key.padEnd(keyWidth);
  console.log('  ' + c.dim(padded) + c.mono(value));
}

export function blank(): void {
  console.log('');
}

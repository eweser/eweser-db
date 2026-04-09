/* eslint-disable no-console -- this IS the logger utility */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function logger(...log: unknown[]) {
  if (log.length === 1 && log[0] instanceof Error) {
    console.error(log[0]);
    return;
  }

  console.log(...log);
}

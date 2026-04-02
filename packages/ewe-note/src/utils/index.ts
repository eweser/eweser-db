import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function logger(...log: any[]) {
  if (log instanceof Error) {
    // eslint-disable-next-line no-console
    console.error(log);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(...log);
}

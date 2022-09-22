import type { DocumentBase } from './documentBase';

export type FlashCard = DocumentBase<{
  frontText: string;
  backText: string;
  noteLink?: string;
}>;

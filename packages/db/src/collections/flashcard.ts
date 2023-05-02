import type { DocumentBase } from './documentBase';

export type FlashcardBase = {
  frontText: string;
  backText: string;
  noteRefs?: string[];
};
export type FlashCard = DocumentBase & FlashcardBase;

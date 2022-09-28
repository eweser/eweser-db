import type { DocumentBase } from './documentBase';

export type FlashcardBase = {
  frontText: string;
  backText: string;
  noteLink?: string;
};
export type FlashCard = DocumentBase<FlashcardBase>;

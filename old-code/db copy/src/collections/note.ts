import type { DocumentBase } from './documentBase';

export type NoteBase = {
  text: string;
  flashcardRefs?: string[];
};

export type Note = DocumentBase & NoteBase;

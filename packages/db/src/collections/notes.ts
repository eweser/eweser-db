import type { DocumentBase } from './documentBase';

export type NoteBase = {
  text: string;
};

export type Note = DocumentBase & NoteBase;

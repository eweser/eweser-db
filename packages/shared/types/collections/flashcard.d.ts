import type { DocumentBase } from './documentBase';
export type FlashcardBase = {
    frontText: string;
    backText: string;
    noteRefs?: string[];
    /** IDs of folders this flashcard belongs to */
    folderIds?: string[];
};
export type Flashcard = DocumentBase & FlashcardBase;

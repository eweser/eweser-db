import type { DocumentBase } from './documentBase';
export type NoteBase = {
    text: string;
    flashcardRefs?: string[];
    /** Relative path within the vault, e.g. 'Folder A/Subfolder/My Note.md' */
    sourcePath?: string;
    /** Vault name for multi-vault support */
    sourceVault?: string;
    /** Parsed YAML frontmatter properties */
    frontmatter?: Record<string, unknown>;
    /** Aliases from frontmatter, indexed for wiki-link resolution */
    aliases?: string[];
    /** Tags extracted from frontmatter + inline #tags */
    tags?: string[];
    /** IDs of folders this note belongs to */
    folderIds?: string[];
};
export type Note = DocumentBase & NoteBase;

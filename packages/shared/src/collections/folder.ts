import type { DocumentBase } from './documentBase.js';

export type FolderBase = {
  name: string;
  parentFolderId?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
  archived?: boolean;
};

export type Folder = DocumentBase & FolderBase;

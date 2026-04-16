import type { DocumentBase } from './documentBase.js';

export type ProfileBase = {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
};

export type Profile = DocumentBase & ProfileBase;

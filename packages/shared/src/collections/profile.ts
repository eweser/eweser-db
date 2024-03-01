import type { DocumentBase } from './documentBase';

export type ProfileBase = {
  firstName?: any;
  lastName?: string;
  avatarUrl?: string;
};

export type Profile = DocumentBase & ProfileBase;

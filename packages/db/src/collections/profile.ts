import type { DocumentBase } from './documentBase';

export type ProfileBase = {
  firstName: string;
};

export type Profile = DocumentBase & ProfileBase;

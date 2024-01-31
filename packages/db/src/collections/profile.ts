import type { DocumentBase } from './documentBase';

export type ProfileBase = {
  firstName?: any;
  lastName?: string;
  avatarUrl?: string;
};

export type Profile = DocumentBase & ProfileBase;

const profile: Profile = {
  firstName: 42,
  lastName: 'Doe',
  avatarUrl: 'https://example.com/avatar.png',
};

const otherPRofile = [
  ['firstName', 42],
  ['lastName', 'Doe'],
  ['avatarUrl', 'https://example.com/avatar.png'],
];

export type SiteConfig = typeof siteConfig;
const name = 'Eweser DB';
export const siteConfig = {
  name,
  pageName: (page: string) => `${page} | ${name}`,
  description: 'EweserDB, the user-owned database. Just for ewe 🐑',
  mainNav: [
    {
      title: 'Home',
      href: '/home',
    },
  ],
  links: {
    github: 'https://github.com/eweser/eweser-db',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/eweser-db-logo.png',
    apple: '/eweser-db-logo-small.svg',
  },
};

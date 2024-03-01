import '../frontend/styles/globals.css';
import type { Metadata } from 'next';

import { siteConfig } from '../frontend/config/site';
import { fontSans } from '../frontend/styles/fonts';
import { cn } from '../shared/utils';
import { ThemeProvider } from '../frontend/theme-provider';
import { SiteHeader } from '../frontend/components/site-header';

interface RootLayoutProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: siteConfig.icons,
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            'min-h-screen bg-background font-sans antialiased',
            fontSans.variable
          )}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="relative flex min-h-screen flex-col">
              <SiteHeader />
              <div className="flex-1 flex flex-col">{children}</div>
            </div>
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}

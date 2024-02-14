import * as React from 'react';
import Link from 'next/link';

import { siteConfig } from '@/frontend/config/site';
import { cn } from '@/shared/utils';
import { Icons } from '@/frontend/components/library/icons';
import { getLoginStatus } from '@/modules/account/get-login-status';

export interface NavItem {
  title: string;
  href?: string;
  disabled?: boolean;
  external?: boolean;
}

interface MainNavProps {
  items: NavItem[];
}

export async function MainNav({ items }: MainNavProps) {
  const loggedIn = await getLoginStatus();

  const navItems: NavItem[] = loggedIn
    ? [{ title: 'Sign Out', href: '/auth/sign-out' }, ...items]
    : [{ title: 'Sign In', href: '/' }];

  return (
    <div className="flex gap-6 md:gap-10">
      <Link href="/" className="flex items-center space-x-2">
        <Icons.logo className="h-6 w-6" />
        <span className="inline-block font-bold">{siteConfig.name}</span>
      </Link>

      {navItems?.length ? (
        <nav className="flex gap-6">
          {navItems?.map(
            (item, index) =>
              item.href && (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    'flex items-center text-sm font-medium text-muted-foreground',
                    item.disabled && 'cursor-not-allowed opacity-80'
                  )}
                >
                  {item.title}
                </Link>
              )
          )}
        </nav>
      ) : null}
    </div>
  );
}

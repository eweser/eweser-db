'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import H2 from '../library/typography-h2';
import { Icons } from '../library/icons';

export function PermissionsUnchangedRedirect({
  redirectUrl,
}: {
  redirectUrl: string;
}) {
  const router = useRouter();
  useEffect(() => {
    setTimeout(() => {
      router.replace(redirectUrl);
    }, 1000);
  });
  return (
    <div>
      <H2>Permission already granted. </H2>
      <h4 className="pt-6 text-primary">Redirecting you now...</h4>
      <Icons.spinner className="animate-spin m-auto mt-10 text-gray-500 w-20 h-20" />
    </div>
  );
}

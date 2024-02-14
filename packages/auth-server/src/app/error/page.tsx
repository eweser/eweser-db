import { Button } from '@/frontend/components/library/button';
import Link from 'next/link';

export default function ErrorPage({
  searchParams,
}: {
  searchParams: { message?: string };
}) {
  const message = searchParams.message;

  return (
    <div className="max-w-lg self-center pt-10">
      <h1 className="text-2xl font-bold mb-4">Error</h1>
      <hr className="my-5" />
      <code>{message || 'An error occurred.'}</code>
      <hr className="my-5" />
      <Button asChild>
        <Link href="/">Go back home</Link>
      </Button>
    </div>
  );
}

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
      <code className="py-2">{message || 'An error occurred.'}</code>

      <Link
        href="/"
        className="underline underline-offset-4 hover:text-secondary/90 text-secondary "
      >
        Go back home{' '}
      </Link>
    </div>
  );
}

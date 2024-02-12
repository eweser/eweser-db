export default function ErrorPage({
  searchParams,
}: {
  searchParams: { message?: string };
}) {
  const message = searchParams.message;

  return (
    <div className="max-w-lg self-center pt-10">
      <h1 className="text-2xl font-bold mb-4">Error</h1>
      <p className="py-2">{message || 'An error occurred.'}</p>
    </div>
  );
}

export async function GET() {
  return Response.json({ reply: 'pong' });
}

export function OPTIONS() {
  return new Response('ok', { status: 200 });
}

// Authentication and authorization are enforced inside server pages and API routes.
// Keeping Edge middleware disabled avoids loading Node-only dependencies in Vercel Edge.
export function middleware() {
  return new Response(null, { status: 204 });
}

export const config = {
  matcher: ["/__postcutz_middleware_disabled"]
};

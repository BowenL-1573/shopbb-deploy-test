/**
 * routes/[robots.txt].tsx — /robots.txt
 */

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const txt = `User-agent: *
Allow: /
Disallow: /cart
Disallow: /checkout
Disallow: /payment
Disallow: /account
Disallow: /login
Disallow: /register

Sitemap: ${url.protocol}//${url.host}/sitemap.xml
`;
  return new Response(txt, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

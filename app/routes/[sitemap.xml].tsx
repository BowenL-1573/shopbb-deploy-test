/**
 * routes/[sitemap.xml].tsx — /sitemap.xml
 *
 * 用 helium getSitemap 生成。
 */

import { getSitemap } from '@shopbb/helium';
import type { Route } from './+types/[sitemap.xml]';

export async function loader({ request, context }: Route.LoaderArgs) {
  const xml = await getSitemap({
    storefront: context.helium.storefront,
    request,
    types: ['products'],
    pageSize: 250,
  });
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  });
}

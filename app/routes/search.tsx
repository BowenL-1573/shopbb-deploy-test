/**
 * routes/search.tsx — /search?q=xxx
 */

import { useLoaderData, Link, Form } from 'react-router';
import { Image, Money } from '@shopbb/helium/components';
import { Header, Footer } from '~/components/Header';
import { useRootLoader } from '~/root';
import type { Route } from './+types/search';

const SEARCH_QUERY = /* GraphQL */ `
  query Search($query: String!, $first: Int!) {
    search(query: $query) {
      productsCount
      products(first: $first) {
        nodes {
          id handle title productType
          featuredImage { url altText width height }
          priceRange { minVariantPrice { amount currencyCode } }
        }
      }
    }
  }
`;

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  if (!q.trim()) return { q: '', results: [], totalCount: 0 };
  try {
    const data: any = await context.helium.storefront.query(SEARCH_QUERY, { variables: { query: q, first: 40 } });
    return {
      q,
      results: data?.search?.products?.nodes ?? [],
      totalCount: data?.search?.productsCount ?? 0,
    };
  } catch (err: any) {
    console.error('[search-loader]', err?.message || err);
    return { q, results: [], totalCount: 0 };
  }
}

export const meta: Route.MetaFunction = ({ data }) => {
  const q = (data as any)?.q || '';
  return [{ title: q ? `搜索 "${q}" · Shopflare` : '搜索 · Shopflare' }];
};

export default function SearchRoute() {
  const { q, results, totalCount } = useLoaderData<typeof loader>() as any;
  const root = useRootLoader();
  const shopName = root?.store?.shopName || 'Shopflare';

  return (
    <>
      <Header shopName={shopName} />
      <main className="sf-container" style={{ padding: '56px 0 80px' }}>
        <h1 style={{ marginBottom: 24 }}>搜索</h1>
        <Form method="GET" className="se-form">
          <input type="search" name="q" defaultValue={q} placeholder="搜索商品" autoFocus />
          <button type="submit">搜索</button>
        </Form>

        {q && (
          <p style={{ color: 'var(--c-muted)', margin: '20px 0' }}>
            {totalCount > 0 ? `共 ${totalCount} 件结果` : '没有匹配的商品'}
          </p>
        )}

        {results.length > 0 && (
          <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 24 }}>
            {results.map((p: any) => (
              <Link key={p.id} to={`/products/${p.handle}`} className="pc">
                <div className="pc-media" style={{ aspectRatio: '1/1', background: 'var(--c-bg-soft)', borderRadius: 12, overflow: 'hidden' }}>
                  {p.featuredImage?.url ? (
                    <Image data={p.featuredImage} alt={p.featuredImage.altText || p.title} sizes="240px" />
                  ) : <div style={{ width: '100%', height: '100%', background: 'var(--c-bg-soft-2)' }} />}
                </div>
                <div className="pc-info" style={{ padding: '16px 6px 8px' }}>
                  {p.productType && <div style={{ fontSize: 11, color: 'var(--c-muted-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{p.productType}</div>}
                  <div style={{ fontSize: 15, marginBottom: 6 }}>{p.title}</div>
                  <Money data={p.priceRange.minVariantPrice} style={{ fontSize: 17, fontWeight: 600 }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer shopName={shopName} />
      <style dangerouslySetInnerHTML={{ __html: `
.se-form { display: flex; gap: 8px; max-width: 480px; }
.se-form input { flex: 1; padding: 11px 16px; background: var(--c-bg-soft); border: 1px solid transparent; border-radius: var(--r-pill); font-family: inherit; font-size: 14.5px; outline: none; }
.se-form input:focus { background: #fff; border-color: var(--c-line-2); }
.se-form button { padding: 11px 24px; background: var(--c-ink); color: #fff; border: none; border-radius: var(--r-pill); font-family: inherit; font-size: 14.5px; font-weight: 600; cursor: pointer; }
.pc:hover .pc-media img { transform: scale(1.05); transition: transform 600ms ease; }
`}} />
    </>
  );
}

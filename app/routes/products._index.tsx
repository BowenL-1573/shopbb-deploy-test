/**
 * routes/products._index.tsx — /products
 *
 * 商品列表 — cursor 分页（helium <Pagination>）。
 */

import { useLoaderData, Link } from 'react-router';
import { Image, Money, Pagination, getPaginationVariables } from '@shopbb/helium/components';
import { Header, Footer } from '~/components/Header';
import { useRootLoader } from '~/root';
import type { Route } from './+types/products._index';

const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        cursor
        node {
          id handle title productType
          featuredImage { url altText width height }
          priceRange { minVariantPrice { amount currencyCode } }
        }
      }
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
    }
  }
`;

export async function loader({ request, context }: Route.LoaderArgs) {
  // oxygen 当前只支持 forward pagination — 把 helium 的 variables 适配
  const vars = getPaginationVariables(request, { pageBy: 20 });
  const variables = {
    first: vars.first ?? vars.last ?? 20,
    after: vars.endCursor ?? null,
  };
  const data = await context.helium.storefront.query<any>(PRODUCTS_QUERY, { variables });
  return { products: data.products };
}

export const meta: Route.MetaFunction = () => [
  { title: '全部商品 · Shopflare' },
  { name: 'description', content: '浏览 Shopflare 全部 Cloudflare 周边商品' },
];

export default function ProductsPage() {
  const { products } = useLoaderData<typeof loader>() as any;
  const root = useRootLoader();
  const shopName = root?.store?.shopName || 'Shopflare';

  return (
    <>
      <Header shopName={shopName} />
      <main className="sf-container" style={{ padding: '56px 0' }}>
        <header style={{ textAlign: 'center', marginBottom: 56 }}>
          <h1>全部商品</h1>
        </header>

        <Pagination connection={products}>
          {({ nodes, hasPreviousPage, hasNextPage, PreviousLink, NextLink }) => (
            <>
              {hasPreviousPage && (
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <PreviousLink className="pl-btn">← 上一页</PreviousLink>
                </div>
              )}

              <div className="product-grid">
                {nodes.map((p: any) => (
                  <Link key={p.id} to={`/products/${p.handle}`} className="pc">
                    <div className="pc-media">
                      {p.featuredImage?.url ? (
                        <Image data={p.featuredImage} alt={p.featuredImage.altText || p.title} sizes="(min-width: 1024px) 280px, 50vw" />
                      ) : <div className="pc-media-empty" />}
                    </div>
                    <div className="pc-info">
                      {p.productType && <div className="pc-cat">{p.productType}</div>}
                      <div className="pc-title">{p.title}</div>
                      <Money data={p.priceRange.minVariantPrice} className="pc-price" />
                    </div>
                  </Link>
                ))}
              </div>

              {hasNextPage && (
                <div style={{ textAlign: 'center', marginTop: 48 }}>
                  <NextLink className="pl-btn">下一页 →</NextLink>
                </div>
              )}
            </>
          )}
        </Pagination>
      </main>
      <Footer shopName={shopName} />
      <ProductsStyles />
    </>
  );
}

function ProductsStyles() {
  return <style dangerouslySetInnerHTML={{ __html: `
.pl-btn { display: inline-block; padding: 12px 28px; background: var(--c-ink); color: #fff; border-radius: var(--r-pill); font-size: 14px; font-weight: 600; }
.pl-btn:hover { background: var(--c-accent); color: #fff; }
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 24px; }
.pc-media { aspect-ratio: 1/1; background: var(--c-bg-soft); border-radius: var(--r-lg); overflow: hidden; }
.pc-media img { width: 100%; height: 100%; object-fit: cover; transition: transform 600ms ease; }
.pc:hover .pc-media img { transform: scale(1.05); }
.pc-info { padding: 16px 6px 8px; }
.pc-cat { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--c-muted-2); margin-bottom: 6px; }
.pc-title { font-size: 15px; color: var(--c-ink); margin-bottom: 6px; }
.pc-price { font-size: 17px; font-weight: 600; }
.pc-media-empty { width: 100%; height: 100%; background: linear-gradient(135deg, var(--c-bg-soft-2), var(--c-line)); }
`}} />;
}

/**
 * routes/_index.tsx — /
 *
 * 对齐 Hydrogen skeleton 模式：
 *   - loader: 服务端拉数据
 *   - meta: 动态 <title> + <meta>
 *   - default export: 组件用 useLoaderData()
 */

import { useLoaderData, Link, useRevalidator } from 'react-router';
import { Image, Money, ClaimableDiscountList } from '@shopbb/helium/components';
import { Header, Footer } from '~/components/Header';
import type { Route } from './+types/_index';

const HOME_QUERY = /* GraphQL */ `
  query Home {
    shop { name description }
    products(first: 12) {
      nodes {
        id handle title productType
        featuredImage { url altText width height }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
    publicDiscounts(first: 3) {
      nodes {
        id code title description valueType
        value {
          __typename
          ... on DiscountPercentage { percentage }
          ... on DiscountAmount { amount { amount currencyCode } }
          ... on DiscountFreeShipping { freeShipping }
        }
        minSubtotal { amount currencyCode }
        startsAt endsAt
      }
    }
  }
`;

const MY_CLAIMS_QUERY = /* GraphQL */ `
  query MyHomeClaims {
    customer {
      discountClaims(first: 50, includeUsed: true, includeExpired: true) {
        nodes {
          id usedCount remainingUses isExpired
          discount { id code title valueType }
        }
      }
    }
  }
`;

export async function loader({ context, request }: Route.LoaderArgs) {
  const { storefront, customer, store } = context.helium;
  const apiBase = store.apiBase;

  const [gqlData, bannerData, claimsData] = await Promise.all([
    storefront.query<{ shop: any; products: { nodes: any[] }; publicDiscounts: { nodes: any[] } }>(HOME_QUERY).catch((err) => {
      console.error('[home-loader] storefront.query failed:', err?.message || err);
      return null;
    }),
    fetch(`${apiBase}/api/homepage/config?subdomain=${encodeURIComponent(store.subdomain)}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null) as Promise<any>,
    // 拉买家已有 claim（用于标记首页的「已领取」状态）；未登录则 null
    customer.query<{ customer: { discountClaims: { nodes: any[] } } | null }>(MY_CLAIMS_QUERY).catch(() => null),
  ]);

  const publicDiscounts = gqlData?.publicDiscounts?.nodes ?? [];
  const myClaims = claimsData?.customer?.discountClaims?.nodes ?? [];

  return {
    shop: gqlData?.shop ?? { name: store.shopName, description: '' },
    products: gqlData?.products?.nodes ?? [],
    banners: bannerData?.banners ?? [],
    publicDiscounts,
    myClaims,
    shopName: store.shopName,
  };
}

export const meta: Route.MetaFunction = ({ data }) => {
  const shop = (data as any)?.shop;
  return [
    { title: shop?.name ? `${shop.name} · Cloudflare 周边官方商城` : 'Shopflare' },
    { name: 'description', content: shop?.description || 'Cloudflare 周边官方商城 · 跑在 shopbb 平台上' },
    { property: 'og:title', content: shop?.name || 'Shopflare' },
    { property: 'og:description', content: shop?.description || '' },
    { property: 'og:type', content: 'website' },
  ];
};

export default function HomePage() {
  const data = useLoaderData<typeof loader>();
  const { shop, products, banners, publicDiscounts, myClaims, shopName } = data as any;
  const heroBanner = banners[0];
  const revalidator = useRevalidator();

  async function handleClaim(d: { code: string | null }) {
    if (!d.code) return;
    const fd = new FormData();
    fd.append('code', d.code);
    const res = await fetch('/claim-discount', { method: 'POST', body: fd });
    const result: any = await res.json();
    if (result?.redirect) {
      window.location.href = result.redirect + `?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (result?.error) {
      throw new Error(result.error);
    }
    // 让 loader 重跑，把 myClaims 拉新；按钮会自动切换为「已领取」
    revalidator.revalidate();
  }

  return (
    <>
      <Header shopName={shopName} />

      <main>
        <section className="hero">
          {heroBanner && (
            <Image
              data={{ url: heroBanner.image_url, altText: '' }}
              className="hero-bg"
              loading="eager"
              sizes="100vw"
            />
          )}
          <div className="hero-overlay" />
          <div className="hero-content">
            <span className="hero-eyebrow">CLOUDFLARE OFFICIAL</span>
            <h1>{shop.name}</h1>
            <p>{shop.description || 'Cloudflare 周边官方商城'}</p>
            <div className="hero-ctas">
              <Link to="/products" className="hero-cta">
                浏览全部商品
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {publicDiscounts.length > 0 && (
        <section className="home-discounts">
          <div className="sf-container">
            <ClaimableDiscountList
              discounts={publicDiscounts}
              myClaims={myClaims}
              onClaim={handleClaim}
              first={3}
              className="home-discount-grid"
            />
          </div>
        </section>
        )}

        <section className="featured">
          <div className="sf-container">
            <div className="featured-head">
              <h2>编辑精选</h2>
              <p>买手团队精选的本季必备 Cloudflare 周边</p>
            </div>
            <div className="product-grid">
              {products.map((p: any) => (
                <Link key={p.id} to={`/products/${p.handle}`} className="pc">
                  <div className="pc-media">
                    {p.featuredImage?.url ? (
                      <Image
                        data={p.featuredImage}
                        alt={p.featuredImage.altText || p.title}
                        sizes="(min-width: 1024px) 280px, 50vw"
                      />
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
          </div>
        </section>

        <section className="trust-bar">
          <div className="sf-container trust-bar-grid">
            {[
              ['🌍', '全球边缘配送', 'Cloudflare 330+ 节点覆盖'],
              ['↻', '无忧退换', '7 天无理由退换货'],
              ['🛡', '品质保障', 'Cloudflare 官方品质'],
              ['💬', '24/7 客服', '跑在 Workers 上的客服'],
            ].map(([icon, title, desc]) => (
              <div key={title} className="trust-item">
                <div className="trust-icon">{icon}</div>
                <div>
                  <div className="trust-title">{title}</div>
                  <div className="trust-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer shopName={shopName} />
      <HomeStyles />
    </>
  );
}

function HomeStyles() {
  return <style dangerouslySetInnerHTML={{ __html: `
.hero { position: relative; min-height: 88vh; display: flex; align-items: center; justify-content: center; background: #000; color: #fff; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: brightness(0.6); }
.hero-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%); }
.hero-content { position: relative; z-index: 1; max-width: 720px; padding: 0 24px; text-align: center; }
.hero-eyebrow { display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: 0.18em; color: #fb923c; padding: 6px 16px; background: rgba(251,146,60,0.12); border: 1px solid rgba(251,146,60,0.3); border-radius: 999px; margin-bottom: 28px; }
.hero h1 { font-size: clamp(40px, 7vw, 80px); color: #fff; letter-spacing: -0.03em; margin: 0 0 18px; }
.hero p { font-size: 18px; color: rgba(255,255,255,0.85); margin: 0 0 36px; }
.hero-ctas { display: inline-flex; gap: 12px; align-items: center; flex-wrap: wrap; justify-content: center; }
.hero-cta { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; background: #fff; color: #1a1a1a; border-radius: 999px; font-size: 15px; font-weight: 600; }
.hero-cta:hover { transform: translateY(-1px); box-shadow: 0 10px 24px -8px rgba(0,0,0,0.4); color: #1a1a1a; }
.home-discounts { padding: 48px 0 0; }
.home-discount-grid { /* 用 [data-claimable-discount-list] 全局样式 */ }
.featured { padding: 96px 0; }
.featured-head { text-align: center; margin-bottom: 56px; }
.featured-head h2 { margin: 0 0 12px; }
.featured-head p { color: var(--c-muted); font-size: 16px; }
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 32px 24px; }
.pc { display: block; transition: transform 220ms cubic-bezier(.2,.8,.2,1); }
.pc:hover { transform: translateY(-4px); }
.pc:hover .pc-title { color: var(--c-accent); }
.pc-media { aspect-ratio: 1/1; background: var(--c-bg-soft); border-radius: var(--r-lg); overflow: hidden; }
.pc-media img { width: 100%; height: 100%; object-fit: cover; transition: transform 600ms ease; }
.pc:hover .pc-media img { transform: scale(1.05); }
.pc-info { padding: 16px 6px 8px; }
.pc-cat { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--c-muted-2); margin-bottom: 6px; }
.pc-title { font-size: 15px; color: var(--c-ink); margin-bottom: 6px; }
.pc-price { font-size: 17px; font-weight: 600; color: var(--c-ink); }
.pc-media-empty { width: 100%; height: 100%; background: linear-gradient(135deg, var(--c-bg-soft-2), var(--c-line)); }
.trust-bar { padding: 72px 0; background: var(--c-bg-soft); border-top: 1px solid var(--c-line); margin-top: 24px; }
.trust-bar-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.trust-item {
  display: flex; align-items: center; gap: 16px;
  background: #fff; padding: 20px 22px;
  border: 1px solid var(--c-line); border-radius: var(--r-xl);
  transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
}
.trust-item:hover { transform: translateY(-2px); border-color: var(--c-line-2); box-shadow: 0 6px 18px -8px rgba(0,0,0,0.08); }
.trust-icon {
  font-size: 24px; width: 48px; height: 48px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--c-bg-soft); border-radius: 12px; flex-shrink: 0;
}
.trust-title { font-size: 14.5px; font-weight: 700; }
.trust-desc { font-size: 12.5px; color: var(--c-muted); margin-top: 2px; }
`}} />;
}

/**
 * routes/products.$handle.tsx — /products/:handle
 *
 * 商品详情 — 用 <AddToCartButton>（底层包 <CartForm>，无 JS 也能加购）
 */

import { useLoaderData, Link } from 'react-router';
import * as React from 'react';
import { Image, ProductPrice, AddToCartButton, ClaimableDiscountList } from '@shopbb/helium/components';
import { Header, Footer } from '~/components/Header';
import { useRootLoader } from '~/root';
import type { Route } from './+types/products.$handle';

const PRODUCT_QUERY = /* GraphQL */ `
  query Product($handle: String!) {
    product(handle: $handle) {
      id handle title description productType vendor
      featuredImage { url altText }
      images(first: 8) { nodes { url altText width height } }
      variants(first: 50) {
        nodes {
          id title sku availableForSale quantityAvailable
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
        }
      }
    }
    productDiscounts(productHandle: $handle) {
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
`;

export async function loader({ params, context }: Route.LoaderArgs) {
  const handle = params.handle!;
  const data = await context.helium.storefront.query<any>(PRODUCT_QUERY, { variables: { handle } }).catch((err) => {
    console.error('[product-loader]', err?.message || err);
    return null;
  });
  if (!data?.product) {
    throw new Response('Product not found', { status: 404 });
  }
  const productDiscounts = Array.isArray(data.productDiscounts) ? data.productDiscounts : [];
  return { product: data.product, productDiscounts };
}

export const meta: Route.MetaFunction = ({ data }) => {
  const product = (data as any)?.product;
  if (!product) return [{ title: '商品不存在 · Shopflare' }];
  return [
    { title: `${product.title} · Shopflare` },
    { name: 'description', content: (product.description || '').slice(0, 160) || 'Cloudflare 周边商品' },
    { property: 'og:title', content: product.title },
    { property: 'og:type', content: 'product' },
    ...(product.featuredImage?.url ? [{ property: 'og:image', content: product.featuredImage.url } as any] : []),
  ];
};

export default function ProductDetailPage() {
  const { product, productDiscounts } = useLoaderData<typeof loader>() as any;
  const root = useRootLoader();
  const shopName = root?.store?.shopName || 'Shopflare';

  const variants = product.variants.nodes;
  const [selectedId, setSelectedId] = React.useState<string>(() => {
    const v = variants.find((x: any) => x.availableForSale) || variants[0];
    return v?.id || '';
  });
  const [quantity, setQuantity] = React.useState(1);
  const [activeImg, setActiveImg] = React.useState(0);

  const selectedVariant = variants.find((v: any) => v.id === selectedId) || variants[0];
  const images = product.images.nodes;
  const hasMultiple = variants.length > 1;
  const maxQty = selectedVariant?.quantityAvailable ?? 99;

  return (
    <>
      <Header shopName={shopName} />
      <main className="sf-container pd">
        <Link to="/products" className="pd-back">← 返回商品列表</Link>

        <div className="pd-grid">
          <div className="pd-gallery">
            <div className="pd-main-img">
              {images[activeImg] ? (
                <Image data={images[activeImg]} alt={images[activeImg].altText || product.title} sizes="(min-width: 1024px) 600px, 100vw" />
              ) : <div className="pd-media-empty" />}
            </div>
            {images.length > 1 && (
              <div className="pd-thumbs">
                {images.map((img: any, i: number) => (
                  <button key={i} className={`pd-thumb ${i === activeImg ? 'is-active' : ''}`} onClick={() => setActiveImg(i)}>
                    <Image data={img} alt="" sizes="80px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pd-info">
            {product.productType && <div className="pd-cat">{product.productType}</div>}
            <h1 className="pd-title">{product.title}</h1>
            <ProductPrice
              price={selectedVariant?.price}
              compareAtPrice={selectedVariant?.compareAtPrice}
              className="pd-price"
            />

            {selectedVariant?.availableForSale ? (
              <div className="pd-stock pd-stock-ok">现货充足</div>
            ) : (
              <div className="pd-stock pd-stock-no">已售罄</div>
            )}

            {hasMultiple && (
              <div className="pd-variant-group">
                <div className="pd-variant-label">规格</div>
                <div className="pd-variant-options">
                  {variants.map((v: any) => (
                    <button
                      type="button"
                      key={v.id}
                      className={`pd-variant-opt ${selectedId === v.id ? 'is-active' : ''} ${!v.availableForSale ? 'is-disabled' : ''}`}
                      disabled={!v.availableForSale}
                      onClick={() => setSelectedId(v.id)}
                    >
                      {v.title || 'Default'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.description && <p className="pd-desc">{product.description}</p>}

            <div className="pd-qty">
              <label>数量</label>
              <div className="pd-qty-input">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}>−</button>
                <input type="number" min={1} max={maxQty} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))} />
                <button type="button" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty}>+</button>
              </div>
            </div>

            <div className="pd-actions">
              <AddToCartButton
                variantId={selectedVariant?.id || ''}
                quantity={quantity}
                disabled={!selectedVariant?.availableForSale}
                className="pd-cta"
                loadingText="添加中…"
                unavailableText="已售罄"
              >
                加入购物车 · {quantity} 件
              </AddToCartButton>
            </div>

            {productDiscounts.length > 0 && (
              <div className="pd-claimable">
                <ClaimableDiscountList discounts={productDiscounts} first={3} />
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer shopName={shopName} />
      <ProductStyles />
    </>
  );
}

function ProductStyles() {
  return <style dangerouslySetInnerHTML={{ __html: `
.pd { padding: 40px 24px 80px; max-width: 1200px; }
.pd-back { font-size: 14px; color: var(--c-muted); margin-bottom: 24px; display: inline-block; }
.pd-back:hover { color: var(--c-ink); }
.pd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
@media (max-width: 800px) { .pd-grid { grid-template-columns: 1fr; gap: 32px; } }

.pd-main-img { aspect-ratio: 1/1; background: var(--c-bg-soft); border-radius: var(--r-xl); overflow: hidden; }
.pd-main-img img { width: 100%; height: 100%; object-fit: cover; }
.pd-media-empty { width: 100%; height: 100%; background: linear-gradient(135deg, var(--c-bg-soft-2), var(--c-line)); }
.pd-thumbs { display: flex; gap: 10px; margin-top: 14px; }
.pd-thumb { width: 76px; height: 76px; padding: 0; border: 2px solid transparent; border-radius: var(--r-md); overflow: hidden; cursor: pointer; background: var(--c-bg-soft); }
.pd-thumb.is-active { border-color: var(--c-accent); }
.pd-thumb img { width: 100%; height: 100%; object-fit: cover; }

.pd-cat { font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--c-muted-2); margin-bottom: 12px; }
.pd-title { font-size: 32px; line-height: 1.2; margin-bottom: 16px; }
.pd-price { font-size: 26px; font-weight: 700; color: var(--c-accent); margin-bottom: 20px; display: inline-flex; align-items: baseline; gap: 12px; }
.pd-price [data-compare-at-price] { font-size: 16px; color: var(--c-muted-2); text-decoration: line-through; font-weight: 500; }
.pd-stock { display: inline-block; padding: 4px 12px; border-radius: var(--r-pill); font-size: 12px; font-weight: 600; margin-bottom: 24px; }
.pd-stock-ok { background: #dcfce7; color: #166534; }
.pd-stock-no { background: #fee2e2; color: #991b1b; }
.pd-variant-group { margin-bottom: 24px; }
.pd-variant-label { font-size: 13px; font-weight: 600; color: var(--c-ink-2); margin-bottom: 8px; }
.pd-variant-options { display: flex; flex-wrap: wrap; gap: 8px; }
.pd-variant-opt { padding: 8px 18px; background: #fff; border: 1.5px solid var(--c-line); border-radius: var(--r-pill); font-size: 13.5px; font-weight: 500; cursor: pointer; transition: all 150ms ease; }
.pd-variant-opt:hover:not(.is-disabled) { border-color: var(--c-line-2); }
.pd-variant-opt.is-active { border-color: var(--c-accent); background: var(--c-accent-soft); color: var(--c-accent); }
.pd-variant-opt.is-disabled { opacity: 0.5; cursor: not-allowed; text-decoration: line-through; }
.pd-desc { font-size: 15px; line-height: 1.7; color: var(--c-ink-2); margin: 16px 0 24px; }
.pd-qty { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
.pd-qty label { font-size: 13px; font-weight: 600; color: var(--c-ink-2); }
.pd-qty-input { display: inline-flex; align-items: center; border: 1px solid var(--c-line); border-radius: var(--r-pill); overflow: hidden; }
.pd-qty-input button { width: 36px; height: 36px; background: transparent; border: none; font-size: 18px; line-height: 1; cursor: pointer; color: var(--c-ink-2); }
.pd-qty-input button:hover:not(:disabled) { background: var(--c-bg-soft); }
.pd-qty-input button:disabled { opacity: 0.3; cursor: not-allowed; }
.pd-qty-input input { width: 50px; text-align: center; border: none; border-left: 1px solid var(--c-line); border-right: 1px solid var(--c-line); font-size: 14.5px; font-weight: 600; font-family: inherit; outline: none; -moz-appearance: textfield; }
.pd-qty-input input::-webkit-outer-spin-button, .pd-qty-input input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.pd-actions { margin-bottom: 24px; }
.pd-cta { padding: 14px 36px; background: var(--c-ink); color: #fff; border: none; border-radius: var(--r-pill); font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; transition: background 150ms ease; min-width: 200px; }
.pd-cta:hover:not(:disabled) { background: var(--c-accent); }
.pd-cta:disabled { background: var(--c-line-2); cursor: not-allowed; }
.pd-claimable { display: grid; gap: 12px; margin-top: 24px; }
`}} />;
}

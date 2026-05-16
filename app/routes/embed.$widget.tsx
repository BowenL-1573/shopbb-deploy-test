/**
 * /embed/:widget — iframe-friendly embedded widget for shopbb docs
 *
 * 让 oxygen-demo.cloudc.top 的文档站可以 iframe 进来展示真实 helium 组件效果。
 *
 * 设计原则：
 *   - 不渲染 Header / Footer / nav
 *   - 透明背景
 *   - 响应 Frame-Options / CSP 让 oxygen-demo 可嵌入
 *   - 用 mock 数据，组件渲染纯展示，不真的发请求
 *   - 每个 widget URL 风格 /embed/cart-line-item?qty=2
 */

import * as React from 'react';
import { useLoaderData } from 'react-router';
import {
  Money,
  ProductPrice,
  Image,
  CartCost,
  AddToCartButton,
  CartForm,
  ClaimableDiscountList,
  DiscountSelector,
  MyDiscountList,
  AddressList,
  AddressForm,
  AddressPicker,
  CartLineProvider,
  useCartLine,
  Pagination,
  type Discount,
  type DiscountClaim,
  type Address,
} from '@shopbb/helium/components';
import type { Route } from './+types/embed.$widget';

export async function loader({ params, request }: Route.LoaderArgs) {
  return { widget: params.widget || 'unknown', url: request.url };
}

export const meta: Route.MetaFunction = ({ params }) => [
  { title: `embed/${params.widget} · Shopflare` },
];

// Cloudflare 默认会加 X-Frame-Options: SAMEORIGIN，要让 oxygen-demo iframe 嵌入需要去掉这个或换 CSP
export const headers: Route.HeadersFunction = () => ({
  'X-Frame-Options': 'ALLOW-FROM https://oxygen-demo.cloudc.top',
  'Content-Security-Policy': "frame-ancestors 'self' https://oxygen-demo.cloudc.top https://*.oxygen-demo.cloudc.top",
  // 让浏览器知道 iframe 内不需要额外 cookie
  'Cache-Control': 'public, max-age=60',
});

// ============================================================
// Mock data
// ============================================================

const MOCK_VARIANT = {
  id: 'gid://shopbb/ProductVariant/sku_demo_001',
  title: 'Default',
  price: { amount: '99.00', currencyCode: 'CNY' },
  compareAtPrice: { amount: '129.00', currencyCode: 'CNY' },
  availableForSale: true,
  image: {
    url: 'https://api.oxygen-demo.cloudc.top/api/assets/stores/store_1778645409362/products/1773066755127_0.jpg',
    altText: 'Cloudflare Shampoo',
  },
  product: {
    id: 'gid://shopbb/Product/demo',
    handle: 'cloudflare-shampoo',
    title: 'Cloudflare Shampoo',
  },
};

const MOCK_DISCOUNT_PERCENT: Discount = {
  id: 'gid://shopbb/Discount/welcome10',
  code: 'WELCOME10',
  title: '新人 9 折',
  description: '仅限新用户首单使用',
  valueType: 'PERCENTAGE',
  value: { __typename: 'DiscountPercentage', percentage: 10 },
  minSubtotal: null,
  startsAt: null,
  endsAt: '2026-12-31T23:59:59.000Z',
};

const MOCK_DISCOUNT_FIXED: Discount = {
  id: 'gid://shopbb/Discount/sale20',
  code: 'SALE20',
  title: '满二百减二十',
  description: null,
  valueType: 'FIXED_AMOUNT',
  value: { __typename: 'DiscountAmount', amount: { amount: '20.00', currencyCode: 'CNY' } },
  minSubtotal: { amount: '200.00', currencyCode: 'CNY' },
  startsAt: null,
  endsAt: null,
};

const MOCK_CLAIM_AVAILABLE: DiscountClaim = {
  id: 'gid://shopbb/DiscountClaim/demo_avail',
  claimedAt: '2026-05-14T15:29:53.948Z',
  expiresAt: '2026-12-31T23:59:59.000Z',
  isExpired: false,
  remainingUses: 1,
  usedCount: 0,
  discount: MOCK_DISCOUNT_PERCENT,
};

const MOCK_CLAIM_USED: DiscountClaim = {
  ...MOCK_CLAIM_AVAILABLE,
  id: 'gid://shopbb/DiscountClaim/demo_used',
  remainingUses: 0,
  usedCount: 1,
};

const MOCK_ADDRESS: Address = {
  id: 'gid://shopbb/CustomerAddress/addr_1',
  firstName: 'Alice',
  lastName: '',
  company: '',
  phone: '13900000222',
  province: '北京',
  provinceCode: 'BJ',
  city: '北京',
  district: '海淀区',
  address1: 'Office Park 7',
  address2: '',
  country: 'China',
  countryCode: 'CN',
  zip: '100000',
  isDefault: true,
};

const MOCK_CART_LINE = {
  id: 'line_demo_001',
  quantity: 2,
  merchandise: MOCK_VARIANT,
  cost: {
    totalAmount: { amount: '198.00', currencyCode: 'CNY' },
    amountPerQuantity: { amount: '99.00', currencyCode: 'CNY' },
  },
};

const MOCK_CART_WITH_DISCOUNT = {
  id: 'gid://shopbb/Cart/demo',
  totalQuantity: 2,
  cost: {
    subtotalAmount: { amount: '198.00', currencyCode: 'CNY' },
    totalAmount: { amount: '178.20', currencyCode: 'CNY' },
    totalDiscountAmount: { amount: '19.80', currencyCode: 'CNY' },
  },
  lines: { nodes: [MOCK_CART_LINE] },
  appliedDiscountClaim: {
    claimId: 'demo_avail',
    code: 'WELCOME10',
    title: '新人 9 折',
  },
  discountAllocations: [
    {
      title: '新人 9 折',
      code: 'WELCOME10',
      discountedAmount: { amount: '19.80', currencyCode: 'CNY' },
    },
  ],
  checkoutUrl: '#',
};

const MOCK_CART_EMPTY = {
  id: 'gid://shopbb/Cart/demo',
  totalQuantity: 0,
  cost: { subtotalAmount: { amount: '0.00', currencyCode: 'CNY' }, totalAmount: { amount: '0.00', currencyCode: 'CNY' } },
  lines: { nodes: [] },
};

// ============================================================
// Widgets
// ============================================================

function Wrap({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="embed-wrap">
      {label && <div className="embed-label">{label}</div>}
      <div className="embed-stage">{children}</div>
    </div>
  );
}

function WidgetMoney() {
  return (
    <div className="embed-grid">
      <Wrap label="CNY · 默认">
        <Money data={{ amount: '99.00', currencyCode: 'CNY' }} className="embed-money" />
      </Wrap>
      <Wrap label="USD · 不带千分位">
        <Money data={{ amount: '1234.50', currencyCode: 'USD' }} className="embed-money" />
      </Wrap>
      <Wrap label="JPY · 不带小数">
        <Money data={{ amount: '12000', currencyCode: 'JPY' }} withoutTrailingZeros className="embed-money" />
      </Wrap>
      <Wrap label="不显示货币符号">
        <Money data={{ amount: '99.00', currencyCode: 'CNY' }} withoutCurrency className="embed-money" />
      </Wrap>
    </div>
  );
}

function WidgetProductPrice() {
  return (
    <div className="embed-grid">
      <Wrap label="普通价格">
        <ProductPrice
          price={{ amount: '99.00', currencyCode: 'CNY' }}
          className="embed-price"
        />
      </Wrap>
      <Wrap label="带划线价（折扣中）">
        <ProductPrice
          price={{ amount: '79.00', currencyCode: 'CNY' }}
          compareAtPrice={{ amount: '99.00', currencyCode: 'CNY' }}
          className="embed-price"
        />
      </Wrap>
    </div>
  );
}

function WidgetClaimableDiscountCard() {
  return (
    <ClaimableDiscountList
      discounts={[MOCK_DISCOUNT_PERCENT, MOCK_DISCOUNT_FIXED]}
      first={2}
    />
  );
}

function WidgetDiscountSelector({ state }: { state: 'available' | 'applied' | 'empty' | 'unauth' }) {
  if (state === 'unauth') {
    return <DiscountSelector myClaims={[]} unauthenticated />;
  }
  if (state === 'empty') {
    return <DiscountSelector myClaims={[]} />;
  }
  if (state === 'applied') {
    return (
      <DiscountSelector
        myClaims={[MOCK_CLAIM_AVAILABLE]}
        appliedClaim={{ claimId: 'demo_avail', code: 'WELCOME10', title: '新人 9 折' }}
        appliedAllocation={{ discountedAmount: { amount: '9.90', currencyCode: 'CNY' }, code: 'WELCOME10', title: '新人 9 折' }}
      />
    );
  }
  return <DiscountSelector myClaims={[MOCK_CLAIM_AVAILABLE]} />;
}

function WidgetVoucherCard() {
  return (
    <div className="embed-grid">
      <Wrap label="可用">
        <MyDiscountList claims={[MOCK_CLAIM_AVAILABLE]} filter="available" />
      </Wrap>
      <Wrap label="已用完">
        <MyDiscountList claims={[MOCK_CLAIM_USED]} filter="used" />
      </Wrap>
    </div>
  );
}

function WidgetCartCost() {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--c-line)', borderRadius: 12, padding: 24, maxWidth: 360 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>商品小计</span>
          <CartCost cart={MOCK_CART_WITH_DISCOUNT} amountType="subtotal" />
        </div>
        <CartCost cart={MOCK_CART_WITH_DISCOUNT} amountType="discount">
          {(money) =>
            Number(money.amount) > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--c-accent)' }}>
                <span>优惠</span>
                <span>
                  − <Money data={money} />
                </span>
              </div>
            ) : null
          }
        </CartCost>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: 12,
            borderTop: '1px solid var(--c-line)',
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          <span>合计</span>
          <CartCost cart={MOCK_CART_WITH_DISCOUNT} amountType="total" as="strong" />
        </div>
      </div>
    </div>
  );
}

function WidgetCartLineItem() {
  return (
    <CartLineProvider line={MOCK_CART_LINE}>
      <CartLineDemoUI />
    </CartLineProvider>
  );
}

function CartLineDemoUI() {
  const line = useCartLine() as any;
  if (!line) return null;
  const variant = line.merchandise;
  return (
    <div
      className="ct-line"
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 1fr auto auto 32px',
        gap: 16,
        alignItems: 'center',
        padding: 16,
        background: '#fff',
        border: '1px solid var(--c-line)',
        borderRadius: 12,
        maxWidth: 600,
      }}
    >
      <div style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden' }}>
        {variant?.image && <Image data={variant.image} alt={variant?.product?.title || ''} sizes="80px" />}
      </div>
      <div>
        <div style={{ fontWeight: 600 }}>{variant?.product?.title}</div>
        <div style={{ fontSize: 13, color: 'var(--c-muted)', marginTop: 4 }}>
          {variant?.price && <Money data={variant.price} />} × {line.quantity}
        </div>
      </div>
      <div style={{ display: 'inline-flex', border: '1px solid var(--c-line)', borderRadius: 999 }}>
        <button style={btnStyle}>−</button>
        <span style={{ minWidth: 32, textAlign: 'center', alignSelf: 'center', fontWeight: 600 }}>{line.quantity}</span>
        <button style={btnStyle}>+</button>
      </div>
      <div style={{ fontWeight: 700, fontFeatureSettings: "'tnum'" }}>
        {line.cost?.totalAmount && <Money data={line.cost.totalAmount} />}
      </div>
      <button style={{ ...btnStyle, color: 'var(--c-muted-2)' }} aria-label="删除">
        ×
      </button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  color: 'var(--c-ink-2)',
};

function WidgetAddToCartButton() {
  return (
    <div className="embed-grid">
      <Wrap label="可加购">
        <AddToCartButton variantId="demo" quantity={1} className="embed-cta">
          加入购物车
        </AddToCartButton>
      </Wrap>
      <Wrap label="缺货">
        <AddToCartButton variantId="demo" quantity={1} disabled className="embed-cta" unavailableText="已售罄">
          加入购物车
        </AddToCartButton>
      </Wrap>
    </div>
  );
}

function WidgetAddressCard() {
  return (
    <AddressList
      addresses={[MOCK_ADDRESS]}
      onEdit={() => {}}
      onAdd={() => {}}
      onSetDefault={async () => {}}
      onRemove={async () => {}}
    />
  );
}

function WidgetAddressForm() {
  return (
    <AddressForm
      initial={MOCK_ADDRESS}
      onSubmit={async (input) => ({ address: { ...MOCK_ADDRESS, ...(input as any) }, userErrors: [] })}
      onSaved={() => {}}
      onCancel={() => {}}
    />
  );
}

function WidgetAddressPicker() {
  const addr2 = { ...MOCK_ADDRESS, id: 'addr_2', firstName: 'Bob', phone: '13800000111', city: '上海', province: '上海', address1: 'Plaza 66', isDefault: false };
  return <AddressPicker addresses={[MOCK_ADDRESS, addr2]} defaultAddress={MOCK_ADDRESS} allowNewAddress />;
}

function WidgetProductCard() {
  return (
    <a
      href="#"
      className="pc"
      style={{ display: 'block', maxWidth: 280, color: 'inherit' }}
      onClick={(e) => e.preventDefault()}
    >
      <div style={{ aspectRatio: '1/1', background: 'var(--c-bg-soft)', borderRadius: 12, overflow: 'hidden' }}>
        <Image
          data={MOCK_VARIANT.image}
          alt={MOCK_VARIANT.product.title}
          sizes="280px"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div style={{ padding: '16px 6px 8px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--c-muted-2)' }}>个护美妆</div>
        <div style={{ fontSize: 15, margin: '6px 0' }}>{MOCK_VARIANT.product.title}</div>
        <Money data={MOCK_VARIANT.price} style={{ fontSize: 17, fontWeight: 600 }} />
      </div>
    </a>
  );
}

function WidgetPagination() {
  // 模拟一个 connection
  const conn = {
    nodes: ['A', 'B', 'C'],
    pageInfo: { hasNextPage: true, hasPreviousPage: false, startCursor: 'a', endCursor: 'c' },
  };
  return (
    <Pagination connection={conn}>
      {({ nodes, NextLink, PreviousLink, isLoading, hasPreviousPage, hasNextPage }: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PreviousLink>{isLoading ? '加载中...' : hasPreviousPage ? '↑ 加载上一页' : ''}</PreviousLink>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {nodes.map((n: string) => (
              <div key={n} style={{ background: 'var(--c-bg-soft)', padding: 24, borderRadius: 8, textAlign: 'center', fontWeight: 600 }}>{n}</div>
            ))}
          </div>
          <NextLink>{isLoading ? '加载中...' : hasNextPage ? '加载下一页 ↓' : '已加载全部'}</NextLink>
        </div>
      )}
    </Pagination>
  );
}

// ============================================================
// Route
// ============================================================

export default function EmbedRoute() {
  const { widget } = useLoaderData<typeof loader>();

  return (
    <>
      <EmbedStyles />
      <div className="embed-root">
        <EmbedWidget widget={widget} />
      </div>
    </>
  );
}

function EmbedWidget({ widget }: { widget: string }) {
  switch (widget) {
    case 'money':
      return <WidgetMoney />;
    case 'product-price':
      return <WidgetProductPrice />;
    case 'claimable-discount-card':
      return <WidgetClaimableDiscountCard />;
    case 'discount-selector':
      return <WidgetDiscountSelector state="available" />;
    case 'discount-selector-applied':
      return <WidgetDiscountSelector state="applied" />;
    case 'discount-selector-empty':
      return <WidgetDiscountSelector state="empty" />;
    case 'discount-selector-unauth':
      return <WidgetDiscountSelector state="unauth" />;
    case 'voucher-card':
      return <WidgetVoucherCard />;
    case 'cart-cost':
      return <WidgetCartCost />;
    case 'cart-line-item':
      return <WidgetCartLineItem />;
    case 'add-to-cart-button':
      return <WidgetAddToCartButton />;
    case 'address-card':
      return <WidgetAddressCard />;
    case 'address-form':
      return <WidgetAddressForm />;
    case 'address-picker':
      return <WidgetAddressPicker />;
    case 'product-card':
      return <WidgetProductCard />;
    case 'pagination':
      return <WidgetPagination />;
    default:
      return (
        <div style={{ padding: 24, color: '#94a3b8', textAlign: 'center', fontSize: 14 }}>
          Unknown widget: <code>{widget}</code>
        </div>
      );
  }
}

function EmbedStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
:root { color-scheme: light; }
html, body { background: transparent !important; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, system-ui, sans-serif; color: var(--c-ink); }
.embed-root { padding: 16px; }
.embed-grid { display: flex; flex-wrap: wrap; gap: 16px; }
.embed-wrap { flex: 0 0 auto; }
.embed-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--c-muted-2); margin-bottom: 8px; }
.embed-stage { padding: 0; }
.embed-money { font-size: 22px; font-weight: 700; font-feature-settings: 'tnum'; }
.embed-price { font-size: 20px; }
.embed-cta { padding: 11px 22px; background: var(--c-ink); color: #fff; border: none; border-radius: 999px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; }
.embed-cta:hover:not(:disabled) { background: var(--c-accent); }
.embed-cta:disabled { background: var(--c-line-2); cursor: not-allowed; }
` }} />
  );
}

/**
 * routes/checkout.tsx — /checkout
 *
 * 结算页。SSR loader 拉 cart，POST action 调 /api/checkout/create 创建订单。
 */

import { useLoaderData, useActionData, Form, redirect, data } from 'react-router';
import * as React from 'react';
import { Image, Money, CartCost, AddressPicker, DiscountSelector, type Address } from '@shopbb/helium/components';
import { Header, Footer } from '~/components/Header';
import { useRootLoader } from '~/root';
import type { Route } from './+types/checkout';

export const meta: Route.MetaFunction = () => [{ title: '结算 · Shopflare' }];

export async function loader({ request, context }: Route.LoaderArgs) {
  const cart = await context.helium.cart.get().catch(() => null);

  // 拉买家地址 + 已领优惠券（用 cookie 里的 buyer token）
  const cookieHeader = request.headers.get('Cookie') || '';
  const buyerMatch = cookieHeader.match(/(?:^|;\s*)__buyer=([^;]+)/);
  const buyerToken = buyerMatch ? decodeURIComponent(buyerMatch[1]) : null;

  let addresses: any[] = [];
  let myClaims: any[] = [];
  if (buyerToken) {
    const apiBase = context.helium.store.apiBase;
    const [addrRes, claimsData] = await Promise.all([
      fetch(`${apiBase}/api/buyer/addresses`, { headers: { Authorization: `Bearer ${buyerToken}` } })
        .then((r) => r.json() as Promise<any>)
        .catch((err) => { console.error('[checkout-loader] addresses:', err?.message); return { success: false }; }),
      context.helium.customer.query(
        `{ customer { discountClaims(first: 50) { nodes {
            id claimedAt expiresAt isExpired remainingUses usedCount
            discount {
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
        } } } }`,
      ).catch((err) => { console.error('[checkout-loader] discountClaims:', err?.message); return null; }),
    ]);
    addresses = addrRes?.success ? addrRes.addresses : [];
    myClaims = (claimsData as any)?.customer?.discountClaims?.nodes ?? [];
  }

  return { cart, addresses, myClaims, signedIn: !!buyerToken };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const cartId = String(formData.get('cartId') || '');
  const addressJson = String(formData.get('address') || '');
  if (!cartId || !addressJson) {
    return data({ error: '缺少必要字段' }, { status: 400 });
  }

  let address: Record<string, any>;
  try {
    address = JSON.parse(addressJson);
  } catch {
    return data({ error: 'address JSON 解析失败' }, { status: 400 });
  }

  const apiBase = context.helium.store.apiBase;
  const storeId = context.helium.store.id;
  const cookieHeader = request.headers.get('Cookie') || '';
  const buyerMatch = cookieHeader.match(/(?:^|;\s*)__buyer=([^;]+)/);
  const buyerToken = buyerMatch ? decodeURIComponent(buyerMatch[1]) : null;
  if (!buyerToken) {
    return data({ error: '未登录' }, { status: 401 });
  }

  // idempotency key
  const idemKey = String(formData.get('idempotencyKey') || crypto.randomUUID());

  const res = await fetch(`${apiBase}/api/checkout/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${buyerToken}`,
      'Idempotency-Key': idemKey,
    },
    body: JSON.stringify({
      store_id: storeId,
      cart_id: cartId.replace(/^gid:\/\/shopbb\/Cart\//, ''),
      address,
    }),
  });
  const result: any = await res.json();
  if (!result.success) {
    return data({ error: result.error || result.userErrors?.[0]?.message || '创建订单失败' }, { status: 400 });
  }

  return redirect(`/payment?orderId=${encodeURIComponent(result.order_id)}`);
}

export default function CheckoutRoute() {
  const { cart, addresses, myClaims, signedIn } = useLoaderData<typeof loader>() as any;
  const actionData = useActionData<typeof action>() as any;
  const root = useRootLoader();
  const shopName = root?.store?.shopName || 'Shopflare';

  const [address, setAddress] = React.useState<Address | null>(null);
  const [inlineAddr, setInlineAddr] = React.useState<Address | null>(null);
  const activeAddress = inlineAddr || address;

  if (!cart || cart.lines.nodes.length === 0) {
    return (
      <>
        <Header shopName={shopName} />
        <main className="sf-container" style={{ padding: '80px 24px', textAlign: 'center' }}>
          <h1>购物车是空的</h1>
          <p style={{ color: 'var(--c-muted)', marginTop: 16 }}>购物车没东西，去 <a href="/products" style={{ color: 'var(--c-accent)' }}>购物</a> 再来结算吧</p>
        </main>
        <Footer shopName={shopName} />
      </>
    );
  }

  const buildAddressInput = (a: Address) => ({
    first_name: a.firstName || '',
    last_name: a.lastName || '',
    name: `${a.firstName || ''}${a.lastName || ''}`.trim() || (a.firstName || ''),
    company: a.company || '',
    phone: a.phone || '',
    province: a.province || '',
    province_code: a.provinceCode || '',
    city: a.city || '',
    district: a.district || '',
    address1: a.address1 || '',
    address2: a.address2 || '',
    detail: [a.address1, a.address2].filter(Boolean).join(' '),
    country: a.country || 'China',
    country_code: a.countryCode || 'CN',
    zip: a.zip || '',
  });

  return (
    <>
      <Header shopName={shopName} />
      <main className="sf-container co">
        <h1 style={{ marginBottom: 32 }}>结算</h1>

        <div className="co-grid">
          <Form method="POST" className="co-main">
            <input type="hidden" name="cartId" value={cart.id} />
            <input type="hidden" name="address" value={activeAddress ? JSON.stringify(buildAddressInput(activeAddress)) : ''} />

            <div className="co-section">
              <h2>1. 收货地址</h2>
              <AddressPicker
                addresses={addresses || []}
                defaultAddress={(addresses || []).find((a: any) => a.isDefault) || null}
                value={inlineAddr ? null : address?.id ?? null}
                onChange={(_id, addr) => { setAddress(addr); setInlineAddr(null); }}
                onUseNewAddress={(a) => setInlineAddr(a)}
                allowNewAddress
              />
            </div>

            <div className="co-section">
              <h2>2. 优惠券</h2>
              <DiscountSelector
                myClaims={myClaims || []}
                appliedClaim={cart?.appliedDiscountClaim ?? null}
                appliedAllocation={cart?.discountAllocations?.[0] ?? null}
                unauthenticated={!signedIn}
              />
            </div>

            {actionData?.error && <div className="co-err">{actionData.error}</div>}

            <button type="submit" className="co-cta" disabled={!activeAddress}>
              提交订单 · <CartCost cart={cart} amountType="total" />
            </button>
          </Form>

          <aside className="co-summary">
            <div className="co-summary-title">订单摘要</div>
            <div className="co-items">
              {cart.lines.nodes.map((l: any) => (
                <div key={l.id} className="co-item">
                  {l.merchandise?.image?.url && (
                    <Image data={l.merchandise.image} alt="" sizes="48px" />
                  )}
                  <div>
                    <div className="co-item-name">{l.merchandise?.product?.title || l.merchandise?.title}</div>
                    <div className="co-item-sub">× {l.quantity}</div>
                  </div>
                  <Money data={l.cost.totalAmount} className="co-item-price" />
                </div>
              ))}
            </div>
            <div className="co-totals">
              <div className="co-line"><span>商品小计</span><CartCost cart={cart} amountType="subtotal" /></div>
              <CartCost cart={cart} amountType="discount">
                {(money) => Number(money.amount) > 0 ? (
                  <div className="co-line co-line-discount"><span>优惠</span><span>− <Money data={money} /></span></div>
                ) : null}
              </CartCost>
              <div className="co-line co-line-total"><span>合计</span><CartCost cart={cart} amountType="total" as="strong" /></div>
            </div>
          </aside>
        </div>
      </main>
      <Footer shopName={shopName} />
      <CheckoutStyles />
    </>
  );
}

function CheckoutStyles() {
  return <style dangerouslySetInnerHTML={{ __html: `
.co { padding: 40px 0 80px; max-width: 1100px; }
.co-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 40px; }
@media (max-width: 800px) { .co-grid { grid-template-columns: 1fr; } }
.co-main { display: flex; flex-direction: column; gap: 28px; }
.co-section h2 { font-size: 16px; margin-bottom: 14px; }
.co-err { color: #b91c1c; font-size: 13.5px; padding: 10px 14px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca; }
.co-cta { padding: 14px 36px; background: var(--c-ink); color: #fff; border: none; border-radius: var(--r-pill); font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; align-self: flex-end; display: inline-flex; align-items: center; gap: 6px; }
.co-cta:hover:not(:disabled) { background: var(--c-accent); }
.co-cta:disabled { background: var(--c-line-2); cursor: not-allowed; }
.co-summary { background: var(--c-bg-soft); border-radius: var(--r-xl); padding: 24px; align-self: start; position: sticky; top: 80px; }
.co-summary-title { font-size: 13.5px; font-weight: 700; color: var(--c-ink-2); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; }
.co-items { display: flex; flex-direction: column; gap: 10px; padding-bottom: 18px; border-bottom: 1px solid var(--c-line); }
.co-item { display: grid; grid-template-columns: 48px 1fr auto; gap: 12px; align-items: center; }
.co-item img { width: 48px; height: 48px; object-fit: cover; border-radius: var(--r-md); }
.co-item-name { font-size: 13.5px; font-weight: 500; }
.co-item-sub { font-size: 12px; color: var(--c-muted); margin-top: 2px; }
.co-item-price { font-size: 14px; font-weight: 600; font-feature-settings: 'tnum'; }
.co-totals { padding-top: 14px; display: flex; flex-direction: column; gap: 8px; }
.co-line { display: flex; justify-content: space-between; font-size: 13.5px; color: var(--c-ink-2); font-feature-settings: 'tnum'; }
.co-line-discount { color: var(--c-accent); }
.co-line-total { padding-top: 12px; margin-top: 6px; border-top: 1px solid var(--c-line); font-size: 18px; }
.co-line-total strong { font-size: 22px; color: var(--c-ink); }

[data-address-picker] [data-picker-title] { font-size: 13.5px; font-weight: 600; color: var(--c-ink-2); margin-bottom: 12px; }
[data-address-picker] [data-picker-list] { display: flex; flex-direction: column; gap: 10px; }
[data-picker-item] { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border: 1px solid var(--c-line); border-radius: var(--r-md); background: #fff; cursor: pointer; transition: border-color 150ms ease; }
[data-picker-item]:hover { border-color: var(--c-line-2); }
[data-picker-item][data-active] { border-color: var(--c-accent); background: var(--c-accent-soft); }
[data-picker-item] [data-name] { font-size: 14.5px; font-weight: 600; }
[data-picker-item] [data-line] { font-size: 13px; color: var(--c-muted); margin-top: 4px; }
`}} />;
}

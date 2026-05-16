/**
 * routes/account.tsx — /account
 *
 * 我的账号 — 3 tab：订单 / 地址 / 优惠券
 * 用 helium AddressList + MyDiscountList，订单暂时简单列表
 */

import * as React from 'react';
import { Link, useNavigate, useLoaderData } from 'react-router';
import {
  Money, AddressList, AddressForm, MyDiscountList,
  type Address,
} from '@shopbb/helium/components';
import { formatDateTime } from '@shopbb/helium';
import { Header, Footer } from '~/components/Header';
import { useBuyer } from '~/lib/auth-state';
import { useRootLoader } from '~/root';
import type { Route } from './+types/account';

export const meta: Route.MetaFunction = () => [{ title: '我的账号 · Shopflare' }];

export async function loader({ request, context }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const buyerMatch = cookieHeader.match(/(?:^|;\s*)__buyer=([^;]+)/);
  const buyerToken = buyerMatch ? decodeURIComponent(buyerMatch[1]) : null;
  if (!buyerToken) {
    return { orders: null, addresses: [], discountClaims: [], signedIn: false };
  }

  const apiBase = context.helium.store.apiBase;

  // 并发拉订单 + 地址 + 已领优惠券
  const [ordersRes, addressesRes, claimsData] = await Promise.all([
    fetch(`${apiBase}/api/buyer/orders`, { headers: { Authorization: `Bearer ${buyerToken}` } })
      .then((r) => r.json() as Promise<any>)
      .catch((err) => { console.error('[account-loader] orders:', err?.message); return { success: false }; }),
    fetch(`${apiBase}/api/buyer/addresses`, { headers: { Authorization: `Bearer ${buyerToken}` } })
      .then((r) => r.json() as Promise<any>)
      .catch((err) => { console.error('[account-loader] addresses:', err?.message); return { success: false }; }),
    context.helium.customer.query(
      `{ customer { discountClaims(first: 50, includeExpired: true, includeUsed: true) { nodes {
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
    ).catch((err) => { console.error('[account-loader] discountClaims:', err?.message); return null; }),
  ]);

  const orders = ordersRes?.success ? ordersRes.orders : [];
  const addresses = addressesRes?.success ? addressesRes.addresses : [];
  const discountClaims: any[] = (claimsData as any)?.customer?.discountClaims?.nodes ?? [];

  return { orders, addresses, discountClaims, signedIn: true };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get('intent') || '');
  const apiBase = context.helium.store.apiBase;

  const cookieHeader = request.headers.get('Cookie') || '';
  const buyerMatch = cookieHeader.match(/(?:^|;\s*)__buyer=([^;]+)/);
  const buyerToken = buyerMatch ? decodeURIComponent(buyerMatch[1]) : null;
  if (!buyerToken) {
    return Response.json({ error: '未登录' }, { status: 401 });
  }

  if (intent === 'address-set-default') {
    const id = String(formData.get('id'));
    const res = await fetch(`${apiBase}/api/buyer/addresses/${id}/default`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    return Response.json(await res.json());
  }

  if (intent === 'address-delete') {
    const id = String(formData.get('id'));
    const res = await fetch(`${apiBase}/api/buyer/addresses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    return Response.json(await res.json());
  }

  if (intent === 'address-save') {
    const id = formData.get('id') ? String(formData.get('id')) : null;
    const body = {
      first_name: String(formData.get('firstName') || ''),
      last_name: String(formData.get('lastName') || ''),
      phone: String(formData.get('phone') || ''),
      province: String(formData.get('province') || ''),
      city: String(formData.get('city') || ''),
      district: String(formData.get('district') || ''),
      address1: String(formData.get('address1') || ''),
      address2: String(formData.get('address2') || ''),
      country: String(formData.get('country') || 'China'),
      country_code: String(formData.get('countryCode') || 'CN'),
      zip: String(formData.get('zip') || ''),
      is_default: formData.get('isDefault') === 'true',
    };
    const url = id ? `${apiBase}/api/buyer/addresses/${id}` : `${apiBase}/api/buyer/addresses`;
    const method = id ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${buyerToken}` },
      body: JSON.stringify(body),
    });
    return Response.json(await res.json());
  }

  return Response.json({ error: 'unknown intent' }, { status: 400 });
}

export default function AccountRoute() {
  const { orders, addresses, discountClaims, signedIn } = useLoaderData<typeof loader>() as any;
  const root = useRootLoader();
  const shopName = root?.store?.shopName || 'Shopflare';

  const navigate = useNavigate();
  const { user, ready, logout } = useBuyer();
  const [tab, setTab] = React.useState<'orders' | 'addresses' | 'discounts'>('orders');

  // 客户端未登录时跳转
  React.useEffect(() => {
    if (ready && !user) {
      navigate('/login?next=/account', { replace: true });
    }
  }, [ready, user, navigate]);

  if (!signedIn && !user) {
    return (
      <>
        <Header shopName={shopName} />
        <main className="sf-container" style={{ padding: '80px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--c-muted)' }}>需要登录后才能查看账号信息</p>
          <Link to="/login?next=/account" className="ac-cta" style={{ marginTop: 24, display: 'inline-block' }}>去登录</Link>
        </main>
        <Footer shopName={shopName} />
      </>
    );
  }

  return (
    <>
      <Header shopName={shopName} />
      <main className="sf-container ac">
          <header className="ac-head">
            <div>
              <h1>我的账号</h1>
              {user && <p>{user.email} · {user.store_name}</p>}
            </div>
            <button
              onClick={() => { logout(); window.location.href = '/logout'; }}
              className="ac-logout"
            >退出登录</button>
          </header>

          <nav className="ac-tabs">
            <button className={`ac-tab ${tab === 'orders' ? 'is-active' : ''}`} onClick={() => setTab('orders')}>历史订单</button>
            <button className={`ac-tab ${tab === 'addresses' ? 'is-active' : ''}`} onClick={() => setTab('addresses')}>收货地址</button>
            <button className={`ac-tab ${tab === 'discounts' ? 'is-active' : ''}`} onClick={() => setTab('discounts')}>我的优惠券</button>
          </nav>

          {tab === 'orders' && <OrdersPanel orders={orders || []} />}
          {tab === 'addresses' && <AddressesPanel addresses={addresses || []} />}
          {tab === 'discounts' && <DiscountsPanel claims={discountClaims || []} />}
        </main>
      <Footer shopName={shopName} />
      <AccountStyles />
    </>
  );
}

function displayStatus(o: any): { label: string; tone: string } {
  const fin = o.financial_status || 'pending';
  const ful = o.fulfillment_status || 'unfulfilled';
  if (fin === 'voided' || fin === 'refunded') return { label: '已取消', tone: 'pill-gray' };
  if (fin === 'pending') return { label: '待支付', tone: 'pill-warn' };
  if (fin === 'paid' && ful === 'fulfilled') return { label: o.tracking_number ? '已发货' : '已完成', tone: 'pill-info' };
  if (fin === 'paid') return { label: '已支付', tone: 'pill-ok' };
  return { label: o.status || fin, tone: 'pill-gray' };
}

function OrdersPanel({ orders }: { orders: any[] }) {
  if (orders.length === 0) {
    return (
      <div className="ac-empty">
        <p>还没有订单</p>
        <Link to="/products" className="ac-cta">去逛逛</Link>
      </div>
    );
  }
  return (
    <div className="ac-orders">
      {orders.map((o) => (
        <Link key={o.order_id} to={`/account/orders/${o.order_id}`} className="ac-order">
          <div className="ac-order-head">
            <div>
              <code className="ac-order-id">{o.order_id}</code>
              {(() => { const s = displayStatus(o); return <span className={`pill ${s.tone}`}>{s.label}</span>; })()}
              {o.tracking_number && <code className="ac-tracking">{o.tracking_number}</code>}
            </div>
            <Money
              data={o.total_price
                ? { amount: o.total_price.amount, currencyCode: o.total_price.currency_code }
                : { amount: '0.00', currencyCode: o.currency_code || 'CNY' }}
              className="ac-order-amt"
            />
          </div>
          <div className="ac-order-time">下单时间：{formatDateTime(o.created_at)}</div>
        </Link>
      ))}
    </div>
  );
}

function AddressesPanel({ addresses }: { addresses: Address[] }) {
  const [editing, setEditing] = React.useState<Address | null>(null);
  const [creating, setCreating] = React.useState(false);

  const handleSetDefault = async (id: string) => {
    const fd = new FormData();
    fd.set('intent', 'address-set-default');
    fd.set('id', id);
    await fetch('/account', { method: 'POST', body: fd });
    // RR7 会自动 revalidate
  };

  const handleRemove = async (id: string) => {
    const fd = new FormData();
    fd.set('intent', 'address-delete');
    fd.set('id', id);
    await fetch('/account', { method: 'POST', body: fd });
  };

  const handleSubmit = async (input: any, asDefault: boolean) => {
    const fd = new FormData();
    fd.set('intent', 'address-save');
    if (editing) fd.set('id', editing.id);
    Object.entries(input).forEach(([k, v]) => fd.set(k, String(v ?? '')));
    if (asDefault) fd.set('isDefault', 'true');
    const res = await fetch('/account', { method: 'POST', body: fd });
    const data: any = await res.json();
    return {
      address: data.address,
      userErrors: data.error ? [{ code: 'API', message: data.error }] : [],
    };
  };

  return (
    <>
      <AddressList
        addresses={addresses}
        onEdit={setEditing}
        onAdd={() => setCreating(true)}
        onSetDefault={handleSetDefault}
        onRemove={handleRemove}
        emptyText="还没有保存的地址"
      />
      {(editing || creating) && (
        <div className="ac-modal" onClick={() => { setEditing(null); setCreating(false); }}>
          <div className="ac-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? '编辑地址' : '新增地址'}</h3>
            <AddressForm
              initial={editing || undefined}
              onSubmit={handleSubmit}
              onSaved={() => { setEditing(null); setCreating(false); }}
              onCancel={() => { setEditing(null); setCreating(false); }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function DiscountsPanel({ claims }: { claims: any[] }) {
  const [filter, setFilter] = React.useState<'available' | 'used' | 'expired'>('available');
  return (
    <>
      <div className="ac-discount-filters">
        <button className={`ac-filter-tab ${filter === 'available' ? 'is-active' : ''}`} onClick={() => setFilter('available')}>可用</button>
        <button className={`ac-filter-tab ${filter === 'used' ? 'is-active' : ''}`} onClick={() => setFilter('used')}>已用完</button>
        <button className={`ac-filter-tab ${filter === 'expired' ? 'is-active' : ''}`} onClick={() => setFilter('expired')}>已过期</button>
      </div>
      <MyDiscountList claims={claims} filter={filter} emptyText="还没有优惠券，去商品页领取吧" />
    </>
  );
}

function AccountStyles() {
  return <style dangerouslySetInnerHTML={{ __html: `
.ac { padding: 56px 0 80px; max-width: 880px; }
.ac-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
.ac-head p { color: var(--c-muted); margin: 4px 0 0; font-size: 14px; }
.ac-logout { padding: 9px 18px; background: #fff; color: var(--c-ink); border: 1px solid var(--c-line-2); border-radius: var(--r-pill); font-size: 13.5px; font-family: inherit; cursor: pointer; }
.ac-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--c-line); margin-bottom: 28px; }
.ac-tab { padding: 12px 20px; background: transparent; border: none; color: var(--c-muted); font-family: inherit; font-size: 14.5px; font-weight: 500; cursor: pointer; bottom: -1px; border-bottom: 2px solid transparent; }
.ac-tab.is-active { color: var(--c-accent); border-bottom-color: var(--c-accent); }
.ac-empty { text-align: center; padding: 64px 24px; background: var(--c-bg-soft); border-radius: 14px; }
.ac-empty p { color: var(--c-muted); margin: 0 0 18px; font-size: 15px; }
.ac-cta { display: inline-flex; padding: 12px 28px; background: var(--c-ink); color: #fff; border-radius: var(--r-pill); font-size: 14px; font-weight: 600; }
.ac-orders { display: flex; flex-direction: column; gap: 12px; }
.ac-order { background: #fff; border: 1px solid var(--c-line); border-radius: 12px; padding: 18px 22px; display: block; transition: border-color 150ms ease; }
.ac-order:hover { border-color: var(--c-line-2); }
.ac-order-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 12px; flex-wrap: wrap; }
.ac-order-head > div:first-child { display: flex; align-items: center; gap: 10px; }
.ac-order-id { font-family: 'JetBrains Mono', monospace; background: var(--c-bg-soft); padding: 3px 8px; border-radius: 5px; font-size: 12.5px; }
.ac-tracking { font-family: 'JetBrains Mono', monospace; background: #f0f9ff; color: #075985; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 4px; }
.ac-order-amt { font-size: 18px; font-weight: 700; color: var(--c-accent); font-feature-settings: 'tnum'; }
.ac-order-time { font-size: 12px; color: var(--c-muted-2); }
.pill { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: var(--r-pill); font-size: 11.5px; font-weight: 600; }
.pill-ok { background: #dcfce7; color: #166534; }
.pill-warn { background: #fef3c7; color: #854d0e; }
.pill-info { background: #dbeafe; color: #1e40af; }
.pill-gray { background: var(--c-bg-soft-2); color: var(--c-ink-2); }
.ac-discount-filters { display: flex; gap: 8px; margin-bottom: 18px; }
.ac-filter-tab { padding: 7px 16px; background: var(--c-bg-soft); border: none; border-radius: var(--r-pill); font-size: 13px; color: var(--c-ink-2); cursor: pointer; font-family: inherit; }
.ac-filter-tab.is-active { background: var(--c-ink); color: #fff; }
/* MyDiscountList 样式在 app.css 全局 */
.ac-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.ac-modal-card { background: #fff; border-radius: 14px; width: 100%; max-width: 560px; padding: 28px; max-height: 90vh; overflow-y: auto; }
[data-address-list] { display: flex; flex-direction: column; gap: 12px; }
[data-address-item] { background: #fff; border: 1px solid var(--c-line); border-radius: 12px; padding: 16px 20px; }
[data-address-item][data-default] { border-color: var(--c-accent); }
[data-address-item] [data-row] { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 8px; }
[data-address-item] [data-name] { font-size: 15px; font-weight: 600; }
[data-address-item] [data-line] { font-size: 13px; color: var(--c-muted); margin-top: 2px; }
[data-add-address] { padding: 10px 22px; background: var(--c-ink); color: #fff; border: none; border-radius: var(--r-pill); font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
[data-address-form] { display: flex; flex-direction: column; gap: 14px; }
[data-address-form] label { display: flex; flex-direction: column; gap: 6px; font-size: 13.5px; color: var(--c-muted); }
[data-address-form] input { padding: 11px 14px; border: 1px solid var(--c-line-2); border-radius: 8px; font-family: inherit; font-size: 14.5px; outline: none; }
[data-address-form] [data-row] { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
[data-address-form] [data-actions] { display: flex; justify-content: flex-end; gap: 10px; }
`}} />;
}

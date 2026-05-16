/**
 * routes/account.orders.$id.tsx — /account/orders/:id
 */

import { useLoaderData, Link } from 'react-router';
import { Money } from '@shopbb/helium/components';
import { formatDateTime } from '@shopbb/helium';
import { Header, Footer } from '~/components/Header';
import { useRootLoader } from '~/root';
import type { Route } from './+types/account.orders.$id';

export const meta: Route.MetaFunction = ({ data }) => {
  const o = (data as any)?.order;
  return [{ title: o ? `订单 ${o.order_id} · Shopflare` : '订单 · Shopflare' }];
};

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const id = params.id!;
  const cookieHeader = request.headers.get('Cookie') || '';
  const buyerMatch = cookieHeader.match(/(?:^|;\s*)__buyer=([^;]+)/);
  const buyerToken = buyerMatch ? decodeURIComponent(buyerMatch[1]) : null;
  if (!buyerToken) throw new Response('Unauthorized', { status: 401 });

  const apiBase = context.helium.store.apiBase;
  const res = await fetch(`${apiBase}/api/buyer/orders/${id}`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  if (!res.ok) throw new Response('Order not found', { status: 404 });
  const data: any = await res.json();
  if (!data.success) throw new Response(data.error || 'Order not found', { status: 404 });
  return { order: data.order };
}

export default function OrderDetailRoute() {
  const { order } = useLoaderData<typeof loader>() as any;
  const root = useRootLoader();
  const shopName = root?.store?.shopName || 'Shopflare';

  return (
    <>
      <Header shopName={shopName} />
      <main className="sf-container" style={{ padding: '56px 0 80px', maxWidth: 880 }}>
        <Link to="/account" style={{ fontSize: 14, color: 'var(--c-muted)', marginBottom: 20, display: 'inline-block' }}>← 返回我的账号</Link>
        <h1 style={{ marginBottom: 24 }}>订单详情</h1>

        <div className="od-card">
          <div className="od-row"><span>订单号</span><code>{order.order_id}</code></div>
          <div className="od-row"><span>状态</span><span>{order.financial_status} / {order.fulfillment_status}</span></div>
          <div className="od-row"><span>金额</span>
            <Money data={order.total_price || { amount: String((order.total_amount ?? 0) / 100), currencyCode: order.currency_code || 'CNY' }} as="strong" />
          </div>
          {order.tracking_number && (
            <div className="od-row"><span>物流</span><code>{order.tracking_company || ''} {order.tracking_number}</code></div>
          )}
          <div className="od-row"><span>下单时间</span>{formatDateTime(order.created_at)}</div>
          {order.paid_at && <div className="od-row"><span>支付时间</span>{formatDateTime(order.paid_at)}</div>}
          {order.fulfilled_at && <div className="od-row"><span>发货时间</span>{formatDateTime(order.fulfilled_at)}</div>}
        </div>
      </main>
      <Footer shopName={shopName} />
      <style dangerouslySetInnerHTML={{ __html: `
.od-card { background: var(--c-bg-soft); border-radius: var(--r-xl); padding: 24px; }
.od-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed var(--c-line); font-size: 14px; }
.od-row:last-child { border-bottom: none; }
.od-row span:first-child { color: var(--c-muted); }
.od-row code { font-family: 'JetBrains Mono', monospace; background: #fff; padding: 2px 8px; border-radius: 4px; font-size: 12.5px; }
.od-row strong { font-size: 18px; color: var(--c-accent); }
`}} />
    </>
  );
}

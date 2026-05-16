/**
 * routes/payment.tsx — /payment?orderId=xxx
 *
 * 模拟支付：POST /api/orders/webhook/payment with Idempotency-Key
 */

import { useLoaderData, Form, useActionData, Link, data } from 'react-router';
import { Money } from '@shopbb/helium/components';
import { Header, Footer } from '~/components/Header';
import { useRootLoader } from '~/root';
import type { Route } from './+types/payment';

export const meta: Route.MetaFunction = () => [{ title: '支付 · Shopflare' }];

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('orderId');
  if (!orderId) {
    return { order: null, orderId: null };
  }
  const apiBase = context.helium.store.apiBase;
  const res = await fetch(`${apiBase}/api/checkout/orders/${orderId}`).catch(() => null);
  if (!res || !res.ok) {
    return { order: null, orderId };
  }
  const json: any = await res.json();
  return { order: json.success ? json.order : null, orderId };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const orderId = String(formData.get('orderId') || '');
  if (!orderId) return data({ error: '缺少 orderId' }, { status: 400 });

  const idemKey = `pay_${orderId}_${Date.now()}`;
  const apiBase = context.helium.store.apiBase;
  const res = await fetch(`${apiBase}/api/orders/webhook/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey },
    body: JSON.stringify({ orderId }),
  });
  const result: any = await res.json();
  if (!result.success) return data({ error: result.error || '支付失败' }, { status: 400 });
  return data({ success: true, orderId });
}

export default function PaymentRoute() {
  const { order, orderId } = useLoaderData<typeof loader>() as any;
  const actionData = useActionData<typeof action>() as any;
  const root = useRootLoader();
  const shopName = root?.store?.shopName || 'Shopflare';

  if (!orderId) {
    return (
      <>
        <Header shopName={shopName} />
        <main className="sf-container" style={{ padding: '64px 24px', textAlign: 'center', maxWidth: 640 }}>
          <h1>没有待支付订单</h1>
          <p style={{ color: 'var(--c-muted)', marginTop: 16, marginBottom: 28 }}>这里没有可支付的订单。</p>
          <Link to="/products" className="py-cta">继续购物</Link>
        </main>
        <Footer shopName={shopName} />
        <PaymentStyles />
      </>
    );
  }

  if (actionData?.success || order?.financial_status === 'paid') {
    return (
      <>
        <Header shopName={shopName} />
        <main className="sf-container py">
          <div className="py-success">
            <div className="py-success-icon" aria-hidden="true">✓</div>
            <h1>支付成功</h1>
            <p>订单 <code>{orderId}</code> 已支付成功</p>
            <p style={{ color: 'var(--c-muted)', fontSize: 13.5, maxWidth: 460, margin: '12px auto 24px' }}>
              我们正在准备你的商品，发货后会推送物流信息。
            </p>
            <div style={{ display: 'inline-flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link to={`/account/orders/${orderId}`} className="py-cta">查看订单详情</Link>
              <Link to="/products" className="py-cta-secondary">继续购物</Link>
            </div>
          </div>
        </main>
        <Footer shopName={shopName} />
        <PaymentStyles />
      </>
    );
  }

  return (
    <>
      <Header shopName={shopName} />
      <main className="sf-container py">
        <h1>模拟支付</h1>

        {order ? (
          <div className="py-card">
            <div className="py-row"><span>订单号</span><code>{orderId}</code></div>
            <div className="py-row">
              <span>金额</span>
              <Money
                as="strong"
                data={order.total_price
                  ? { amount: order.total_price.amount, currencyCode: order.total_price.currency_code }
                  : { amount: String((order.total_amount ?? 0) / 100), currencyCode: order.currency_code || 'CNY' }}
              />
            </div>
            <div className="py-row"><span>状态</span><span className="py-status">{order.financial_status || order.status}</span></div>
          </div>
        ) : (
          <div className="py-card">
            <p style={{ color: 'var(--c-muted)' }}>订单不存在或加载失败</p>
          </div>
        )}

        {actionData?.error && <div className="py-err">{actionData.error}</div>}

        <Form method="POST" className="py-buttons">
          <input type="hidden" name="orderId" value={orderId} />
          <button type="submit" className="py-cta" disabled={!order}>
            {actionData?.error ? '重试支付' : '模拟支付 →'}
          </button>
          <Link to="/account" className="py-cta-secondary">稍后支付</Link>
        </Form>

        <p className="py-hint">
          这是 demo 模拟支付。点击后会调 <code>/api/orders/webhook/payment</code>，
          支付成功后 FulfillmentWorkflow 自动跑（发邮件 / 通知仓库 / 生成 tracking）。
        </p>
      </main>
      <Footer shopName={shopName} />
      <PaymentStyles />
    </>
  );
}

function PaymentStyles() {
  return <style dangerouslySetInnerHTML={{ __html: `
.py { padding: 64px 0 80px; max-width: 640px; text-align: center; }
.py h1 { font-size: clamp(28px, 4vw, 40px); margin-bottom: 32px; }
.py-card { text-align: left; background: var(--c-bg-soft); border-radius: var(--r-xl); padding: 22px 26px; margin: 0 auto 28px; max-width: 460px; }
.py-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed var(--c-line); font-size: 14px; }
.py-row:last-child { border-bottom: none; }
.py-row span:first-child { color: var(--c-muted); }
.py-row code { font-family: 'JetBrains Mono', monospace; background: #fff; padding: 2px 8px; border-radius: 4px; font-size: 12.5px; }
.py-row strong { font-size: 18px; color: var(--c-accent); }
.py-status { background: #fef3c7; color: #854d0e; padding: 3px 10px; border-radius: var(--r-pill); font-size: 12px; font-weight: 600; }
.py-buttons { display: inline-flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 20px 0; }
.py-cta { padding: 14px 36px; background: var(--c-ink); color: #fff; border: none; border-radius: var(--r-pill); font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; }
.py-cta:hover:not(:disabled) { background: var(--c-accent); }
.py-cta:disabled { background: var(--c-line-2); cursor: not-allowed; }
.py-cta-secondary { display: inline-flex; align-items: center; padding: 14px 24px; background: #fff; color: var(--c-ink); border: 1px solid var(--c-line-2); border-radius: var(--r-pill); font-size: 14.5px; font-weight: 500; }
.py-cta-secondary:hover { background: var(--c-bg-soft); }
.py-hint { color: var(--c-muted); font-size: 13px; max-width: 460px; margin: 18px auto 0; line-height: 1.6; }
.py-hint code { font-family: 'JetBrains Mono', monospace; background: var(--c-bg-soft); padding: 1px 6px; border-radius: 4px; font-size: 11.5px; }
.py-err { color: #b91c1c; font-size: 13.5px; padding: 10px 14px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca; max-width: 460px; margin: 0 auto; }
.py-success { padding: 40px 24px; }
.py-success-icon { width: 80px; height: 80px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; background: #dcfce7; color: #166534; border-radius: 50%; font-size: 40px; font-weight: 700; }
.py-success h1 { font-size: 28px; margin: 0 0 12px; }
.py-success p code { background: var(--c-bg-soft); padding: 2px 8px; border-radius: 4px; font-size: 12.5px; }
`}} />;
}

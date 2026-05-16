/**
 * CartMain / CartLineItem / CartSummary
 *
 * 0.7 重写：严格对齐 Hydrogen skeleton 模式：
 *   - cart 通过 props 传入（不靠 useCart）
 *   - useOptimisticCart 用 useFetchers() 看全局 in-flight mutation
 *   - 每个按钮包 <CartForm fetcherKey>，提交后 RR7 自动 revalidate
 */

import * as React from 'react';
import { Link } from 'react-router';
import {
  CartForm,
  CartLineProvider, useCartLine,
  Image, Money, CartCost,
  useOptimisticCart,
  DiscountSelector,
  type AppliedDiscountClaim,
  type DiscountClaim,
  type DiscountAllocation,
} from '@shopbb/helium/components';

/**
 * 是否已登录买家 — 由 cart loader 通过 root loader 传入。
 * 未登录时 DiscountSelector 显示 "登录后可用" 引导，
 * 登录但 myClaims 空时显示 "暂无可用优惠券"。
 */
export interface CartMainProps {
  cart: any;
  /** 买家已领的所有 discount claims（从 customer loader 拉） */
  myClaims?: DiscountClaim[];
  /** 买家是否已登录（决定 DiscountSelector 显示登录引导还是空状态） */
  signedIn?: boolean;
  layout?: 'page' | 'aside';
}

export function CartMain({ cart: originalCart, myClaims = [], signedIn = false, layout = 'page' }: CartMainProps) {
  const cart = useOptimisticCart(originalCart);
  const lines = cart?.lines?.nodes ?? [];
  const isEmpty = !cart || lines.length === 0;

  if (isEmpty) {
    return (
      <div className="ct-empty">
        <div className="ct-empty-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
        </div>
        <p className="ct-empty-title">购物车是空的</p>
        <p className="ct-empty-sub">浏览商品发现你喜欢的吧</p>
        <Link to="/products" className="ct-empty-cta">浏览全部商品</Link>
      </div>
    );
  }

  // appliedClaim / appliedAllocation 从 cart 直接拿（oxygen 已写入 cart.appliedDiscountClaim + discountAllocations）
  const appliedClaim: AppliedDiscountClaim | null = (cart as any)?.appliedDiscountClaim || null;
  const appliedAllocation: DiscountAllocation | null = (cart as any)?.discountAllocations?.[0] || null;

  return (
    <div className={`ct ct-${layout}`}>
      <div className="ct-lines">
        {lines.map((line: any) => (
          <CartLineProvider key={line.id} line={line}>
            <CartLineItem />
          </CartLineProvider>
        ))}
      </div>

      <aside className="ct-aside">
        <div className="ct-summary">
          <div className="ct-summary-title">订单摘要</div>
          <div className="ct-summary-rows">
            <div className="ct-row"><span>商品小计</span><CartCost cart={cart} amountType="subtotal" /></div>
            <CartCost cart={cart} amountType="discount">
              {(money) => Number(money.amount) > 0 ? (
                <div className="ct-row ct-row-discount">
                  <span>优惠</span>
                  <span>− <Money data={money} /></span>
                </div>
              ) : null}
            </CartCost>
            <div className="ct-row ct-row-total">
              <span>合计</span>
              <CartCost cart={cart} amountType="total" as="strong" />
            </div>
          </div>

          <div className="ct-discount">
            <DiscountSelector
              myClaims={myClaims}
              appliedClaim={appliedClaim}
              appliedAllocation={appliedAllocation}
              unauthenticated={!signedIn}
            />
          </div>

          <Link to="/checkout" className="ct-cta">去结算</Link>
        </div>
      </aside>
    </div>
  );
}

function CartLineItem() {
  const line = useCartLine();
  const lineId = line.id;
  const isOptimistic = (line as any).isOptimistic;
  const product = line.merchandise?.product;
  const variant = line.merchandise;

  // fetcherKey: 同 lineId 的 update 互相 cancel
  const updateKey = `LinesUpdate-${lineId}`;
  const removeKey = `LinesRemove-${lineId}`;

  return (
    <div className="ct-line" data-optimistic={isOptimistic ? '' : undefined}>
      <div className="ct-line-img">
        {variant?.image?.url ? (
          <Image data={variant.image} alt={variant.image.altText || product?.title || ''} sizes="80px" />
        ) : <div className="ct-line-img-empty" />}
      </div>

      <div className="ct-line-info">
        <Link to={product?.handle ? `/products/${product.handle}` : '#'} className="ct-line-title">
          {product?.title || variant?.title || 'Unknown'}
        </Link>
        {variant?.title && variant.title !== 'Default Title' && variant.title !== 'Default' && (
          <div className="ct-line-variant">{variant.title}</div>
        )}
        <div className="ct-line-price">
          <Money data={variant?.price ?? { amount: '0', currencyCode: 'CNY' }} /> × {line.quantity}
        </div>
      </div>

      <div className="ct-line-qty">
        {/* 减号 */}
        <CartForm
          fetcherKey={updateKey}
          action={CartForm.ACTIONS.LinesUpdate}
          inputs={{ lines: [{ id: lineId, quantity: Math.max(0, line.quantity - 1) }] }}
        >
          <button type="submit" className="ct-qty-btn" disabled={line.quantity <= 1 || !!isOptimistic} aria-label="减少">−</button>
        </CartForm>

        <span className="ct-qty-value">{line.quantity}</span>

        {/* 加号 */}
        <CartForm
          fetcherKey={updateKey}
          action={CartForm.ACTIONS.LinesUpdate}
          inputs={{ lines: [{ id: lineId, quantity: line.quantity + 1 }] }}
        >
          <button type="submit" className="ct-qty-btn" disabled={!!isOptimistic} aria-label="增加">+</button>
        </CartForm>
      </div>

      <div className="ct-line-total">
        <Money data={line.cost?.totalAmount ?? { amount: '0', currencyCode: 'CNY' }} />
      </div>

      <CartForm
        fetcherKey={removeKey}
        action={CartForm.ACTIONS.LinesRemove}
        inputs={{ lineIds: [lineId] }}
      >
        <button type="submit" className="ct-line-remove" disabled={!!isOptimistic} aria-label="删除">×</button>
      </CartForm>
    </div>
  );
}

export function CartStyles() {
  return <style dangerouslySetInnerHTML={{ __html: `
.ct { display: grid; grid-template-columns: 1fr 360px; gap: 32px; }
@media (max-width: 900px) { .ct { grid-template-columns: 1fr; } }
.ct-lines { display: flex; flex-direction: column; gap: 12px; }
.ct-line { display: grid; grid-template-columns: 80px 1fr auto auto 32px; gap: 16px; align-items: center; padding: 16px; background: #fff; border: 1px solid var(--c-line); border-radius: var(--r-lg); transition: opacity 200ms ease, border-color 200ms ease; }
.ct-line:hover { border-color: var(--c-line-2); }
@media (max-width: 600px) {
  .ct-line { grid-template-columns: 64px 1fr auto; grid-template-areas: 'img info remove' 'img qty total'; gap: 12px; }
  .ct-line-img { grid-area: img; width: 64px; height: 64px; }
  .ct-line-info { grid-area: info; }
  .ct-line-qty { grid-area: qty; }
  .ct-line-total { grid-area: total; }
  .ct-line-remove { grid-area: remove; }
}
.ct-line[data-optimistic] { opacity: 0.6; }
.ct-line-img { width: 80px; height: 80px; border-radius: var(--r-md); overflow: hidden; background: var(--c-bg-soft); }
.ct-line-img img { width: 100%; height: 100%; object-fit: cover; }
.ct-line-img-empty { width: 100%; height: 100%; background: linear-gradient(135deg, var(--c-bg-soft-2), var(--c-line)); }
.ct-line-title { font-size: 14.5px; font-weight: 600; color: var(--c-ink); display: block; }
.ct-line-variant { font-size: 12px; color: var(--c-muted); margin-top: 2px; }
.ct-line-price { font-size: 13px; color: var(--c-muted); margin-top: 4px; font-feature-settings: 'tnum'; }
.ct-line-qty { display: inline-flex; align-items: center; border: 1px solid var(--c-line); border-radius: var(--r-pill); overflow: hidden; }
.ct-line-qty form { display: inline; margin: 0; padding: 0; }
.ct-qty-btn { width: 32px; height: 32px; background: transparent; border: none; cursor: pointer; font-size: 16px; line-height: 1; color: var(--c-ink-2); font-family: inherit; }
.ct-qty-btn:hover:not(:disabled) { background: var(--c-bg-soft); color: var(--c-ink); }
.ct-qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.ct-qty-value { min-width: 32px; text-align: center; font-size: 14px; font-weight: 600; font-feature-settings: 'tnum'; }
.ct-line-total { font-size: 15px; font-weight: 700; color: var(--c-ink); font-feature-settings: 'tnum'; }
.ct-line-remove { width: 32px; height: 32px; background: transparent; border: none; color: var(--c-muted-2); font-size: 20px; line-height: 1; cursor: pointer; transition: color 150ms ease; }
.ct-line-remove:hover:not(:disabled) { color: #ef4444; }
.ct-aside { align-self: start; position: sticky; top: 80px; }
.ct-summary { background: var(--c-bg-soft); border-radius: var(--r-xl); padding: 24px; }
.ct-summary-title { font-size: 13px; font-weight: 700; color: var(--c-ink-2); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; }
.ct-summary-rows { display: flex; flex-direction: column; gap: 8px; padding-bottom: 16px; border-bottom: 1px solid var(--c-line); margin-bottom: 16px; }
.ct-row { display: flex; justify-content: space-between; font-size: 14px; color: var(--c-ink-2); font-feature-settings: 'tnum'; }
.ct-row-discount { color: var(--c-accent); }
.ct-row-total { padding-top: 8px; margin-top: 4px; border-top: 1px solid var(--c-line); font-size: 18px; color: var(--c-ink); }
.ct-row-total strong { font-size: 22px; }
.ct-discount { margin-bottom: 20px; }
.ct-cta { display: block; width: 100%; padding: 14px 24px; background: var(--c-ink); color: #fff; border-radius: var(--r-pill); text-align: center; font-size: 15px; font-weight: 600; }
.ct-cta:hover { background: var(--c-accent); color: #fff; }
.ct-empty { text-align: center; padding: 80px 24px; max-width: 480px; margin: 0 auto; }
.ct-empty-icon { color: var(--c-line-2); margin-bottom: 20px; }
.ct-empty-title { font-size: 18px; font-weight: 600; margin: 0 0 8px; }
.ct-empty-sub { color: var(--c-muted); margin: 0 0 28px; }
.ct-empty-cta { display: inline-block; padding: 14px 32px; background: var(--c-ink); color: #fff; border-radius: var(--r-pill); font-size: 15px; font-weight: 600; }
.ct-empty-cta:hover { background: var(--c-accent); color: #fff; }
`}} />;
}

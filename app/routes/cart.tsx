/**
 * routes/cart.tsx — /cart
 *
 * 0.7 重写：严格照抄 Hydrogen skeleton 的 cart.tsx 模式。
 *
 *   loader: return cart.get()
 *   action: switch CartForm.ACTIONS 调 cart handler
 *   组件: useLoaderData()
 */

import { useLoaderData, data, redirect } from 'react-router';
import { CartForm } from '@shopbb/helium/components';
import { Header, Footer } from '~/components/Header';
import { CartMain, CartStyles } from '~/components/CartMain';
import { useRootLoader } from '~/root';
import type { Route } from './+types/cart';

export const meta: Route.MetaFunction = () => [
  { title: '购物车 · Shopflare' },
];

export async function loader({ context, request }: Route.LoaderArgs) {
  // root loader 已经拉了 cart；这里如果还要重新拉，方便单独 invalidate。先复用 root 的 cart。
  // 同时拉买家已领的 discount claims（如果登录）。
  const cart = await context.helium.cart.get().catch(() => null);

  // 已登录买家的优惠券
  let myClaims: any[] = [];
  let signedIn = false;
  try {
    signedIn = await context.helium.customer.isLoggedIn();
    if (signedIn) {
      const result: any = await context.helium.customer.query(
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
      );
      myClaims = result?.customer?.discountClaims?.nodes ?? [];
    }
  } catch (e: any) {
    console.error('[cart-loader] discountClaims fetch failed:', e?.message || e);
  }

  return { cart, myClaims, signedIn };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { cart } = context.helium;
  const formData = await request.formData();
  const { action, inputs } = CartForm.getFormInput(formData);

  if (!action) throw new Response('No action provided', { status: 400 });

  let result: any;
  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines((inputs as any).lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines((inputs as any).lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines((inputs as any).lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate:
      result = await cart.updateDiscountCodes((inputs as any).discountCodes ?? []);
      break;
    default:
      if (action === 'CustomDiscountSelect') {
        result = await cart.selectDiscount((inputs as any).claimId);
      } else if (action === 'CustomDiscountClear') {
        result = await cart.clearDiscount();
      } else {
        throw new Response(`${action} cart action is not defined`, { status: 400 });
      }
  }

  // 把 helium 写入 responseHeaders 的 Set-Cookie 传给 RR7 response
  const headers = new Headers(context.responseHeaders);

  // BuyNowButton 等可以传 redirectTo 让我们 303 跳转
  const redirectTo = formData.get('redirectTo');
  if (typeof redirectTo === 'string') {
    headers.set('Location', redirectTo);
    return data({ cart: result.cart, userErrors: result.userErrors }, { status: 303, headers });
  }

  return data({ cart: result.cart, userErrors: result.userErrors }, { headers });
}

export default function CartRoute() {
  const { cart, myClaims, signedIn } = useLoaderData<typeof loader>() as any;
  const root = useRootLoader();
  const shopName = root?.store?.shopName || 'Shopflare';

  return (
    <>
      <Header shopName={shopName} cart={cart} />
      <main className="sf-container" style={{ padding: '56px 0 80px', maxWidth: 1100 }}>
        <h1 style={{ marginBottom: 32 }}>购物车</h1>
        <CartMain cart={cart} myClaims={myClaims} signedIn={signedIn} layout="page" />
      </main>
      <Footer shopName={shopName} />
      <CartStyles />
    </>
  );
}

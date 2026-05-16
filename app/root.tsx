/**
 * shopflare root layout — 严格对齐 Hydrogen skeleton 模式
 *
 * 0.7 重写：
 *   - 删除 CartProvider / DiscountProvider / AddressBookProvider
 *   - cart 数据通过 root loader 返回，子 route 用 useRouteLoaderData('root') 拿
 *   - 仅保留 ShopifyProvider（只放 store 元信息）和 AnalyticsProvider（cart prop 接入）
 */

import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
  useLoaderData,
  type LinksFunction,
} from 'react-router';
import * as React from 'react';
import { ShopifyProvider, AnalyticsProvider } from '@shopbb/helium/components';
import './app.css';
import type { Route } from './+types/root';

export const links: LinksFunction = () => [];

export async function loader({ context }: Route.LoaderArgs) {
  const { cart, store } = context.helium;
  const cartData = await cart.get().catch(() => null);
  return {
    store,
    cart: cartData,
  };
}

export const meta: Route.MetaFunction = ({ data }) => {
  const shopName = (data as any)?.store?.shopName || 'Shopflare';
  return [
    { title: `${shopName} · Cloudflare 周边官方商城` },
    { name: 'description', content: 'Cloudflare 周边官方商城 · 跑在 shopbb 平台上' },
    { property: 'og:type', content: 'website' },
  ];
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  const { store, cart } = data as any;

  return (
    <ShopifyProvider
      storeId={store.id}
      storefrontAccessToken={store.publicAccessToken}
      apiUrl={store.apiUrl}
      shopName={store.shopName}
      currencyCode="CNY"
      locale="zh-CN"
      meta={{ apiBase: store.apiBase, storeSubdomain: store.subdomain }}
    >
      <AnalyticsProvider
        cart={cart}
        onEvent={(e) => {
          if (typeof console !== 'undefined' && console.debug) {
            console.debug('[analytics]', e.name, e.payload);
          }
        }}
      >
        <Outlet />
      </AnalyticsProvider>
    </ShopifyProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = '出错了';
  let details = '出现了意外错误';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : `错误 ${error.status}`;
    details = error.status === 404 ? '请求的页面不存在' : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="sf-error">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="sf-error-stack">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

/** 子 route 通过这个拿 root loader 的 store/cart */
export function useRootLoader() {
  return useRouteLoaderData('root') as Awaited<ReturnType<typeof loader>>;
}

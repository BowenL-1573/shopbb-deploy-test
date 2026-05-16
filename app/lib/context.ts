/**
 * createAppLoadContext — 每个请求构造一份 AppLoadContext
 *
 * Hydrogen 的等价物。每个 loader/action 都能通过 `context.helium` 拿到：
 *   - storefront client（GraphQL query/mutate）
 *   - cart handler（addLines / updateLines / setCartId / ...）
 *   - customer account client（buyer GraphQL）
 *   - withCache helper
 *
 * Buyer JWT 在 oxygen 这边走 localStorage（CSR）或 Authorization header（SSR/SDK）。
 * 因为浏览器 SSR 请求**不会带 localStorage**，我们额外从 cookie 里读
 * `__buyer` 作为 SSR 阶段的 buyer token 来源（client login 后会 set 这个 cookie）。
 */

import {
  createStorefrontClient,
  createCartHandler,
  cartGetIdDefault,
  cartSetIdDefault,
  createCustomerAccountClient,
  createWithCache,
} from '@shopbb/helium';
import type {
  StorefrontClient,
  CartHandler,
} from '@shopbb/helium';
import type { CustomerAccountClient } from '@shopbb/helium';

// 平台 API endpoints — 部署阶段从 wrangler/env 覆盖
const API_URL = 'https://api.oxygen-demo.cloudc.top/api/2026-04/graphql.json';
const API_BASE = 'https://api.oxygen-demo.cloudc.top';
const CUSTOMER_API_URL = 'https://api.oxygen-demo.cloudc.top/customer/api/2026-04/graphql';

export interface HeliumLoadContext {
  storefront: StorefrontClient;
  cart: CartHandler;
  customer: CustomerAccountClient;
  withCache: ReturnType<typeof createWithCache>;
  /** 当前请求的 store metadata（gateway 注入到 header） */
  store: {
    id: string;
    subdomain: string;
    shopName: string;
    publicAccessToken: string;
    apiBase: string;
    apiUrl: string;
  };
}

export interface CreateAppLoadContextOptions {
  request: Request;
  env: any;
  ctx: ExecutionContext;
}

/** 从 cookie 里读 buyer token（SSR 用） */
function getBuyerTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie') || '';
  const m = cookieHeader.match(/(?:^|;\s*)__buyer=([^;]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

export async function createAppLoadContext(options: CreateAppLoadContextOptions): Promise<{
  helium: HeliumLoadContext;
  responseHeaders: Headers;
}> {
  const { request, env, ctx } = options;
  const responseHeaders = new Headers();

  // gateway 注入的 store metadata
  const publicAccessToken = request.headers.get('X-Public-Storefront-Token') || '';
  const storeId = request.headers.get('X-Store-Id') || '';
  const storeSubdomain = request.headers.get('X-Store-Subdomain') || '';
  const shopName = decodeURIComponent(request.headers.get('X-Store-Shop-Name') || 'Shopflare');

  // ---------- helium storefront client ----------
  // buyer JWT 从 cookie 拿（client 登录后写的 __buyer cookie）。
  // helium 0.7.3+ 支持 getBuyerToken，会自动带 Authorization header — cart 选优惠券等
  // 需要买家身份的 API 都能识别。
  const buyerToken = getBuyerTokenFromCookie(request);
  const storefront = createStorefrontClient({
    apiUrl: API_URL,
    publicAccessToken,
    storeId,
    request,
    cache: env.CACHE || undefined,
    waitUntil: (p) => ctx.waitUntil(p),
    getBuyerToken: () => buyerToken,
  });

  // ---------- helium cart handler ----------
  // cart cookie：cart=<uuid>；helium 已提供默认 getter/setter
  const cart = createCartHandler({
    storefront,
    getCartId: cartGetIdDefault(request.headers),
    setCartId: cartSetIdDefault({ maxage: 60 * 60 * 24 * 365 }),
    responseHeaders,
  });

  // ---------- customer account client ----------
  const customer = createCustomerAccountClient({
    customerApiUrl: CUSTOMER_API_URL,
    getAccessToken: () => buyerToken,
    extraHeaders: storeId ? { 'X-Store-Id': storeId } : undefined,
  });

  // ---------- withCache（暂用 InMemoryCache 兜底） ----------
  const withCache = createWithCache({
    cache: env.CACHE || (await caches.open('shopflare')),
    waitUntil: (p) => ctx.waitUntil(p),
  });

  return {
    helium: {
      storefront,
      cart,
      customer,
      withCache,
      store: {
        id: storeId,
        subdomain: storeSubdomain,
        shopName,
        publicAccessToken,
        apiBase: API_BASE,
        apiUrl: API_URL,
      },
    },
    responseHeaders,
  };
}

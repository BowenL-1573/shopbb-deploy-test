/**
 * Cloudflare Worker entry point.
 *
 * 这里把 fetch 转给 react-router framework mode 的 request handler。
 * 路由 / SSR / asset 都由 react-router 处理。
 *
 * 我们把 helium context（storefront client + cart handler）通过
 * AppLoadContext 注入，让所有 route 的 loader/action 都能直接用 context.cart / context.storefront。
 */

import { createRequestHandler } from 'react-router';
import { createAppLoadContext } from '~/lib/context';

declare module 'react-router' {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
    /** helium context — storefront client / cart handler / customer / etc. */
    helium: Awaited<ReturnType<typeof createAppLoadContext>>['helium'];
    /** 当前请求 ResponseHeaders（用于 Set-Cookie 等） */
    responseHeaders: Headers;
  }
}

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    try {
      const loadContext = await createAppLoadContext({ request, env, ctx });
      const response = await requestHandler(request, {
        cloudflare: { env, ctx },
        ...loadContext,
      });
      // 把 responseHeaders 上的 Set-Cookie 等合并到最终响应
      loadContext.responseHeaders.forEach((value, key) => {
        // Set-Cookie 用 append 否则会覆盖多个 cookie
        if (key.toLowerCase() === 'set-cookie') {
          response.headers.append(key, value);
        } else if (!response.headers.has(key)) {
          response.headers.set(key, value);
        }
      });
      return response;
    } catch (err: any) {
      console.error('[shopflare worker]', err);
      return new Response('Internal Error: ' + (err?.message || String(err)), {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  },
} satisfies ExportedHandler<Env>;

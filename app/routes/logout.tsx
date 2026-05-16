/**
 * /logout — 服务端 clear cookie 路由
 *
 * `cart` cookie 是 HttpOnly，客户端 JS 无法删除。
 * 通过此 action 由服务端发 Set-Cookie 清空 cart + __buyer。
 */

import { redirect } from 'react-router';
import type { Route } from './+types/logout';

const CLEAR = [
  'cart=; Path=/; Max-Age=0; SameSite=Lax; Secure; HttpOnly',
  '__buyer=; Path=/; Max-Age=0; SameSite=Lax; Secure; HttpOnly',
];

export async function action(_args: Route.ActionArgs) {
  const headers = new Headers();
  for (const c of CLEAR) headers.append('Set-Cookie', c);
  headers.set('Location', '/');
  return new Response(null, { status: 302, headers });
}

export async function loader() {
  // 直接 GET /logout 也走清理 + 跳转
  const headers = new Headers();
  for (const c of CLEAR) headers.append('Set-Cookie', c);
  headers.set('Location', '/');
  return new Response(null, { status: 302, headers });
}

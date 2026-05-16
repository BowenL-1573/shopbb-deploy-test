/**
 * 买家认证 — client-side
 *
 * - login / register / logout → 调 oxygen REST `/api/buyer/*`
 * - token + user 存 localStorage（client） + cookie（让 SSR loader/action 能取到）
 * - useBuyer() hook 返回当前买家
 *
 * 不同于 Hydrogen 用 OAuth + Customer Account API，我们 oxygen 用简化的 JWT。
 */

import { useEffect, useState, useCallback } from 'react';

const TOKEN_KEY = 'shopflare:buyer_token';
const USER_KEY = 'shopflare:buyer_user';
const COOKIE_KEY = '__buyer';

export interface BuyerUser {
  user_id: string;
  email: string;
  role: 'buyer';
  store_id: string;
  store_name?: string;
  store_subdomain?: string;
}

function readToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function readUser(): BuyerUser | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeAuth(token: string, user: BuyerUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // 同步 cookie 让 SSR 拿得到 buyer token（HttpOnly=false 因为 client 也要读）
  if (typeof document !== 'undefined') {
    const oneYear = 365 * 24 * 60 * 60;
    const isHttps = typeof location !== 'undefined' && location.protocol === 'https:';
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(token)}; path=/; max-age=${oneYear}; SameSite=Lax${isHttps ? '; Secure' : ''}`;
  }
  for (const fn of listeners) fn(user);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('shopbb:auth-change', { detail: { user } }));
  }
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (typeof document !== 'undefined') {
    // 清买家身份
    document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
    // 同时清 cart cookie：登录买家的 cart 与匿名 cart 不能共享，
    // 否则登出后会保留前一位买家的购物车数量。
    document.cookie = 'cart=; path=/; max-age=0; SameSite=Lax';
  }
  for (const fn of listeners) fn(null);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('shopbb:auth-change', { detail: { user: null } }));
  }
}

export function getBuyerToken(): string | null { return readToken(); }

const listeners = new Set<(u: BuyerUser | null) => void>();

export function useBuyer() {
  const [user, setUser] = useState<BuyerUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(readUser());
    setReady(true);
    listeners.add(setUser);
    return () => { listeners.delete(setUser); };
  }, []);

  const login = useCallback(async (email: string, password: string, apiBase: string, storeSubdomain: string) => {
    const res = await fetch(`${apiBase}/api/buyer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, store_subdomain: storeSubdomain }),
    });
    const data: any = await res.json();
    if (!data.success) throw new Error(data.error || '登录失败');
    writeAuth(data.token, data.user);
    return data.user as BuyerUser;
  }, []);

  const register = useCallback(async (email: string, password: string, apiBase: string, storeSubdomain: string) => {
    const res = await fetch(`${apiBase}/api/buyer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, store_subdomain: storeSubdomain }),
    });
    const data: any = await res.json();
    if (!data.success) throw new Error(data.error || '注册失败');
    writeAuth(data.token, data.user);
    return data.user as BuyerUser;
  }, []);

  const logout = useCallback(() => { clearAuth(); }, []);

  return { user, ready, login, register, logout };
}

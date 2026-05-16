/**
 * Header — 顶栏：品牌 / 导航 / 搜索 / 账号 / 购物车
 *
 * cart bubble 数字从 root loader 拿（useRouteLoaderData('root')），或父组件 props 传入。
 * 用户状态用 useBuyer hook（client only — 受 hydration 安全约束，第一次 render 总是 null）。
 */

import * as React from 'react';
import { Link, useNavigate, useLocation, useRouteLoaderData } from 'react-router';
import { useBuyer } from '~/lib/auth-state';

export interface HeaderProps {
  shopName: string;
  /** Optional cart prop — 不传时自动 useRouteLoaderData('root') */
  cart?: any;
}

export function Header({ shopName, cart: cartProp }: HeaderProps) {
  // 优先用 prop（路由级 useLoaderData 可能有更新的 cart）；否则从 root loader 拿
  const rootData = useRouteLoaderData('root') as any;
  const cart = cartProp ?? rootData?.cart;
  const { user, logout } = useBuyer();
  const navigate = useNavigate();
  const location = useLocation();
  const cartQty = cart?.totalQuantity ?? 0;

  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [q, setQ] = React.useState('');

  React.useEffect(() => {
    if (location.pathname === '/search') {
      const params = new URLSearchParams(location.search);
      setQ(params.get('q') || '');
    }
  }, [location.pathname, location.search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <header className="sf-nav">
      <div className="sf-nav-inner">
        <Link to="/" className="sf-brand">
          <span className="sf-brand-mark" aria-hidden="true">⚡</span>
          <span>{shopName}</span>
        </Link>

        <nav className="sf-nav-links" aria-label="主导航">
          <Link to="/">首页</Link>
          <Link to="/products">商品</Link>
        </nav>

        <form className="sf-search" role="search" onSubmit={handleSearch}>
          <svg className="sf-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索商品"
            aria-label="搜索商品"
          />
          {q && (
            <button type="button" className="sf-search-clear" onClick={() => setQ('')} aria-label="清除">×</button>
          )}
        </form>

        <div className="sf-nav-actions">
          {user ? (
            <div className="sf-user">
              <button
                className="sf-user-trigger"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-label="账号菜单"
                aria-expanded={userMenuOpen}
              >
                <span className="sf-user-avatar">{(user.email || 'U').slice(0, 1).toUpperCase()}</span>
                <span className="sf-user-email">{user.email}</span>
              </button>
              {userMenuOpen && (
                <>
                  <div className="sf-user-mask" onClick={() => setUserMenuOpen(false)} />
                  <div className="sf-user-menu" role="menu">
                    <div className="sf-user-menu-head">
                      <div style={{ fontWeight: 600 }}>{user.email}</div>
                      <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 2 }}>{user.store_name}</div>
                    </div>
                    <Link to="/account" className="sf-user-menu-item" onClick={() => setUserMenuOpen(false)}>我的账号</Link>
                    <button
                      type="button"
                      className="sf-user-menu-item sf-user-menu-logout"
                      onClick={() => {
                        // 客户端先清 token/localStorage，避免在跳转间隙仍显示已登录
                        logout();
                        setUserMenuOpen(false);
                        // 服务端清 HttpOnly cookie（cart + __buyer）后跳首页
                        window.location.href = '/logout';
                      }}
                    >
                      退出登录
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link to="/login" className="sf-login-link">登录</Link>
          )}

          <Link to="/cart" className="sf-cart-link" aria-label={`购物车 ${cartQty} 件`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
            <span className="sf-cart-label">购物车</span>
            {cartQty > 0 && <span className="sf-cart-bubble">{cartQty}</span>}
          </Link>
        </div>
      </div>
      <HeaderStyles />
    </header>
  );
}

function HeaderStyles() {
  return (
    <style dangerouslySetInnerHTML={{
      __html: `
.sf-nav { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.92); backdrop-filter: saturate(180%) blur(20px); border-bottom: 1px solid var(--c-line); }
.sf-nav-inner { width: 100%; max-width: 1200px; margin: 0 auto; padding: 14px 24px; display: flex; align-items: center; gap: 24px; }
.sf-brand { display: inline-flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 700; color: var(--c-ink); flex-shrink: 0; }
.sf-brand-mark { font-size: 22px; }
.sf-nav-links { display: inline-flex; gap: 20px; font-size: 14.5px; font-weight: 500; color: var(--c-muted); }
.sf-nav-links a:hover { color: var(--c-ink); }
.sf-search { position: relative; flex: 1; max-width: 360px; }
.sf-search input { width: 100%; padding: 9px 36px 9px 36px; background: var(--c-bg-soft); border: 1px solid transparent; border-radius: var(--r-pill); font-size: 14px; font-family: inherit; outline: none; transition: background 150ms ease, border-color 150ms ease; }
.sf-search input:focus { background: #fff; border-color: var(--c-line-2); }
.sf-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--c-muted-2); pointer-events: none; }
.sf-search-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 22px; height: 22px; background: var(--c-line); border: none; border-radius: 50%; color: var(--c-muted); font-size: 16px; line-height: 1; cursor: pointer; }
.sf-nav-actions { display: inline-flex; align-items: center; gap: 12px; margin-left: auto; flex-shrink: 0; }
.sf-login-link { font-size: 14px; font-weight: 500; color: var(--c-muted); padding: 8px 14px; border-radius: var(--r-pill); transition: background 150ms ease, color 150ms ease; }
.sf-login-link:hover { background: var(--c-bg-soft); color: var(--c-ink); }
.sf-user { position: relative; }
.sf-user-trigger { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; background: var(--c-bg-soft); border: none; border-radius: var(--r-pill); cursor: pointer; }
.sf-user-trigger:hover { background: var(--c-bg-soft-2); }
.sf-user-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--c-accent); color: #fff; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; }
.sf-user-email { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; font-size: 13.5px; }
.sf-user-mask { position: fixed; inset: 0; z-index: 49; }
.sf-user-menu { position: absolute; right: 0; top: calc(100% + 8px); min-width: 220px; background: #fff; border: 1px solid var(--c-line); border-radius: var(--r-lg); box-shadow: 0 10px 32px rgba(0,0,0,0.08); padding: 6px; z-index: 50; }
.sf-user-menu-head { padding: 10px 12px 12px; border-bottom: 1px solid var(--c-line); margin-bottom: 4px; font-size: 13.5px; }
.sf-user-menu-item { display: block; width: 100%; padding: 9px 12px; background: none; border: none; text-align: left; font-size: 13.5px; color: var(--c-ink); cursor: pointer; border-radius: var(--r-md); font-family: inherit; }
.sf-user-menu-item:hover { background: var(--c-bg-soft); }
.sf-user-menu-logout { color: #ef4444; }
.sf-user-menu-logout:hover { background: #fef2f2; }
.sf-cart-link { position: relative; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--r-pill); background: var(--c-ink); color: #fff; font-size: 13.5px; font-weight: 600; }
.sf-cart-link:hover { background: var(--c-accent); color: #fff; }
.sf-cart-label { display: inline; }
.sf-cart-bubble { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; background: var(--c-accent); color: #fff; border-radius: var(--r-pill); font-size: 11px; font-weight: 700; }
@media (max-width: 720px) { .sf-nav-links, .sf-user-email, .sf-cart-label { display: none; } }
.sf-footer { padding: 48px 0; background: var(--c-bg-soft); border-top: 1px solid var(--c-line); margin-top: 80px; }
.sf-footer-inner { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 24px; display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; }
.sf-footer p { color: var(--c-muted); font-size: 13px; margin-top: 4px; }
.sf-footer-meta { font-size: 12px; color: var(--c-muted-2); }
`
    }} />
  );
}

export function Footer({ shopName }: { shopName: string }) {
  return (
    <footer className="sf-footer">
      <div className="sf-footer-inner">
        <div>
          <strong>{shopName}</strong>
          <p>Cloudflare 周边官方商城 · 跑在 <a href="https://oxygen-demo.cloudc.top" style={{ color: 'var(--c-accent)' }}>shopbb</a> 平台上</p>
        </div>
        <div className="sf-footer-meta">
          <code>Powered by @shopbb/helium · React Router 7</code>
        </div>
      </div>
    </footer>
  );
}

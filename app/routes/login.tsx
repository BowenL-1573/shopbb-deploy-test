/**
 * routes/account_.login.tsx — /login
 *
 * 下划线前缀让这个 route 不继承 account/ 父布局。
 * 登录走 client-side useBuyer.login（POST /api/buyer/login）。
 */

import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Header, Footer } from '~/components/Header';
import { useBuyer } from '~/lib/auth-state';
import { useRootLoader } from '~/root';
import type { Route } from './+types/login';

export const meta: Route.MetaFunction = () => [{ title: '登录 · Shopflare' }];

export default function LoginRoute() {
  const root = useRootLoader();
  const shopName = root?.store?.shopName || 'Shopflare';
  const apiBase = root?.store?.apiBase || '';
  const storeSubdomain = root?.store?.subdomain || '';

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextPath = params.get('next') || '/account';

  const { login } = useBuyer();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [err, setErr] = React.useState('');
  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setPending(true);
    try {
      await login(email, password, apiBase, storeSubdomain);
      navigate(nextPath, { replace: true });
    } catch (e: any) {
      setErr(e?.message || '登录失败');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Header shopName={shopName} />
      <main className="sf-container ac-auth">
        <div className="ac-auth-card">
          <h1>登录</h1>
          <p style={{ color: 'var(--c-muted)', marginBottom: 24 }}>用买家账号登录 {shopName}</p>

          <form onSubmit={handleSubmit}>
            <label>
              <span>邮箱</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="email" />
            </label>
            <label>
              <span>密码</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </label>
            {err && <div className="ac-err">{err}</div>}
            <button type="submit" className="ac-cta" disabled={pending}>{pending ? '登录中…' : '登录'}</button>
          </form>

          <p style={{ marginTop: 18, textAlign: 'center', color: 'var(--c-muted)', fontSize: 13.5 }}>
            还没账号？<Link to="/register" style={{ color: 'var(--c-accent)', fontWeight: 600 }}>注册</Link>
          </p>
        </div>
      </main>
      <Footer shopName={shopName} />
      <AuthStyles />
    </>
  );
}

function AuthStyles() {
  return <style dangerouslySetInnerHTML={{ __html: `
.ac-auth { padding: 80px 24px; max-width: 480px; }
.ac-auth-card { background: #fff; border: 1px solid var(--c-line); border-radius: var(--r-xl); padding: 36px; }
.ac-auth-card h1 { margin-bottom: 8px; }
.ac-auth-card form { display: flex; flex-direction: column; gap: 14px; }
.ac-auth-card label { display: flex; flex-direction: column; gap: 6px; font-size: 13.5px; color: var(--c-muted); }
.ac-auth-card input { padding: 11px 14px; border: 1px solid var(--c-line-2); border-radius: 8px; font-family: inherit; font-size: 14.5px; outline: none; transition: border-color 150ms ease, box-shadow 150ms ease; }
.ac-auth-card input:focus { border-color: var(--c-accent); box-shadow: 0 0 0 3px rgba(234,88,12,0.1); }
.ac-err { color: #b91c1c; font-size: 13.5px; padding: 10px 14px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca; }
.ac-cta { margin-top: 8px; padding: 12px 24px; background: var(--c-ink); color: #fff; border: none; border-radius: var(--r-pill); font-size: 14.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
.ac-cta:hover:not(:disabled) { background: var(--c-accent); }
.ac-cta:disabled { background: var(--c-line-2); cursor: not-allowed; }
`}} />;
}

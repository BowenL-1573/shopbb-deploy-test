/**
 * routes/account_.register.tsx — /register
 */

import * as React from 'react';
import { Link, useNavigate } from 'react-router';
import { Header, Footer } from '~/components/Header';
import { useBuyer } from '~/lib/auth-state';
import { useRootLoader } from '~/root';
import type { Route } from './+types/register';

export const meta: Route.MetaFunction = () => [{ title: '注册 · Shopflare' }];

export default function RegisterRoute() {
  const root = useRootLoader();
  const shopName = root?.store?.shopName || 'Shopflare';
  const apiBase = root?.store?.apiBase || '';
  const storeSubdomain = root?.store?.subdomain || '';

  const navigate = useNavigate();
  const { register } = useBuyer();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [err, setErr] = React.useState('');
  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setPending(true);
    try {
      await register(email, password, apiBase, storeSubdomain);
      navigate('/account', { replace: true });
    } catch (e: any) {
      setErr(e?.message || '注册失败');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Header shopName={shopName} />
      <main className="sf-container ac-auth">
        <div className="ac-auth-card">
          <h1>注册</h1>
          <p style={{ color: 'var(--c-muted)', marginBottom: 24 }}>创建 {shopName} 买家账号</p>

          <form onSubmit={handleSubmit}>
            <label>
              <span>邮箱</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="email" />
            </label>
            <label>
              <span>密码（至少 6 位）</span>
              <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            </label>
            {err && <div className="ac-err">{err}</div>}
            <button type="submit" className="ac-cta" disabled={pending}>{pending ? '注册中…' : '创建账号'}</button>
          </form>

          <p style={{ marginTop: 18, textAlign: 'center', color: 'var(--c-muted)', fontSize: 13.5 }}>
            已有账号？<Link to="/login" style={{ color: 'var(--c-accent)', fontWeight: 600 }}>登录</Link>
          </p>
        </div>
      </main>
      <Footer shopName={shopName} />
    </>
  );
}

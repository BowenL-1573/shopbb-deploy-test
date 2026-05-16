/**
 * routes/$.tsx — 404 catch-all
 */

import { Link } from 'react-router';
import { Header, Footer } from '~/components/Header';
import { useRootLoader } from '~/root';
import type { Route } from './+types/$';

export const meta: Route.MetaFunction = () => [{ title: '页面不见了 · Shopflare' }];

export async function loader() {
  throw new Response('Not Found', { status: 404 });
}

export default function CatchAllRoute() {
  const root = useRootLoader();
  const shopName = root?.store?.shopName || 'Shopflare';

  return (
    <>
      <Header shopName={shopName} />
      <main className="sf-container" style={{ padding: '80px 0 120px', maxWidth: 560, textAlign: 'center' }}>
        <div style={{
          fontSize: 'clamp(96px, 18vw, 180px)',
          fontWeight: 800, lineHeight: 1,
          background: 'linear-gradient(135deg, var(--c-accent), #f59e0b)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text',
          color: 'transparent',
          letterSpacing: '-0.04em',
          marginBottom: 24,
        }}>404</div>
        <h1 style={{ marginBottom: 12 }}>页面不见了</h1>
        <p style={{ color: 'var(--c-muted)', marginBottom: 32 }}>这个页面可能已下架。</p>
        <div style={{ display: 'inline-flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/" style={{ padding: '12px 28px', background: 'var(--c-ink)', color: '#fff', borderRadius: 999, fontWeight: 600 }}>回首页</Link>
          <Link to="/products" style={{ padding: '12px 28px', background: '#fff', border: '1px solid var(--c-line-2)', borderRadius: 999, fontWeight: 500 }}>浏览商品</Link>
        </div>
      </main>
      <Footer shopName={shopName} />
    </>
  );
}

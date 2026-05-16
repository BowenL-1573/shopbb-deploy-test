/**
 * Route 配置 — 用 @react-router/fs-routes 自动扫 app/routes/ 目录
 * （等价于 Hydrogen / Remix 的 file-based routing 约定）
 *
 * 文件命名约定：
 *   - _index.tsx           = /
 *   - products._index.tsx  = /products
 *   - products.$handle.tsx = /products/:handle
 *   - cart.tsx             = /cart
 *   - account.tsx          = /account (layout)
 *   - account.orders.$id.tsx = /account/orders/:id
 *   - account_.login.tsx   = /login (前缀 underscore 意为不继承 account layout)
 *   - $.tsx                = catch-all 404
 *   - [sitemap.xml].tsx    = /sitemap.xml (字面量)
 */

import { type RouteConfig } from '@react-router/dev/routes';
import { flatRoutes } from '@react-router/fs-routes';

export default flatRoutes() satisfies RouteConfig;

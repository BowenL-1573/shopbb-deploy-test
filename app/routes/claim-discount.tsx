/**
 * /claim-discount — 商家用 customer GraphQL 领取一张券
 *
 * POST 带 form field `code`。成功返回 {claim} 并由前端跳回首页 revalidate。
 */

import { data, redirect } from 'react-router';
import type { Route } from './+types/claim-discount';

const CLAIM_MUTATION = /* GraphQL */ `
  mutation Claim($code: String!) {
    discountClaim(code: $code) {
      discountClaim {
        id usedCount remainingUses
        discount { id code title valueType }
      }
      userErrors { field message code }
    }
  }
`;

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const code = String(formData.get('code') || '').trim();
  if (!code) return data({ error: '缺少 code' }, { status: 400 });

  const signedIn = await context.helium.customer.isLoggedIn().catch(() => false);
  if (!signedIn) {
    return data({ error: '未登录', redirect: '/login' }, { status: 401 });
  }

  const result: any = await context.helium.customer
    .query(CLAIM_MUTATION, { code })
    .catch((e: any) => ({ error: e?.message || '领取失败' }));

  if ((result as any).error) return data({ error: (result as any).error }, { status: 500 });
  const payload = result?.discountClaim;
  if (payload?.userErrors?.length) {
    return data({ error: payload.userErrors[0].message, code: payload.userErrors[0].code, claim: payload.discountClaim }, { status: 200 });
  }
  return data({ claim: payload?.discountClaim, error: null });
}

export async function loader() {
  throw redirect('/');
}

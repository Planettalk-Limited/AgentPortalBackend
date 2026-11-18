import { createHmac, timingSafeEqual } from 'crypto';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Unsubscribe links carry the agent id plus an HMAC of it, so a link works without
 * logging in but cannot be forged to unsubscribe someone else.
 */
export function signUnsubscribeToken(agentId: string, secret: string): string {
  if (!secret) throw new Error('Lifecycle unsubscribe secret is not configured');
  return createHmac('sha256', secret)
    .update(`lifecycle-unsubscribe:${agentId}`)
    .digest('base64url')
    .slice(0, 32);
}

export function verifyUnsubscribeToken(agentId: string, token: string, secret: string): boolean {
  if (!agentId || !token || !secret) return false;
  return safeEqual(signUnsubscribeToken(agentId, secret), token);
}

/**
 * Mailgun webhook signature: hex HMAC-SHA256 of timestamp + token, keyed with the
 * domain's "HTTP webhook signing key" (not the API key).
 * https://documentation.mailgun.com/docs/mailgun/user-manual/tracking-messages/#securing-webhooks
 *
 * No freshness window is enforced: a replayed event carries the same event id and
 * is ignored by the unique index, so replay cannot inflate the stats.
 */
export function verifyMailgunSignature(
  signature: { timestamp?: string; token?: string; signature?: string } | undefined,
  signingKey: string,
): boolean {
  if (!signingKey || !signature?.timestamp || !signature?.token || !signature?.signature) {
    return false;
  }
  const expected = createHmac('sha256', signingKey)
    .update(`${signature.timestamp}${signature.token}`)
    .digest('hex');
  return safeEqual(expected, String(signature.signature));
}

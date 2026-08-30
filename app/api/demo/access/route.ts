import { configuredAccessCode, configuredIdentityEmail, configuredSeedPassword, isHostedEnvironment, sessionCookie, supabaseAuthEnabled, trustedRequestOrigin } from '@/lib/demo-auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { jsonBody } from '@/lib/api';

export async function POST(request: Request) {
  const originError = trustedRequestOrigin(request); if (originError) return originError;
  try {
    if (isHostedEnvironment() && (!process.env.KORAMA_DEMO_ACCESS_CODE || !process.env.KORAMA_DEMO_SESSION_SECRET)) return Response.json({ error: 'Demo access is not configured' }, { status: 503, headers: { 'cache-control': 'no-store' } });
    const body = await jsonBody(request);
    const submittedCode = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (
      submittedCode.length > 128 || submittedCode !== configuredAccessCode().trim().toUpperCase()
    )
      return Response.json(
        { error: 'That code did not match' },
        { status: 401, headers: { 'cache-control': 'no-store' } },
      );
    const headers = new Headers({ 'set-cookie': sessionCookie() });
    headers.set('cache-control', 'no-store');
    if (supabaseAuthEnabled()) {
      const password = configuredSeedPassword();
      const client = await createSupabaseServerClient();
      if (!client || !password) return Response.json({ error: 'Supabase Auth is not configured for guided access' }, { status: 503, headers: { 'cache-control': 'no-store' } });
      const { error } = await client.auth.signInWithPassword({ email: configuredIdentityEmail('consumer'), password });
      if (error) return Response.json({ error: 'Guided identity sign-in failed' }, { status: 503, headers: { 'cache-control': 'no-store' } });
    }
    return Response.json(
      { authenticated: true },
      { headers },
    );
  } catch {
    return Response.json(
      { error: 'Request body must be valid JSON' },
      { status: 400, headers: { 'cache-control': 'no-store' } },
    );
  }
}

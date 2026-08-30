import { configuredAccessCode, configuredIdentityEmail, configuredSeedPassword, sessionCookie, supabaseAuthEnabled } from '@/lib/demo-auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: unknown };
    if (
      String(body.code ?? '')
        .trim()
        .toUpperCase() !== configuredAccessCode().toUpperCase()
    )
      return Response.json(
        { error: 'That code did not match' },
        { status: 401 },
      );
    const headers = new Headers({ 'set-cookie': sessionCookie() });
    if (supabaseAuthEnabled()) {
      const password = configuredSeedPassword();
      const client = await createSupabaseServerClient();
      if (!client || !password) return Response.json({ error: 'Supabase Auth is not configured for guided access' }, { status: 503 });
      const { error } = await client.auth.signInWithPassword({ email: configuredIdentityEmail('consumer'), password });
      if (error) return Response.json({ error: 'Guided identity sign-in failed' }, { status: 503 });
    }
    return Response.json(
      { authenticated: true },
      { headers },
    );
  } catch {
    return Response.json(
      { error: 'Request body must be valid JSON' },
      { status: 400 },
    );
  }
}

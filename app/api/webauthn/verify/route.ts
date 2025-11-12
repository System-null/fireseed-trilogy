import { NextResponse } from 'next/server';
import {
  verifyAuthenticationResponse,
  VerifyAuthenticationResponseOpts
} from '@simplewebauthn/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // TODO: 从你自己的会话/存储取 expectedChallenge/credentialPublicKey 等
    const opts: VerifyAuthenticationResponseOpts = {
      response: body,
      expectedChallenge: body.expectedChallenge,
      expectedOrigin: process.env.WEBAUTHN_EXPECTED_ORIGIN || `https://${new URL(req.url).host}`,
      expectedRPID: process.env.WEBAUTHN_RP_ID || new URL(req.url).hostname,
      requireUserVerification: true
    };
    const result = await verifyAuthenticationResponse(opts);
    return NextResponse.json({ ok: result.verified });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 400 });
  }
}

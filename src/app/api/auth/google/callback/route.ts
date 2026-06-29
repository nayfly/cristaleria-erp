import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/configuracion?drive=error`)
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      `${appUrl}/api/auth/google/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${appUrl}/configuracion?drive=no_refresh_token`)
    }

    const admin = createAdminClient()
    await admin
      .from('configuracion_empresa')
      .update({
        google_drive_refresh_token: tokens.refresh_token,
        google_drive_folder_id: null, // reset folder so it gets recreated
      })
      .not('id', 'is', null)

    return NextResponse.redirect(`${appUrl}/configuracion?drive=ok`)
  } catch (e) {
    console.error('Google OAuth callback error:', e)
    return NextResponse.redirect(`${appUrl}/configuracion?drive=error`)
  }
}

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  await admin
    .from('configuracion_empresa')
    .update({ google_drive_refresh_token: null, google_drive_folder_id: null })
    .not('id', 'is', null)

  return NextResponse.json({ ok: true })
}

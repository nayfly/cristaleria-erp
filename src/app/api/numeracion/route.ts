import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Verificar que el usuario está autenticado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { tipo } = await req.json()
  if (tipo !== 'factura' && tipo !== 'presupuesto') {
    return NextResponse.json({ error: 'tipo debe ser factura o presupuesto' }, { status: 400 })
  }

  // Usar admin client (service_role) para ejecutar la función sin restricciones de RLS
  const admin = createAdminClient()
  const fn = tipo === 'factura' ? 'generar_numero_factura' : 'generar_numero_presupuesto'
  const { data, error } = await admin.rpc(fn)

  if (error || !data) {
    console.error(`Error generando número de ${tipo}:`, error)
    return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 })
  }

  return NextResponse.json({ numero: data })
}

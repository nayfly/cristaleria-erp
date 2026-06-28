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

  const admin = createAdminClient()

  // Leer configuración actual
  const { data: config, error: readError } = await admin
    .from('configuracion_empresa')
    .select('id, serie_facturas, siguiente_num_factura, serie_presupuestos, siguiente_num_presupuesto')
    .single()

  if (readError || !config) {
    console.error('Error leyendo configuracion_empresa:', readError)
    return NextResponse.json({ error: 'No se pudo leer la configuración' }, { status: 500 })
  }

  if (tipo === 'factura') {
    const num = config.siguiente_num_factura ?? 1
    const serie = config.serie_facturas ?? 'F'
    const numero = `${serie}${String(num).padStart(5, '0')}`

    const { error: updateError } = await admin
      .from('configuracion_empresa')
      .update({ siguiente_num_factura: num + 1 })
      .eq('id', config.id)

    if (updateError) {
      console.error('Error actualizando num factura:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ numero })
  } else {
    const num = config.siguiente_num_presupuesto ?? 1
    const serie = config.serie_presupuestos ?? 'P'
    const numero = `${serie}${String(num).padStart(5, '0')}`

    const { error: updateError } = await admin
      .from('configuracion_empresa')
      .update({ siguiente_num_presupuesto: num + 1 })
      .eq('id', config.id)

    if (updateError) {
      console.error('Error actualizando num presupuesto:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ numero })
  }
}

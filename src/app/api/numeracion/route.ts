import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  // Endpoint de diagnóstico — devuelve el estado de la configuración
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('configuracion_empresa')
    .select('id, serie_facturas, siguiente_num_factura, serie_presupuestos, siguiente_num_presupuesto')

  return NextResponse.json({ data, error: error?.message ?? null })
}

export async function POST(req: NextRequest) {
  // Verificar que el usuario está autenticado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { tipo } = body
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
    const msg = readError?.message ?? 'Sin datos en configuracion_empresa'
    console.error('Error leyendo configuracion_empresa:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  if (tipo === 'factura') {
    const num = config.siguiente_num_factura ?? 1
    const serie = (config.serie_facturas ?? 'F').trim()
    const numero = `${serie}/${num}`

    const { error: updateError } = await admin
      .from('configuracion_empresa')
      .update({ siguiente_num_factura: num + 1 })
      .eq('id', config.id)

    if (updateError) {
      console.error('Error actualizando num factura:', updateError.message)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ numero })
  } else {
    const num = config.siguiente_num_presupuesto ?? 1
    const serie = (config.serie_presupuestos ?? 'P').trim()
    const numero = `${serie}/${num}`

    const { error: updateError } = await admin
      .from('configuracion_empresa')
      .update({ siguiente_num_presupuesto: num + 1 })
      .eq('id', config.id)

    if (updateError) {
      console.error('Error actualizando num presupuesto:', updateError.message)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ numero })
  }
}

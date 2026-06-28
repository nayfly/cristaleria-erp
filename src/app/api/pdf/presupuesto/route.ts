import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { PresupuestoPDF } from '@/components/pdf/presupuesto-pdf'
import React from 'react'

async function generarYSubirPDF(presupuestoId: string): Promise<{ buffer: Buffer; pdfUrl: string | null }> {
  const admin = createAdminClient()

  const [
    { data: presupuesto, error: errPresupuesto },
    { data: empresa, error: errEmpresa },
  ] = await Promise.all([
    admin
      .from('presupuestos')
      .select('*, cliente:clientes(*), items:presupuesto_items(*)')
      .eq('id', presupuestoId)
      .order('orden', { referencedTable: 'presupuesto_items', ascending: true })
      .single(),
    admin.from('configuracion_empresa').select('*').single(),
  ])

  if (errPresupuesto || !presupuesto) throw new Error('Presupuesto no encontrado')
  if (errEmpresa || !empresa) throw new Error('Configuración no encontrada')

  const buffer = await renderToBuffer(
    React.createElement(PresupuestoPDF, { presupuesto: presupuesto as any, empresa: empresa as any })
  )

  const rutaArchivo = `presupuestos/${presupuesto.numero}.pdf`
  let pdfUrl: string | null = null

  const { error: errUpload } = await admin.storage
    .from('pdfs')
    .upload(rutaArchivo, buffer, { contentType: 'application/pdf', upsert: true })

  if (!errUpload) {
    const { data: urlData } = await admin.storage
      .from('pdfs')
      .createSignedUrl(rutaArchivo, 365 * 24 * 60 * 60)

    if (urlData?.signedUrl) {
      pdfUrl = urlData.signedUrl
      await admin.from('presupuestos').update({ pdf_url: pdfUrl }).eq('id', presupuestoId)
    }
  }

  return { buffer: Buffer.from(buffer), pdfUrl }
}

// GET /api/pdf/presupuesto?id=xxx — devuelve solo la URL pública del PDF (para compartir)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const presupuestoId = req.nextUrl.searchParams.get('id')
    if (!presupuestoId) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    const { pdfUrl } = await generarYSubirPDF(presupuestoId)
    return NextResponse.json({ url: pdfUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}

// POST /api/pdf/presupuesto — devuelve el PDF como descarga
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { presupuestoId } = await req.json()
    if (!presupuestoId) return NextResponse.json({ error: 'presupuestoId requerido' }, { status: 400 })

    const admin = createAdminClient()
    const { data: presupuesto } = await admin.from('presupuestos').select('numero').eq('id', presupuestoId).single()
    const { buffer } = await generarYSubirPDF(presupuestoId)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${presupuesto?.numero ?? presupuestoId}.pdf"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error('Error generando PDF presupuesto:', error)
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}

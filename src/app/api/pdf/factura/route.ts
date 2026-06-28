import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { FacturaPDF } from '@/components/pdf/factura-pdf'
import React from 'react'

async function generarYSubirPDF(facturaId: string): Promise<{ buffer: Buffer; pdfUrl: string | null }> {
  const admin = createAdminClient()

  const [
    { data: factura, error: errFactura },
    { data: empresa, error: errEmpresa },
  ] = await Promise.all([
    admin
      .from('facturas')
      .select('*, cliente:clientes(*), items:factura_items(*)')
      .eq('id', facturaId)
      .order('orden', { referencedTable: 'factura_items', ascending: true })
      .single(),
    admin.from('configuracion_empresa').select('*').single(),
  ])

  if (errFactura || !factura) throw new Error('Factura no encontrada')
  if (errEmpresa || !empresa) throw new Error('Configuración no encontrada')

  const buffer = await renderToBuffer(
    React.createElement(FacturaPDF, { factura: factura as any, empresa: empresa as any })
  )

  const rutaArchivo = `facturas/${factura.numero}.pdf`
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
      await admin.from('facturas').update({ pdf_url: pdfUrl }).eq('id', facturaId)
    }
  }

  return { buffer: Buffer.from(buffer), pdfUrl }
}

// GET /api/pdf/factura?id=xxx — devuelve solo la URL pública del PDF (para compartir)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const facturaId = req.nextUrl.searchParams.get('id')
    if (!facturaId) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    const { pdfUrl } = await generarYSubirPDF(facturaId)
    return NextResponse.json({ url: pdfUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}

// POST /api/pdf/factura — devuelve el PDF como descarga
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { facturaId } = await req.json()
    if (!facturaId) return NextResponse.json({ error: 'facturaId requerido' }, { status: 400 })

    const admin = createAdminClient()
    const { data: factura } = await admin.from('facturas').select('numero').eq('id', facturaId).single()
    const { buffer } = await generarYSubirPDF(facturaId)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${factura?.numero ?? facturaId}.pdf"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error('Error generando PDF factura:', error)
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}

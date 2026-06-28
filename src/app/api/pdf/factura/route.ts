import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { FacturaPDF } from '@/components/pdf/factura-pdf'
import React from 'react'

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { facturaId } = await req.json()
    if (!facturaId) {
      return NextResponse.json({ error: 'facturaId requerido' }, { status: 400 })
    }

    // Usar admin client para leer sin RLS issues
    const admin = createAdminClient()

    // Obtener todos los datos necesarios
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
      admin
        .from('configuracion_empresa')
        .select('*')
        .single(),
    ])

    if (errFactura || !factura) {
      return NextResponse.json({ error: 'Factura no encontrada', detail: errFactura?.message }, { status: 404 })
    }
    if (errEmpresa || !empresa) {
      return NextResponse.json({ error: 'Configuración no encontrada', detail: errEmpresa?.message }, { status: 404 })
    }

    // Generar buffer del PDF
    const buffer = await renderToBuffer(
      React.createElement(FacturaPDF, {
        factura: factura as any,
        empresa: empresa as any,
      })
    )

    // Subir a Supabase Storage
    const rutaArchivo = `facturas/${factura.numero}.pdf`
    const { error: errUpload } = await admin.storage
      .from('pdfs')
      .upload(rutaArchivo, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (!errUpload) {
      // Guardar URL en la factura (signed URL válida 1 año)
      const { data: urlData } = await admin.storage
        .from('pdfs')
        .createSignedUrl(rutaArchivo, 365 * 24 * 60 * 60)

      if (urlData?.signedUrl) {
        await admin
          .from('facturas')
          .update({ pdf_url: urlData.signedUrl })
          .eq('id', facturaId)
      }
    }

    // Devolver el PDF directamente para descarga
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${factura.numero}.pdf"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error generando PDF factura:', error)
    return NextResponse.json(
      { error: 'Error interno al generar el PDF' },
      { status: 500 }
    )
  }
}

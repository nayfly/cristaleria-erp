import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { PresupuestoPDF } from '@/components/pdf/presupuesto-pdf'
import React from 'react'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { presupuestoId } = await req.json()
    if (!presupuestoId) {
      return NextResponse.json({ error: 'presupuestoId requerido' }, { status: 400 })
    }

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
      admin
        .from('configuracion_empresa')
        .select('*')
        .single(),
    ])

    if (errPresupuesto || !presupuesto) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
    }
    if (errEmpresa || !empresa) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 })
    }

    const buffer = await renderToBuffer(
      React.createElement(PresupuestoPDF, {
        presupuesto: presupuesto as any,
        empresa: empresa as any,
      })
    )

    // Subir a Storage
    const rutaArchivo = `presupuestos/${presupuesto.numero}.pdf`
    const { error: errUpload } = await admin.storage
      .from('pdfs')
      .upload(rutaArchivo, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (!errUpload) {
      const { data: urlData } = await admin.storage
        .from('pdfs')
        .createSignedUrl(rutaArchivo, 365 * 24 * 60 * 60)

      if (urlData?.signedUrl) {
        await admin
          .from('presupuestos')
          .update({ pdf_url: urlData.signedUrl })
          .eq('id', presupuestoId)
      }
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${presupuesto.numero}.pdf"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error generando PDF presupuesto:', error)
    return NextResponse.json(
      { error: 'Error interno al generar el PDF' },
      { status: 500 }
    )
  }
}

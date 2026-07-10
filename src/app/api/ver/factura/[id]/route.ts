import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase/server'
import { FacturaPDF } from '@/components/pdf/factura-pdf'
import React from 'react'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = createAdminClient()

    const [{ data: factura }, { data: empresa }] = await Promise.all([
      admin
        .from('facturas')
        .select('*, cliente:clientes(*), items:factura_items(*)')
        .eq('id', params.id)
        .order('orden', { referencedTable: 'factura_items', ascending: true })
        .single(),
      admin.from('configuracion_empresa').select('*').single(),
    ])

    if (!factura || !empresa) {
      return new NextResponse('No encontrado', { status: 404 })
    }

    const buffer = await renderToBuffer(
      React.createElement(FacturaPDF, { factura: factura as any, empresa: empresa as any })
    )

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Factura-${factura.numero}.pdf"`,
      },
    })
  } catch {
    return new NextResponse('Error generando PDF', { status: 500 })
  }
}

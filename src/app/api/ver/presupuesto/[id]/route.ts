import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase/server'
import { PresupuestoPDF } from '@/components/pdf/presupuesto-pdf'
import React from 'react'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = createAdminClient()

    const [{ data: presupuesto }, { data: empresa }] = await Promise.all([
      admin
        .from('presupuestos')
        .select('*, cliente:clientes(*), items:presupuesto_items(*)')
        .eq('id', params.id)
        .order('orden', { referencedTable: 'presupuesto_items', ascending: true })
        .single(),
      admin.from('configuracion_empresa').select('*').single(),
    ])

    if (!presupuesto || !empresa) {
      return new NextResponse('No encontrado', { status: 404 })
    }

    const buffer = await renderToBuffer(
      React.createElement(PresupuestoPDF, { presupuesto: presupuesto as any, empresa: empresa as any })
    )

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Presupuesto-${presupuesto.numero}.pdf"`,
      },
    })
  } catch {
    return new NextResponse('Error generando PDF', { status: 500 })
  }
}

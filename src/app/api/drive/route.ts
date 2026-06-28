import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { subirFacturaADrive, subirPresupuestoADrive } from '@/lib/drive/drive-client'
import { renderToBuffer } from '@react-pdf/renderer'
import { FacturaPDF } from '@/components/pdf/factura-pdf'
import { PresupuestoPDF } from '@/components/pdf/presupuesto-pdf'
import React from 'react'

/**
 * POST /api/drive
 * Body: { tipo: 'factura' | 'presupuesto', id: string }
 *
 * Genera el PDF, lo sube a Supabase Storage y a Google Drive,
 * y guarda el drive_file_id en la base de datos.
 */
export async function POST(req: NextRequest) {
  try {
    // Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { tipo, id } = await req.json()
    if (!tipo || !id) {
      return NextResponse.json({ error: 'tipo e id son requeridos' }, { status: 400 })
    }

    // Verificar que Drive está configurado
    if (!process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
      return NextResponse.json(
        { error: 'Google Drive no configurado. Añade GOOGLE_DRIVE_ROOT_FOLDER_ID a .env.local' },
        { status: 503 }
      )
    }

    const admin = createAdminClient()

    const { data: empresa } = await admin
      .from('configuracion_empresa')
      .select('*')
      .single()

    if (!empresa) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 })
    }

    if (tipo === 'factura') {
      const { data: factura, error } = await admin
        .from('facturas')
        .select('*, cliente:clientes(*), items:factura_items(*)')
        .eq('id', id)
        .order('orden', { referencedTable: 'factura_items', ascending: true })
        .single()

      if (error || !factura) {
        return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
      }

      const buffer = await renderToBuffer(
        React.createElement(FacturaPDF, {
          factura: factura as any,
          empresa: empresa as any,
        })
      )

      const año = factura.fecha.substring(0, 4)
      const nombreCliente = (factura.cliente as any)?.empresa ?? (factura.cliente as any)?.nombre ?? 'Sin nombre'

      const { driveFileId } = await subirFacturaADrive({
        buffer,
        numero: factura.numero,
        año,
      })

      await admin
        .from('facturas')
        .update({ drive_file_id: driveFileId })
        .eq('id', id)

      return NextResponse.json({ ok: true, driveFileId })
    }

    if (tipo === 'presupuesto') {
      const { data: presupuesto, error } = await admin
        .from('presupuestos')
        .select('*, cliente:clientes(*), items:presupuesto_items(*)')
        .eq('id', id)
        .order('orden', { referencedTable: 'presupuesto_items', ascending: true })
        .single()

      if (error || !presupuesto) {
        return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
      }

      const buffer = await renderToBuffer(
        React.createElement(PresupuestoPDF, {
          presupuesto: presupuesto as any,
          empresa: empresa as any,
        })
      )

      const año = presupuesto.fecha.substring(0, 4)
      const nombreCliente = (presupuesto.cliente as any)?.empresa ?? (presupuesto.cliente as any)?.nombre ?? 'Sin nombre'

      const { driveFileId } = await subirPresupuestoADrive({
        buffer,
        numero: presupuesto.numero,
        año,
      })

      await admin
        .from('presupuestos')
        .update({ drive_file_id: driveFileId })
        .eq('id', id)

      return NextResponse.json({ ok: true, driveFileId })
    }

    return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
  } catch (error: any) {
    console.error('Error subiendo a Drive:', error)
    return NextResponse.json(
      { error: error.message ?? 'Error interno' },
      { status: 500 }
    )
  }
}

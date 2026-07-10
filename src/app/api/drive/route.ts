import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { subirFacturaADrive, subirPresupuestoADrive } from '@/lib/drive/drive-client'
import { renderToBuffer } from '@react-pdf/renderer'
import { FacturaPDF } from '@/components/pdf/factura-pdf'
import { PresupuestoPDF } from '@/components/pdf/presupuesto-pdf'
import React from 'react'

export async function GET() {
  try {
    const { google } = await import('googleapis')
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    })
    const drive = google.drive({ version: 'v3', auth })
    const { data } = await drive.files.list({ pageSize: 1, fields: 'files(id,name)' })
    return NextResponse.json({
      ok: true,
      client_email: credentials.client_email,
      folder_id: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
      files: data.files,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, detail: e?.response?.data }, { status: 500 })
  }
}

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
    const msg = error?.message ?? String(error)
    const detail = error?.response?.data ?? error?.stack ?? null
    console.error('Error subiendo a Drive:', msg, JSON.stringify(detail))

    // Token expirado o revocado — limpiar de la BD para que la UI muestre "No conectado"
    const isInvalidGrant =
      msg.includes('invalid_grant') ||
      detail?.error === 'invalid_grant'
    if (isInvalidGrant) {
      try {
        const admin = createAdminClient()
        await admin
          .from('configuracion_empresa')
          .update({ google_drive_refresh_token: null, google_drive_folder_id: null })
          .not('id', 'is', null)
      } catch {}
      return NextResponse.json(
        { error: 'TOKEN_EXPIRADO', message: 'La conexión con Google Drive ha expirado. Ve a Configuración > Google Drive y vuelve a conectarlo.' },
        { status: 401 }
      )
    }

    return NextResponse.json({ error: msg, detail }, { status: 500 })
  }
}

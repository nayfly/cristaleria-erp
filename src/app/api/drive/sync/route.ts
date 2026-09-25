import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { FacturaPDF } from '@/components/pdf/factura-pdf'
import React from 'react'
import { google } from 'googleapis'
import { Readable } from 'stream'

async function getDriveClient(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  )
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return google.drive({ version: 'v3', auth: oauth2Client })
}

async function obtenerOCrearCarpeta(drive: any, nombre: string, padreId?: string): Promise<string> {
  const query = padreId
    ? `name='${nombre}' and mimeType='application/vnd.google-apps.folder' and '${padreId}' in parents and trashed=false`
    : `name='${nombre}' and mimeType='application/vnd.google-apps.folder' and trashed=false`

  const { data: lista } = await drive.files.list({ q: query, fields: 'files(id)', spaces: 'drive' })
  if (lista.files?.length > 0) return lista.files[0].id

  const { data: carpeta } = await drive.files.create({
    requestBody: { name: nombre, mimeType: 'application/vnd.google-apps.folder', ...(padreId ? { parents: [padreId] } : {}) },
    fields: 'id',
  })
  return carpeta.id
}

async function listarArchivosEnCarpeta(drive: any, folderId: string): Promise<string[]> {
  const nombres: string[] = []
  let pageToken: string | undefined

  do {
    const res: any = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false and mimeType='application/pdf'`,
      fields: 'nextPageToken, files(name)',
      pageSize: 1000,
      pageToken,
    })
    for (const f of res.data.files ?? []) nombres.push(f.name)
    pageToken = res.data.nextPageToken
  } while (pageToken)

  return nombres
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const admin = createAdminClient()

    const { data: config } = await admin.from('configuracion_empresa').select('*').single()
    if (!config?.google_drive_refresh_token) {
      return NextResponse.json({ error: 'Drive no conectado' }, { status: 400 })
    }

    const año = new Date().getFullYear().toString()
    const drive = await getDriveClient(config.google_drive_refresh_token)

    // Obtener carpeta raíz y subcarpeta del año
    const raizId = await obtenerOCrearCarpeta(drive, 'CristaleriaERP')
    const facturasFolderId = await obtenerOCrearCarpeta(drive, 'Facturas', raizId)
    const añoFolderId = await obtenerOCrearCarpeta(drive, año, facturasFolderId)

    // Listar los archivos ya en Drive para este año
    const archivosEnDrive = await listarArchivosEnCarpeta(drive, añoFolderId)
    const numerosEnDrive = new Set(
      archivosEnDrive
        .filter(n => n.startsWith('Factura-'))
        .map(n => n.replace('Factura-', '').replace('.pdf', ''))
    )

    // Obtener todas las facturas del año que NO están anuladas
    const { data: facturas } = await admin
      .from('facturas')
      .select('*, cliente:clientes(*), items:factura_items(*)')
      .gte('fecha', `${año}-01-01`)
      .lte('fecha', `${año}-12-31`)
      .neq('estado', 'anulada')
      .order('created_at', { ascending: true })

    if (!facturas?.length) {
      return NextResponse.json({ ok: true, subidas: 0, total: 0 })
    }

    const empresa = config
    let subidas = 0
    const errores: string[] = []

    for (const factura of facturas) {
      if (numerosEnDrive.has(factura.numero)) continue

      try {
        const buffer = await renderToBuffer(
          React.createElement(FacturaPDF, { factura: factura as any, empresa: empresa as any })
        )

        const nombreArchivo = `Factura-${factura.numero}.pdf`
        const { data: fileData } = await drive.files.create({
          requestBody: { name: nombreArchivo, parents: [añoFolderId] },
          media: { mimeType: 'application/pdf', body: Readable.from(buffer) },
          fields: 'id',
        })

        await admin.from('facturas').update({ drive_file_id: fileData.id }).eq('id', factura.id)
        subidas++
      } catch (e: any) {
        errores.push(`${factura.numero}: ${e.message}`)
      }
    }

    return NextResponse.json({
      ok: true,
      subidas,
      total: facturas.length,
      yaEnDrive: facturas.length - subidas - errores.length,
      errores: errores.length > 0 ? errores : undefined,
    })
  } catch (error: any) {
    const msg = error?.message ?? String(error)
    const isInvalidGrant = msg.includes('invalid_grant') || error?.response?.data?.error === 'invalid_grant'

    if (isInvalidGrant) {
      const admin = createAdminClient()
      await admin.from('configuracion_empresa')
        .update({ google_drive_refresh_token: null, google_drive_folder_id: null })
        .not('id', 'is', null)
      return NextResponse.json({ error: 'TOKEN_EXPIRADO' }, { status: 401 })
    }

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

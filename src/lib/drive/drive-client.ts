import { google } from 'googleapis'
import { Readable } from 'stream'
import { createAdminClient } from '@/lib/supabase/server'

async function getDriveClient() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('configuracion_empresa')
    .select('google_drive_refresh_token')
    .single()

  if (!data?.google_drive_refresh_token) {
    throw new Error('Google Drive no conectado. Ve a Configuración > Google Drive para conectarlo.')
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  )

  oauth2Client.setCredentials({ refresh_token: data.google_drive_refresh_token })
  return google.drive({ version: 'v3', auth: oauth2Client })
}

async function obtenerOCrearCarpetaRaiz(drive: any): Promise<string> {
  const admin = createAdminClient()
  const { data: config } = await admin
    .from('configuracion_empresa')
    .select('google_drive_folder_id')
    .single()

  if (config?.google_drive_folder_id) return config.google_drive_folder_id

  // Buscar si ya existe la carpeta
  const { data: lista } = await drive.files.list({
    q: "name='CristaleriaERP' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id)',
    spaces: 'drive',
  })

  let folderId: string
  if (lista.files?.length > 0) {
    folderId = lista.files[0].id
  } else {
    const { data: carpeta } = await drive.files.create({
      requestBody: { name: 'CristaleriaERP', mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id',
    })
    folderId = carpeta.id
  }

  await admin
    .from('configuracion_empresa')
    .update({ google_drive_folder_id: folderId })
    .not('id', 'is', null)

  return folderId
}

async function obtenerOCrearSubcarpeta(drive: any, nombre: string, padreId: string): Promise<string> {
  const { data: lista } = await drive.files.list({
    q: `name='${nombre}' and mimeType='application/vnd.google-apps.folder' and '${padreId}' in parents and trashed=false`,
    fields: 'files(id)',
  })

  if (lista.files?.length > 0) return lista.files[0].id

  const { data: carpeta } = await drive.files.create({
    requestBody: {
      name: nombre,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [padreId],
    },
    fields: 'id',
  })
  return carpeta.id
}

export async function subirFacturaADrive({ buffer, numero, año }: { buffer: Buffer; numero: string; año: string }): Promise<{ driveFileId: string }> {
  const drive = await getDriveClient()
  const raizId = await obtenerOCrearCarpetaRaiz(drive)
  const facturasFolderId = await obtenerOCrearSubcarpeta(drive, 'Facturas', raizId)
  const añoFolderId = await obtenerOCrearSubcarpeta(drive, año, facturasFolderId)

  const nombreArchivo = `Factura-${numero}.pdf`
  const { data } = await drive.files.create({
    requestBody: {
      name: nombreArchivo,
      parents: [añoFolderId],
    },
    media: { mimeType: 'application/pdf', body: Readable.from(buffer) },
    fields: 'id',
  })

  return { driveFileId: data.id! }
}

export async function subirPresupuestoADrive({ buffer, numero, año }: { buffer: Buffer; numero: string; año: string }): Promise<{ driveFileId: string }> {
  const drive = await getDriveClient()
  const raizId = await obtenerOCrearCarpetaRaiz(drive)
  const presupuestosFolderId = await obtenerOCrearSubcarpeta(drive, 'Presupuestos', raizId)
  const añoFolderId = await obtenerOCrearSubcarpeta(drive, año, presupuestosFolderId)

  const nombreArchivo = `Presupuesto-${numero}.pdf`
  const { data } = await drive.files.create({
    requestBody: {
      name: nombreArchivo,
      parents: [añoFolderId],
    },
    media: { mimeType: 'application/pdf', body: Readable.from(buffer) },
    fields: 'id',
  })

  return { driveFileId: data.id! }
}

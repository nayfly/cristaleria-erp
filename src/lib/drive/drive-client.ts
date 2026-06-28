import { google } from 'googleapis'
import { Readable } from 'stream'

function getDriveClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

async function obtenerOCrearCarpeta(drive: any, nombre: string, padreId: string): Promise<string> {
  const { data } = await drive.files.list({
    q: `name='${nombre}' and mimeType='application/vnd.google-apps.folder' and '${padreId}' in parents and trashed=false`,
    fields: 'files(id)',
  })
  if (data.files?.length > 0) return data.files[0].id

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

async function subirPDF({ buffer, nombre, carpetaId }: { buffer: Buffer; nombre: string; carpetaId: string }): Promise<string> {
  const drive = getDriveClient()
  const stream = Readable.from(buffer)

  const { data: existing } = await drive.files.list({
    q: `name='${nombre}.pdf' and '${carpetaId}' in parents and trashed=false`,
    fields: 'files(id)',
  })

  if (existing.files?.length > 0) {
    const { data } = await drive.files.update({
      fileId: existing.files[0].id,
      media: { mimeType: 'application/pdf', body: stream },
      fields: 'id',
    })
    return data.id!
  }

  const { data } = await drive.files.create({
    requestBody: { name: `${nombre}.pdf`, parents: [carpetaId] },
    media: { mimeType: 'application/pdf', body: stream },
    fields: 'id',
  })
  return data.id!
}

export async function subirFacturaADrive({ buffer, numero, año }: { buffer: Buffer; numero: string; año: string }): Promise<{ driveFileId: string }> {
  const drive = getDriveClient()
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!
  const carpetaFacturas = await obtenerOCrearCarpeta(drive, 'Facturas', rootFolderId)
  const carpetaAño = await obtenerOCrearCarpeta(drive, año, carpetaFacturas)
  const driveFileId = await subirPDF({ buffer, nombre: numero, carpetaId: carpetaAño })
  return { driveFileId }
}

export async function subirPresupuestoADrive({ buffer, numero, año }: { buffer: Buffer; numero: string; año: string }): Promise<{ driveFileId: string }> {
  const drive = getDriveClient()
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!
  const carpetaPresupuestos = await obtenerOCrearCarpeta(drive, 'Presupuestos', rootFolderId)
  const carpetaAño = await obtenerOCrearCarpeta(drive, año, carpetaPresupuestos)
  const driveFileId = await subirPDF({ buffer, nombre: numero, carpetaId: carpetaAño })
  return { driveFileId }
}

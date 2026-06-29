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

export async function subirFacturaADrive({ buffer, numero, año }: { buffer: Buffer; numero: string; año: string }): Promise<{ driveFileId: string }> {
  const drive = getDriveClient()
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!.trim()
  const nombre = `Factura-${numero}-${año}.pdf`
  const stream = Readable.from(buffer)

  const { data } = await drive.files.create({
    requestBody: {
      name: nombre,
      parents: [rootFolderId],
    },
    media: { mimeType: 'application/pdf', body: stream },
    fields: 'id',
    supportsAllDrives: true,
  })

  return { driveFileId: data.id! }
}

export async function subirPresupuestoADrive({ buffer, numero, año }: { buffer: Buffer; numero: string; año: string }): Promise<{ driveFileId: string }> {
  const drive = getDriveClient()
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!.trim()
  const nombre = `Presupuesto-${numero}-${año}.pdf`
  const stream = Readable.from(buffer)

  const { data } = await drive.files.create({
    requestBody: {
      name: nombre,
      parents: [rootFolderId],
    },
    media: { mimeType: 'application/pdf', body: stream },
    fields: 'id',
    supportsAllDrives: true,
  })

  return { driveFileId: data.id! }
}

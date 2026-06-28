import { google } from 'googleapis'
import { Readable } from 'stream'

// ============================================
// AUTENTICACIÓN
// ============================================

function getAuthClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  })
  return auth
}

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuthClient() })
}

// ============================================
// HELPERS
// ============================================

/**
 * Reintento con backoff exponencial.
 * Útil para errores de rate limit de Drive API.
 */
async function conReintentos<T>(
  fn: () => Promise<T>,
  intentos = 3,
  espera = 1000
): Promise<T> {
  for (let i = 0; i < intentos; i++) {
    try {
      return await fn()
    } catch (error: any) {
      const esUltimoIntento = i === intentos - 1
      const esRateLimit =
        error?.code === 429 ||
        error?.errors?.[0]?.reason === 'rateLimitExceeded'

      if (esUltimoIntento || !esRateLimit) throw error

      const delay = espera * Math.pow(2, i)
      console.warn(`Drive API: reintento ${i + 1}/${intentos} en ${delay}ms`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw new Error('No se pudo completar la operación tras varios reintentos')
}

/**
 * Busca una carpeta por nombre dentro de un padre.
 * Si no existe, la crea.
 */
async function obtenerOCrearCarpeta(
  nombre: string,
  padreId: string
): Promise<string> {
  const drive = getDrive()

  return conReintentos(async () => {
    // Buscar carpeta existente
    const { data } = await drive.files.list({
      q: `name='${nombre}' and '${padreId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
      spaces: 'drive',
    })

    if (data.files && data.files.length > 0) {
      return data.files[0].id!
    }

    // Crear carpeta
    const { data: nueva } = await drive.files.create({
      requestBody: {
        name: nombre,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [padreId],
      },
      fields: 'id',
    })

    return nueva.id!
  })
}

// ============================================
// API PÚBLICA
// ============================================

/**
 * Estructura de carpetas Drive:
 * CristaleriaERP (root)
 * ├── Clientes
 * │   └── [Nombre cliente]
 * │       ├── Facturas
 * │       └── Presupuestos
 * ├── Facturas YYYY
 * └── Presupuestos YYYY
 */

export async function obtenerCarpetaCliente(
  nombreCliente: string
): Promise<{ clienteId: string; facturasId: string; presupuestosId: string }> {
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!

  // Carpeta "Clientes" en la raíz
  const clientesId = await obtenerOCrearCarpeta('Clientes', rootId)

  // Carpeta del cliente
  const clienteId = await obtenerOCrearCarpeta(nombreCliente, clientesId)

  // Subcarpetas del cliente
  const [facturasId, presupuestosId] = await Promise.all([
    obtenerOCrearCarpeta('Facturas', clienteId),
    obtenerOCrearCarpeta('Presupuestos', clienteId),
  ])

  return { clienteId, facturasId, presupuestosId }
}

export async function subirPDFADrive({
  buffer,
  nombre,
  carpetaId,
}: {
  buffer: Buffer
  nombre: string        // Ej: "FAC-2026-001.pdf"
  carpetaId: string
}): Promise<string> {
  const drive = getDrive()

  return conReintentos(async () => {
    // Si ya existe, actualizarlo
    const { data: existente } = await drive.files.list({
      q: `name='${nombre}' and '${carpetaId}' in parents and trashed=false`,
      fields: 'files(id)',
    })

    if (existente.files && existente.files.length > 0) {
      const fileId = existente.files[0].id!
      await drive.files.update({
        fileId,
        media: {
          mimeType: 'application/pdf',
          body: Readable.from(buffer),
        },
      })
      return fileId
    }

    // Crear nuevo
    const { data } = await drive.files.create({
      requestBody: {
        name: nombre,
        parents: [carpetaId],
        mimeType: 'application/pdf',
      },
      media: {
        mimeType: 'application/pdf',
        body: Readable.from(buffer),
      },
      fields: 'id',
    })

    return data.id!
  })
}

/**
 * Sube un PDF de factura a Drive y lo organiza en dos sitios:
 * - Carpeta del cliente/Facturas
 * - Carpeta Facturas YYYY
 */
export async function subirFacturaADrive({
  buffer,
  numero,
  nombreCliente,
  año,
}: {
  buffer: Buffer
  numero: string
  nombreCliente: string
  año: string
}): Promise<{ driveFileId: string }> {
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!
  const nombreArchivo = `${numero}.pdf`

  // Carpetas en paralelo para reducir latencia
  const [{ facturasId: carpetaClienteFacturas }, carpetaAño] = await Promise.all([
    obtenerCarpetaCliente(nombreCliente),
    obtenerOCrearCarpeta(`Facturas ${año}`, rootId),
  ])

  // Subir a carpeta del cliente (fuente primaria en Drive)
  const driveFileId = await subirPDFADrive({
    buffer,
    nombre: nombreArchivo,
    carpetaId: carpetaClienteFacturas,
  })

  // Crear shortcut en carpeta del año (para navegación rápida)
  // Usamos un try/catch silencioso — si falla, no es crítico
  try {
    const drive = getDrive()
    const { data: existeShortcut } = await drive.files.list({
      q: `name='${nombreArchivo}' and '${carpetaAño}' in parents and trashed=false`,
      fields: 'files(id)',
    })
    if (!existeShortcut.files?.length) {
      await drive.files.create({
        requestBody: {
          name: nombreArchivo,
          mimeType: 'application/vnd.google-apps.shortcut',
          parents: [carpetaAño],
          shortcutDetails: { targetId: driveFileId },
        },
      })
    }
  } catch {
    // Shortcut fallido no es crítico
  }

  return { driveFileId }
}

export async function subirPresupuestoADrive({
  buffer,
  numero,
  nombreCliente,
  año,
}: {
  buffer: Buffer
  numero: string
  nombreCliente: string
  año: string
}): Promise<{ driveFileId: string }> {
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!
  const nombreArchivo = `${numero}.pdf`

  const [{ presupuestosId: carpetaClientePresu }, carpetaAño] = await Promise.all([
    obtenerCarpetaCliente(nombreCliente),
    obtenerOCrearCarpeta(`Presupuestos ${año}`, rootId),
  ])

  const driveFileId = await subirPDFADrive({
    buffer,
    nombre: nombreArchivo,
    carpetaId: carpetaClientePresu,
  })

  try {
    const drive = getDrive()
    const { data: existeShortcut } = await drive.files.list({
      q: `name='${nombreArchivo}' and '${carpetaAño}' in parents and trashed=false`,
      fields: 'files(id)',
    })
    if (!existeShortcut.files?.length) {
      await drive.files.create({
        requestBody: {
          name: nombreArchivo,
          mimeType: 'application/vnd.google-apps.shortcut',
          parents: [carpetaAño],
          shortcutDetails: { targetId: driveFileId },
        },
      })
    }
  } catch {
    // No crítico
  }

  return { driveFileId }
}

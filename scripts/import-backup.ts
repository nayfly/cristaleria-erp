/**
 * Import script for .isim backup files
 * Usage: npx tsx scripts/import-backup.ts <path-to-file.isim> [--clientes] [--productos] [--dry-run]
 *
 * Example:
 *   npx tsx scripts/import-backup.ts "BackupFile_25_nov_2025.isim" --clientes --productos
 *   npx tsx scripts/import-backup.ts "BackupFile_25_nov_2025.isim" --clientes --dry-run
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const args = process.argv.slice(2)
const filePath = args.find((a) => !a.startsWith('--'))
const importClientes = args.includes('--clientes')
const importProductos = args.includes('--productos')
const dryRun = args.includes('--dry-run')

if (!filePath) {
  console.error('Usa: npx tsx scripts/import-backup.ts <archivo.isim> [--clientes] [--productos] [--dry-run]')
  process.exit(1)
}

if (!importClientes && !importProductos) {
  console.error('Especifica al menos --clientes o --productos')
  process.exit(1)
}

function ivaFromTax(taxPct: number): number {
  if ([0, 4, 10, 21].includes(taxPct)) return taxPct
  return 21
}

function cleanPhone(phone: string): string {
  return (phone ?? '').replace(/[^\d+\s\-().]/g, '').trim().slice(0, 20)
}

function cleanAddress(addr: string): string {
  return (addr ?? '').replace(/\r/g, '').trim().slice(0, 300)
}

async function importarClientes(data: any[], dryRun: boolean) {
  const activos = data.filter((c) => !c.isRemoved)
  console.log(`\n📋 Clientes a importar: ${activos.length}`)

  const rows = activos.map((c) => {
    const nombre = (c.contactPersonName || c.organizationName || 'Sin nombre').trim()
    const empresa = c.organizationName !== c.contactPersonName ? (c.organizationName || '').trim() : ''
    const email = (c.email || '').trim().toLowerCase()
    const telefono = cleanPhone(c.phoneNumber)
    const direccion = cleanAddress(c.billingAddress)
    const nif = (c.businessId || '').trim()

    return {
      nombre,
      empresa: empresa || null,
      email: email || null,
      telefono: telefono || null,
      direccion: direccion || null,
      activo: true,
    }
  })

  if (dryRun) {
    console.log('DRY RUN — primeros 5 clientes:')
    rows.slice(0, 5).forEach((r) => console.log(r))
    console.log(`... y ${rows.length - 5} más`)
    return
  }

  // Insertar en lotes de 100
  let ok = 0
  let errors = 0
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const { error } = await supabase.from('clientes').insert(batch)
    if (error) {
      console.error(`  Error en lote ${i}-${i + batch.length}:`, error.message)
      errors += batch.length
    } else {
      ok += batch.length
      process.stdout.write(`  ${ok}/${rows.length} clientes importados...\r`)
    }
  }
  console.log(`\n✅ Clientes: ${ok} importados, ${errors} con error`)
}

async function importarProductos(data: any[], dryRun: boolean) {
  const activos = data.filter((p) => !p.isRemoved)
  console.log(`\n📦 Productos a importar: ${activos.length}`)

  const rows = activos.map((p) => {
    const nombre = (p.name || 'Sin nombre').trim()
    const descripcion = (p.productDescription || '').trim()
    const precio = typeof p.rate === 'number' ? p.rate : parseFloat(p.rate) || 0
    const iva = ivaFromTax(typeof p.taxPercentage === 'number' ? p.taxPercentage : parseInt(p.taxPercentage) || 0)
    const unidad = (p.unit || 'ud').trim() || 'ud'

    return {
      nombre: nombre.slice(0, 200),
      descripcion: descripcion.slice(0, 500) || null,
      referencia: null,
      precio_base: precio,
      tipo_iva: iva,
      unidad: unidad.slice(0, 20),
      activo: true,
    }
  })

  if (dryRun) {
    console.log('DRY RUN — primeros 5 productos:')
    rows.slice(0, 5).forEach((r) => console.log(r))
    console.log(`... y ${rows.length - 5} más`)
    return
  }

  let ok = 0
  let errors = 0
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const { error } = await supabase.from('productos').insert(batch)
    if (error) {
      console.error(`  Error en lote ${i}-${i + batch.length}:`, error.message)
      errors += batch.length
    } else {
      ok += batch.length
      process.stdout.write(`  ${ok}/${rows.length} productos importados...\r`)
    }
  }
  console.log(`\n✅ Productos: ${ok} importados, ${errors} con error`)
}

async function main() {
  const fullPath = path.resolve(filePath)
  console.log(`\nLeyendo archivo: ${fullPath}`)

  const bytes = fs.readFileSync(fullPath)
  const text = bytes.toString('utf-8')
  const backup = JSON.parse(text)

  console.log(`Archivo cargado:`)
  console.log(`  Clientes totales: ${backup.Client?.length ?? 0}`)
  console.log(`  Productos totales: ${backup.Product?.length ?? 0}`)

  if (dryRun) console.log('\n⚠️  MODO DRY-RUN — no se escribirá nada en la base de datos\n')

  if (importClientes) await importarClientes(backup.Client ?? [], dryRun)
  if (importProductos) await importarProductos(backup.Product ?? [], dryRun)

  console.log('\nImportación completada.')
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})

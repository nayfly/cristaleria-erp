/**
 * Import facturas y presupuestos desde backup .isim
 * Usage: npx tsx scripts/import-facturas-presupuestos.ts <backup.isim> [--dry-run]
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Faltan variables: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const args = process.argv.slice(2)
const filePath = args.find((a) => !a.startsWith('--'))
const dryRun = args.includes('--dry-run')

if (!filePath) {
  console.error('Uso: npx tsx scripts/import-facturas-presupuestos.ts <backup.isim> [--dry-run]')
  process.exit(1)
}

function toDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString().split('T')[0]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Construye un mapa: oldClientId → newSupabaseUUID
 * Estrategia: cargamos todos los clientes de Supabase y los cruzamos
 * con los del backup por nombre + teléfono (normalizado).
 */
async function buildClientMap(backupClients: any[]): Promise<Map<string, string>> {
  const { data: supabaseClients, error } = await supabase
    .from('clientes')
    .select('id, nombre, telefono')

  if (error) throw new Error(`Error cargando clientes de Supabase: ${error.message}`)

  // Normaliza para comparar: minúsculas, sin espacios extra, sin guiones
  const norm = (s: string) => (s ?? '').toLowerCase().replace(/[\s\-().+]/g, '').trim()

  // Índice por "nombre+telefono" y por "nombre solo"
  const byNamePhone = new Map<string, string>()
  const byName = new Map<string, string>()
  for (const sc of supabaseClients ?? []) {
    const key = norm(sc.nombre) + '|' + norm(sc.telefono ?? '')
    byNamePhone.set(key, sc.id)
    // por nombre solo (último match gana, pero es fallback)
    byName.set(norm(sc.nombre), sc.id)
  }

  const map = new Map<string, string>()
  let matched = 0
  let unmatched = 0

  for (const bc of backupClients) {
    if (bc.isRemoved) continue
    const nombre = (bc.contactPersonName || bc.organizationName || '').trim()
    const tel = (bc.phoneNumber || '').trim()
    const key = norm(nombre) + '|' + norm(tel)

    let newId = byNamePhone.get(key)
    if (!newId) newId = byName.get(norm(nombre))

    if (newId) {
      map.set(bc.id, newId)
      matched++
    } else {
      console.warn(`  ⚠️  Sin match: "${nombre}" (tel: ${tel})`)
      unmatched++
    }
  }

  console.log(`  Clientes mapeados: ${matched} ✅  Sin match: ${unmatched} ⚠️`)
  return map
}

async function importarPresupuestos(
  estimates: any[],
  listItems: any[],
  clientMap: Map<string, string>,
  dryRun: boolean
) {
  const activos = estimates.filter((e) => !e.isRemoved)
  console.log(`\n📋 Presupuestos a importar: ${activos.length}`)

  // Items agrupados por referenceId (= estimate id)
  const itemsByRef = new Map<string, any[]>()
  for (const li of listItems) {
    if (li.isRemoved || li.transactionType !== 1) continue
    if (!itemsByRef.has(li.referenceId)) itemsByRef.set(li.referenceId, [])
    itemsByRef.get(li.referenceId)!.push(li)
  }

  let ok = 0
  let skipped = 0
  let errors = 0

  for (const est of activos) {
    const clienteId = clientMap.get(est.clientId)
    if (!clienteId) {
      skipped++
      continue
    }

    const subtotal = round2(est.subtotal ?? 0)
    const ivaPct = est.taxPercentage ?? 21
    const ivaImporte = round2(est.taxAmount ?? 0)
    const total = round2(est.totalAmount ?? subtotal + ivaImporte)
    const fecha = toDate(est.createdDate)
    const numero = est.estimateNumber ?? `P/${ok + 1}`

    const presRow = {
      numero,
      cliente_id: clienteId,
      fecha,
      estado: 'enviado' as const,
      subtotal,
      descuento: 0,
      base_imponible: subtotal,
      iva_porcentaje: ivaPct,
      iva_importe: ivaImporte,
      total,
    }

    const rawItems = itemsByRef.get(est.id) ?? []
    const itemRows = rawItems
      .sort((a: any, b: any) => a.position - b.position)
      .map((li: any, i: number) => ({
        orden: i + 1,
        descripcion: (li.itemDescription || li.name || 'Sin descripción').trim().slice(0, 500),
        cantidad: round2(li.quantity ?? 1),
        unidad: (li.unit || 'ud').slice(0, 20),
        precio_unitario: round2(li.ratePerUnit ?? 0),
        descuento: round2(li.discountPercentage ?? 0),
        total: round2(li.total ?? 0),
      }))

    // Si no hay items, ponemos uno genérico con el total
    if (itemRows.length === 0) {
      itemRows.push({
        orden: 1,
        descripcion: 'Trabajos realizados',
        cantidad: 1,
        unidad: 'ud',
        precio_unitario: subtotal,
        descuento: 0,
        total: subtotal,
      })
    }

    if (dryRun) {
      if (ok < 3) {
        console.log(`  [DRY] Presupuesto ${numero} | cliente ${clienteId} | total ${total} | ${itemRows.length} líneas`)
      }
      ok++
      continue
    }

    const { data: newPres, error: errPres } = await supabase
      .from('presupuestos')
      .insert(presRow)
      .select('id')
      .single()

    if (errPres || !newPres) {
      console.error(`  Error presupuesto ${numero}: ${errPres?.message}`)
      errors++
      continue
    }

    const itemsConId = itemRows.map((r: any) => ({ ...r, presupuesto_id: newPres.id }))
    const { error: errItems } = await supabase.from('presupuesto_items').insert(itemsConId)
    if (errItems) {
      console.error(`  Error items presupuesto ${numero}: ${errItems.message}`)
    }

    ok++
    process.stdout.write(`  ${ok}/${activos.length - skipped} presupuestos...\r`)
  }

  console.log(`\n✅ Presupuestos: ${ok} importados | ${skipped} sin cliente | ${errors} con error`)
  return ok
}

async function importarFacturas(
  invoices: any[],
  listItems: any[],
  clientMap: Map<string, string>,
  dryRun: boolean
) {
  const activos = invoices.filter((i) => !i.isRemoved)
  console.log(`\n🧾 Facturas a importar: ${activos.length}`)

  // Items agrupados por referenceId (= invoice id), transactionType 0
  const itemsByRef = new Map<string, any[]>()
  for (const li of listItems) {
    if (li.isRemoved || li.transactionType !== 0) continue
    if (!itemsByRef.has(li.referenceId)) itemsByRef.set(li.referenceId, [])
    itemsByRef.get(li.referenceId)!.push(li)
  }

  let ok = 0
  let skipped = 0
  let errors = 0

  for (const inv of activos) {
    const clienteId = clientMap.get(inv.clientId)
    if (!clienteId) {
      skipped++
      continue
    }

    const subtotal = round2(inv.subtotal ?? 0)
    const ivaPct = inv.taxPercentage ?? 21
    const ivaImporte = round2(inv.taxAmount ?? 0)
    const total = round2(inv.totalAmount ?? subtotal + ivaImporte)
    const pagado = round2(inv.paidAmount ?? 0) >= total && total > 0
    const fecha = toDate(inv.createdDate)
    const numero = inv.invoiceNumber ?? `F/${ok + 1}`

    const factRow = {
      numero,
      cliente_id: clienteId,
      fecha,
      estado: 'emitida' as const,
      subtotal,
      descuento: 0,
      base_imponible: subtotal,
      iva_porcentaje: ivaPct,
      iva_importe: ivaImporte,
      total,
      pagado,
    }

    const rawItems = itemsByRef.get(inv.id) ?? []
    const itemRows = rawItems
      .sort((a: any, b: any) => a.position - b.position)
      .map((li: any, i: number) => ({
        orden: i + 1,
        descripcion: (li.itemDescription || li.name || 'Sin descripción').trim().slice(0, 500),
        cantidad: round2(li.quantity ?? 1),
        unidad: (li.unit || 'ud').slice(0, 20),
        precio_unitario: round2(li.ratePerUnit ?? 0),
        descuento: round2(li.discountPercentage ?? 0),
        total: round2(li.total ?? 0),
      }))

    if (itemRows.length === 0) {
      itemRows.push({
        orden: 1,
        descripcion: 'Trabajos realizados',
        cantidad: 1,
        unidad: 'ud',
        precio_unitario: subtotal,
        descuento: 0,
        total: subtotal,
      })
    }

    if (dryRun) {
      if (ok < 3) {
        console.log(`  [DRY] Factura ${numero} | cliente ${clienteId} | total ${total} | pagado ${pagado} | ${itemRows.length} líneas`)
      }
      ok++
      continue
    }

    const { data: newFact, error: errFact } = await supabase
      .from('facturas')
      .insert(factRow)
      .select('id')
      .single()

    if (errFact || !newFact) {
      // Número duplicado (el mismo número existe ya)
      if (errFact?.message?.includes('unique') || errFact?.code === '23505') {
        console.warn(`  ⚠️  Número duplicado, saltando: ${numero}`)
        skipped++
      } else {
        console.error(`  Error factura ${numero}: ${errFact?.message}`)
        errors++
      }
      continue
    }

    const itemsConId = itemRows.map((r: any) => ({ ...r, factura_id: newFact.id }))
    const { error: errItems } = await supabase.from('factura_items').insert(itemsConId)
    if (errItems) {
      console.error(`  Error items factura ${numero}: ${errItems.message}`)
    }

    ok++
    process.stdout.write(`  ${ok}/${activos.length - skipped} facturas...\r`)
  }

  console.log(`\n✅ Facturas: ${ok} importadas | ${skipped} saltadas | ${errors} con error`)
  return ok
}

async function actualizarContadores(presupuestosOk: number, facturasOk: number, dryRun: boolean) {
  // Tras la importación, actualizamos los contadores de numeración para que
  // los nuevos documentos no colisionen con los importados.
  const { data: config } = await supabase.from('configuracion_empresa').select('siguiente_num_factura, siguiente_num_presupuesto').single()
  if (!config) return

  // Buscamos el máximo número usado en los documentos importados
  const { data: maxFact } = await supabase
    .from('facturas')
    .select('numero')
    .order('created_at', { ascending: false })
    .limit(500)

  const { data: maxPres } = await supabase
    .from('presupuestos')
    .select('numero')
    .order('created_at', { ascending: false })
    .limit(500)

  const extractNum = (docs: any[]) => {
    let max = 0
    for (const d of docs ?? []) {
      const parts = (d.numero ?? '').split('/')
      const n = parseInt(parts[parts.length - 1])
      if (!isNaN(n) && n > max) max = n
    }
    return max
  }

  const maxNumFact = extractNum(maxFact ?? [])
  const maxNumPres = extractNum(maxPres ?? [])
  const nextFact = maxNumFact + 1
  const nextPres = maxNumPres + 1

  console.log(`\n🔢 Ajustando contadores: facturas → ${nextFact} | presupuestos → ${nextPres}`)

  if (dryRun) return

  await supabase
    .from('configuracion_empresa')
    .update({ siguiente_num_factura: nextFact, siguiente_num_presupuesto: nextPres })
    .neq('id', '00000000-0000-0000-0000-000000000000')
}

async function main() {
  const fullPath = path.resolve(filePath!)
  console.log(`\nLeyendo: ${fullPath}`)

  const bytes = fs.readFileSync(fullPath)
  const backup = JSON.parse(bytes.toString('utf-8'))

  console.log(`Backup: ${backup.Invoice?.length ?? 0} facturas | ${backup.Estimate?.length ?? 0} presupuestos | ${backup.ListItem?.length ?? 0} líneas`)
  if (dryRun) console.log('\n⚠️  DRY-RUN — no se escribe nada\n')

  console.log('\nConstruyendo mapa de clientes...')
  const clientMap = await buildClientMap(backup.Client ?? [])

  const presOk = await importarPresupuestos(backup.Estimate ?? [], backup.ListItem ?? [], clientMap, dryRun)
  const factOk = await importarFacturas(backup.Invoice ?? [], backup.ListItem ?? [], clientMap, dryRun)

  await actualizarContadores(presOk, factOk, dryRun)

  console.log('\n🎉 Importación completada.')
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})

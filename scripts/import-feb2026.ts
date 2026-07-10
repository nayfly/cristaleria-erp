/**
 * Importa del backup feb 2026 solo lo que NO existe ya en Supabase:
 * - Clientes nuevos (por nombre)
 * - Facturas nuevas (por número)
 * - Presupuestos nuevos (por número)
 */
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const dryRun = process.argv.includes('--dry-run')

function toDate(epoch: number) { return new Date(epoch * 1000).toISOString().split('T')[0] }
function round2(n: number) { return Math.round(n * 100) / 100 }
function norm(s: string) { return (s ?? '').toLowerCase().replace(/[\s\-().+]/g, '').trim() }

async function main() {
  const bytes = fs.readFileSync('C:/Users/rober/Downloads/backup_feb2026.isim')
  const backup = JSON.parse(bytes.toString('utf-8'))

  // Cargar estado actual de BD
  const { data: bdFacturas } = await sb.from('facturas').select('numero')
  const { data: bdPresupuestos } = await sb.from('presupuestos').select('numero')
  const { data: bdClientes } = await sb.from('clientes').select('id, nombre, telefono')

  const numerosFacturas = new Set(bdFacturas?.map(f => f.numero) ?? [])
  const numerosPresupuestos = new Set(bdPresupuestos?.map(p => p.numero) ?? [])
  const nombresClientes = new Set(bdClientes?.map(c => norm(c.nombre)) ?? [])

  // === CLIENTES NUEVOS ===
  const clientesNuevos = (backup.Client ?? []).filter((c: any) => {
    if (c.isRemoved) return false
    const nombre = (c.contactPersonName || c.organizationName || '').trim()
    return nombre && !nombresClientes.has(norm(nombre))
  })

  console.log(`\nClientes nuevos: ${clientesNuevos.length}`)
  if (clientesNuevos.length > 0 && !dryRun) {
    const rows = clientesNuevos.map((c: any) => ({
      nombre: (c.contactPersonName || c.organizationName || '').trim(),
      empresa: c.organizationName !== c.contactPersonName ? (c.organizationName || '').trim() || null : null,
      email: (c.email || '').trim().toLowerCase() || null,
      telefono: (c.phoneNumber || '').replace(/[^\d+\s\-().]/g, '').trim().slice(0, 20) || null,
      direccion: (c.billingAddress || '').replace(/\r/g, '').trim().slice(0, 300) || null,
      activo: true,
    }))
    const { error } = await sb.from('clientes').insert(rows)
    if (error) console.error('Error clientes:', error.message)
    else console.log(`✅ ${rows.length} clientes importados`)
  } else if (dryRun) {
    clientesNuevos.slice(0, 5).forEach((c: any) => console.log('  ', c.contactPersonName || c.organizationName))
  }

  // Recargar mapa de clientes (incluye los recién insertados)
  const { data: todosClientes } = await sb.from('clientes').select('id, nombre, telefono')
  const byNamePhone = new Map<string, string>()
  const byName = new Map<string, string>()
  for (const sc of todosClientes ?? []) {
    byNamePhone.set(norm(sc.nombre) + '|' + norm(sc.telefono ?? ''), sc.id)
    byName.set(norm(sc.nombre), sc.id)
  }
  const getClienteId = (bc: any) => {
    const nombre = (bc.contactPersonName || bc.organizationName || '').trim()
    const tel = (bc.phoneNumber || '').trim()
    return byNamePhone.get(norm(nombre) + '|' + norm(tel)) ?? byName.get(norm(nombre))
  }

  // Items agrupados por referenceId
  const itemsByRef = new Map<string, any[]>()
  for (const li of backup.ListItem ?? []) {
    if (li.isRemoved) continue
    if (!itemsByRef.has(li.referenceId)) itemsByRef.set(li.referenceId, [])
    itemsByRef.get(li.referenceId)!.push(li)
  }

  const buildItems = (refId: string, parentKey: string) => {
    const raw = itemsByRef.get(refId) ?? []
    const rows = raw.sort((a: any, b: any) => a.position - b.position).map((li: any, i: number) => ({
      orden: i + 1,
      descripcion: (li.itemDescription || li.name || 'Sin descripción').trim().slice(0, 500),
      cantidad: round2(li.quantity ?? 1),
      unidad: (li.unit || 'ud').slice(0, 20),
      precio_unitario: round2(li.ratePerUnit ?? 0),
      descuento: round2(li.discountPercentage ?? 0),
      total: round2(li.total ?? 0),
      [parentKey]: '', // placeholder, se rellena después
    }))
    if (rows.length === 0) return [{ orden: 1, descripcion: 'Trabajos realizados', cantidad: 1, unidad: 'ud', precio_unitario: 0, descuento: 0, total: 0, [parentKey]: '' }]
    return rows
  }

  // === PRESUPUESTOS NUEVOS ===
  const presupuestosNuevos = (backup.Estimate ?? []).filter((e: any) => !e.isRemoved && !numerosPresupuestos.has(e.estimateNumber))
  console.log(`\nPresupuestos nuevos: ${presupuestosNuevos.length}`)
  let presOk = 0, presSkipped = 0
  for (const est of presupuestosNuevos) {
    const clienteId = getClienteId(backup.Client?.find((c: any) => c.id === est.clientId))
    if (!clienteId) { presSkipped++; continue }
    const subtotal = round2(est.subtotal ?? 0)
    const ivaPct = est.taxPercentage ?? 21
    const ivaImporte = round2(est.taxAmount ?? 0)
    const total = round2(est.totalAmount ?? subtotal + ivaImporte)
    if (dryRun) { presOk++; continue }
    const { data: newPres, error } = await sb.from('presupuestos').insert({
      numero: est.estimateNumber,
      cliente_id: clienteId,
      fecha: toDate(est.createdDate),
      estado: 'enviado',
      subtotal, descuento: 0, base_imponible: subtotal,
      iva_porcentaje: ivaPct, iva_importe: ivaImporte, total,
    }).select('id').single()
    if (error) { console.error(`Error pres ${est.estimateNumber}:`, error.message); continue }
    const items = buildItems(est.id, 'presupuesto_id').map(r => ({ ...r, presupuesto_id: newPres.id }))
    await sb.from('presupuesto_items').insert(items)
    presOk++
  }
  console.log(`✅ Presupuestos: ${presOk} importados | ${presSkipped} sin cliente`)

  // === FACTURAS NUEVAS ===
  // Las de 2026 que colisionan con números históricos se importan como "2026/N"
  const renum2026 = (numero: string, fecha: string) => {
    if (fecha.startsWith('2026') && numerosFacturas.has(numero)) return `2026/${numero.split('/')[1]}`
    return numero
  }
  const facturasNuevas = (backup.Invoice ?? []).filter((i: any) => {
    if (i.isRemoved) return false
    const fecha = toDate(i.createdDate)
    const num = renum2026(i.invoiceNumber, fecha)
    return !numerosFacturas.has(num)
  })
  console.log(`\nFacturas nuevas: ${facturasNuevas.length}`)
  let factOk = 0, factSkipped = 0
  for (const inv of facturasNuevas) {
    const clienteId = getClienteId(backup.Client?.find((c: any) => c.id === inv.clientId))
    if (!clienteId) { factSkipped++; continue }
    const subtotal = round2(inv.subtotal ?? 0)
    const ivaPct = inv.taxPercentage ?? 21
    const ivaImporte = round2(inv.taxAmount ?? 0)
    const total = round2(inv.totalAmount ?? subtotal + ivaImporte)
    const pagado = round2(inv.paidAmount ?? 0) >= total && total > 0
    const numeroFinal = renum2026(inv.invoiceNumber, toDate(inv.createdDate))
    if (dryRun) { factOk++; continue }
    const { data: newFact, error } = await sb.from('facturas').insert({
      numero: numeroFinal,
      cliente_id: clienteId,
      fecha: toDate(inv.createdDate),
      estado: 'cobrada',
      subtotal, descuento: 0, base_imponible: subtotal,
      iva_porcentaje: ivaPct, iva_importe: ivaImporte, total,
      pagado: true,
    }).select('id').single()
    if (error) { console.error(`Error fact ${inv.invoiceNumber}:`, error.message); continue }
    const items = buildItems(inv.id, 'factura_id').map(r => ({ ...r, factura_id: newFact.id }))
    await sb.from('factura_items').insert(items)
    factOk++
  }
  console.log(`✅ Facturas: ${factOk} importadas | ${factSkipped} sin cliente`)

  // Actualizar contadores
  if (!dryRun) {
    const { data: maxF } = await sb.from('facturas').select('numero').limit(500)
    const { data: maxP } = await sb.from('presupuestos').select('numero').limit(500)
    const extractMax = (docs: any[]) => {
      let max = 0
      for (const d of docs ?? []) {
        const n = parseInt((d.numero ?? '').split('/').pop())
        if (!isNaN(n) && n > max) max = n
      }
      return max + 1
    }
    await sb.from('configuracion_empresa').update({
      siguiente_num_factura: extractMax(maxF ?? []),
      siguiente_num_presupuesto: extractMax(maxP ?? []),
    }).neq('id', '00000000-0000-0000-0000-000000000000')
    console.log(`\n🔢 Contadores actualizados: facturas → ${extractMax(maxF ?? [])} | presupuestos → ${extractMax(maxP ?? [])}`)
  }

  console.log('\n🎉 Listo.')
}

main().catch(e => { console.error(e); process.exit(1) })

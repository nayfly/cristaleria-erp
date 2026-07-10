import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function norm(s: string) { return (s ?? '').toLowerCase().replace(/[\s\-().+]/g, '').trim() }
function round2(n: number) { return Math.round(n * 100) / 100 }

function parseCSV(text: string) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    // CSV simple split (los valores no tienen comas internas en este archivo)
    const vals = line.split(',')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h.trim()] = (vals[i] ?? '').trim() })
    return row
  })
}

async function main() {
  const csv = fs.readFileSync('C:/Users/rober/Downloads/30Jun2026_1604_invoice.csv', 'utf-8')
  const rows = parseCSV(csv)
  console.log(`CSV: ${rows.length} filas`)

  // Estado actual BD
  const { data: bdFacturas } = await sb.from('facturas').select('numero')
  const { data: bdClientes } = await sb.from('clientes').select('id, nombre, telefono')
  const numerosExistentes = new Set(bdFacturas?.map(f => f.numero) ?? [])

  // Mapa de clientes por nombre y por teléfono
  const byName = new Map<string, string>()
  const byPhone = new Map<string, string>()
  for (const c of bdClientes ?? []) {
    byName.set(norm(c.nombre), c.id)
    if (c.telefono) byPhone.set(norm(c.telefono), c.id)
  }

  const getClienteId = (orgName: string, contactPerson: string, shippingAddr: string) => {
    // Intentar por nombre organización, luego contacto, luego teléfono en shipping address
    return byName.get(norm(orgName))
      ?? byName.get(norm(contactPerson))
      ?? byPhone.get(norm(shippingAddr))
      ?? null
  }

  // Cargar todas las facturas con fecha para poder renombrar las históricas
  const { data: todasFacturas } = await sb.from('facturas').select('id, numero, fecha')
  const porNumero = new Map((todasFacturas ?? []).map(f => [f.numero, f]))

  // Candidatas: filas del CSV cuyo número no existe en 2026 en BD, o existe pero en año anterior
  const candidatas = rows.filter(r => {
    if (!r['Invoice No.'] || !r['Created Date']) return false
    const anioCSV = r['Created Date'].split('-')[0]
    if (anioCSV !== '2026') return false // solo procesamos 2026 nuevas
    const enBD = porNumero.get(r['Invoice No.'])
    if (!enBD) return true // no existe → nueva
    if (enBD.fecha.startsWith('2026')) return false // ya importada de 2026
    return true // existe pero de año anterior → renombrar y re-importar
  })

  console.log(`Facturas 2026 a importar: ${candidatas.length}`)
  candidatas.forEach(r => console.log(`  ${r['Created Date']} — ${r['Invoice No.']} — ${r['Amount']}€ — ${r['Organization Name']}`))

  // Renombrar históricas que colisionan
  for (const r of candidatas) {
    const numero = r['Invoice No.']
    const historica = porNumero.get(numero)
    if (historica && !historica.fecha.startsWith('2026')) {
      const anioH = historica.fecha.split('-')[0]
      const nuevoNum = `${anioH}/${numero.split('/')[1]}`
      await sb.from('facturas').update({ numero: nuevoNum }).eq('id', historica.id)
      console.log(`  Renombrada: ${numero} (${anioH}) → ${nuevoNum}`)
    }
  }

  let ok = 0, sinCliente = 0, errores = 0
  const sinClienteLista: string[] = []

  for (const r of candidatas) {
    const numero = r['Invoice No.']
    const fecha = r['Created Date'] || new Date().toISOString().split('T')[0]
    const total = round2(parseFloat(r['Amount']) || 0)
    const subtotal = round2(parseFloat(r['Gross Amount']) || total)
    const ivaImporte = round2(parseFloat(r['Tax Amount']) || 0)
    const descuento = round2(parseFloat(r['Discount']) || 0)
    const baseImponible = round2(subtotal - descuento)
    const ivaPct = baseImponible > 0 ? round2((ivaImporte / baseImponible) * 100) : 21

    const clienteId = getClienteId(r['Organization Name'], r['Contact Person'], r['Shipping Address'])

    let clienteIdFinal = clienteId
    if (!clienteIdFinal) {
      // Crear cliente nuevo con los datos del CSV
      const nombre = (r['Organization Name'] || r['Contact Person'] || 'Sin nombre').trim()
      const telefono = (r['Shipping Address'] || '').replace(/[^\d+\s\-().]/g, '').trim().slice(0, 20) || null
      const email = (r['Shipping Address'] || '').includes('@') ? r['Shipping Address'].trim() : null
      const { data: newC, error: errC } = await sb.from('clientes').insert({
        nombre, telefono: telefono || null, email, activo: true,
      }).select('id').single()
      if (errC || !newC) {
        sinClienteLista.push(`${numero} — ${nombre}`)
        sinCliente++
        continue
      }
      byName.set(norm(nombre), newC.id)
      clienteIdFinal = newC.id
      console.log(`  ➕ Cliente creado: ${nombre}`)
    }

    const { data: newFact, error } = await sb.from('facturas').insert({
      numero,
      cliente_id: clienteIdFinal,
      fecha,
      estado: 'cobrada',
      subtotal: baseImponible,
      descuento: 0,
      base_imponible: baseImponible,
      iva_porcentaje: Math.round(ivaPct) || 21,
      iva_importe: ivaImporte,
      total,
      pagado: true,
    }).select('id').single()

    if (error || !newFact) {
      console.error(`  Error ${numero}: ${error?.message}`)
      errores++
      continue
    }

    // Línea única con la descripción disponible
    await sb.from('factura_items').insert({
      factura_id: newFact.id,
      orden: 1,
      descripcion: 'Trabajos realizados',
      cantidad: 1,
      unidad: 'ud',
      precio_unitario: baseImponible,
      descuento: 0,
      total: baseImponible,
    })

    ok++
    process.stdout.write(`  ${ok}/${candidatas.length} importadas...\r`)
  }

  console.log(`\n✅ Importadas: ${ok} | Sin cliente: ${sinCliente} | Errores: ${errores}`)
  if (sinClienteLista.length > 0) {
    console.log('\n⚠️  Sin cliente:')
    sinClienteLista.forEach(s => console.log('  ', s))
  }

  // Actualizar contador
  const { data: todasF } = await sb.from('facturas').select('numero, fecha')
  let max = 0
  for (const f of todasF ?? []) {
    if (!f.numero.startsWith('1/') || !f.fecha?.startsWith('2026')) continue
    const n = parseInt(f.numero.split('/')[1])
    if (!isNaN(n) && n > max) max = n
  }
  await sb.from('configuracion_empresa').update({ siguiente_num_factura: max + 1 }).neq('id', '00000000-0000-0000-0000-000000000000')
  console.log(`🔢 Próxima factura: 1/${max + 1}`)
}

main().catch(e => { console.error(e); process.exit(1) })

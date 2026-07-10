/**
 * Dedup seguro: solo elimina duplicados que NO tienen ningún documento vinculado
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data: clientes } = await sb.from('clientes').select('id, nombre, created_at').order('created_at')
  const { data: facturas } = await sb.from('facturas').select('cliente_id')
  const { data: presupuestos } = await sb.from('presupuestos').select('cliente_id')
  if (!clientes) return

  const conDocumentos = new Set([
    ...(facturas?.map(f => f.cliente_id) ?? []),
    ...(presupuestos?.map(p => p.cliente_id) ?? []),
  ])

  // Agrupar por nombre normalizado
  const grupos = new Map<string, typeof clientes>()
  for (const c of clientes) {
    const key = c.nombre.trim().toLowerCase()
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push(c)
  }

  // Solo eliminar los que no tienen documentos Y son duplicados
  const aEliminar: string[] = []
  for (const [, grupo] of grupos) {
    if (grupo.length === 1) continue
    for (const c of grupo) {
      if (!conDocumentos.has(c.id)) aEliminar.push(c.id)
    }
  }

  console.log(`Total clientes: ${clientes.length}`)
  console.log(`Sin documentos y duplicados (a eliminar): ${aEliminar.length}`)

  for (let i = 0; i < aEliminar.length; i += 100) {
    const batch = aEliminar.slice(i, i + 100)
    const { error } = await sb.from('clientes').delete().in('id', batch)
    if (error) console.error('Error:', error.message)
    else process.stdout.write(`  ${Math.min(i + 100, aEliminar.length)}/${aEliminar.length} eliminados...\r`)
  }

  const { data: final } = await sb.from('clientes').select('id')
  console.log(`\n✅ Clientes finales: ${final?.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })

/**
 * Dedup inteligente: para cada nombre duplicado, mantiene el que tiene
 * facturas/presupuestos vinculados. Si ninguno tiene, mantiene el más antiguo.
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data: clientes } = await sb.from('clientes').select('id, nombre, created_at').order('created_at')
  const { data: facturas } = await sb.from('facturas').select('cliente_id')
  const { data: presupuestos } = await sb.from('presupuestos').select('cliente_id')

  if (!clientes) return

  // IDs que tienen documentos vinculados
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

  const aEliminar: string[] = []
  let duplicados = 0

  for (const [, grupo] of grupos) {
    if (grupo.length === 1) continue
    duplicados++

    // Preferir el que tiene documentos; si hay empate, el más antiguo
    const conDocs = grupo.filter(c => conDocumentos.has(c.id))
    const mantener = conDocs.length > 0 ? conDocs[0] : grupo[0]

    for (const c of grupo) {
      if (c.id !== mantener.id) aEliminar.push(c.id)
    }
  }

  console.log(`Clientes totales: ${clientes.length}`)
  console.log(`Grupos duplicados: ${duplicados}`)
  console.log(`A eliminar: ${aEliminar.length}`)

  for (let i = 0; i < aEliminar.length; i += 50) {
    const batch = aEliminar.slice(i, i + 50)
    const { error } = await sb.from('clientes').delete().in('id', batch)
    if (error) console.error('Error lote:', error.message)
  }

  const { data: final } = await sb.from('clientes').select('id', { count: 'exact' })
  console.log(`✅ Clientes únicos finales: ${(final as any)?.length ?? '?'}`)
}

main().catch(e => { console.error(e); process.exit(1) })

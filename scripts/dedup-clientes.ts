/**
 * Elimina clientes duplicados — mantiene el más antiguo (created_at menor) de cada nombre duplicado
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data: clientes } = await sb.from('clientes').select('id, nombre, created_at').order('created_at')
  if (!clientes) return

  const vistos = new Map<string, string>() // nombre_norm → id del primero (más antiguo)
  const aEliminar: string[] = []

  for (const c of clientes) {
    const key = c.nombre.trim().toLowerCase()
    if (vistos.has(key)) {
      aEliminar.push(c.id) // duplicado más reciente → borrar
    } else {
      vistos.set(key, c.id)
    }
  }

  console.log(`Clientes totales: ${clientes.length}`)
  console.log(`Duplicados a eliminar: ${aEliminar.length}`)

  if (aEliminar.length === 0) { console.log('Sin duplicados.'); return }

  // Borrar en lotes
  for (let i = 0; i < aEliminar.length; i += 50) {
    const batch = aEliminar.slice(i, i + 50)
    const { error } = await sb.from('clientes').delete().in('id', batch)
    if (error) console.error('Error:', error.message)
  }

  console.log(`✅ ${aEliminar.length} duplicados eliminados. Clientes únicos: ${clientes.length - aEliminar.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })

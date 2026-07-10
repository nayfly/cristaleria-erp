/**
 * Renombra todas las facturas históricas (no 2026) con números 1/75 en adelante
 * que colisionarían con las nuevas facturas de 2026.
 * Las renombra a YYYY/N según su año real.
 */
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data: todas } = await sb.from('facturas').select('id, numero, fecha')
  if (!todas) return

  // Facturas no-2026 con número 1/N donde N >= 75 (rango que usará 2026)
  const aRenombrar = todas.filter(f => {
    if (!f.numero.startsWith('1/')) return false
    if (f.fecha?.startsWith('2026')) return false
    const n = parseInt(f.numero.split('/')[1])
    return !isNaN(n) && n >= 75
  })

  console.log(`Facturas históricas a renombrar: ${aRenombrar.length}`)
  aRenombrar.forEach(f => console.log(`  ${f.fecha} — ${f.numero}`))

  for (const f of aRenombrar) {
    const anio = f.fecha.split('-')[0]
    const nuevoNum = `${anio}/${f.numero.split('/')[1]}`
    const { error } = await sb.from('facturas').update({ numero: nuevoNum }).eq('id', f.id)
    if (error) console.error(`  Error ${f.numero}: ${error.message}`)
    else console.log(`  ✅ ${f.numero} (${anio}) → ${nuevoNum}`)
  }

  // Verificar que 1/75 ya no existe
  const { data: check } = await sb.from('facturas').select('id').eq('numero', '1/75')
  console.log(`\n¿Existe 1/75 ahora? ${check?.length ? 'SÍ (problema)' : 'NO ✅'}`)
  console.log('El contador ya está en 76, pero la próxima factura real es 1/75.')

  // Ajustar contador a 75
  await sb.from('configuracion_empresa')
    .update({ siguiente_num_factura: 75 })
    .neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('🔢 Contador ajustado a 75 → próxima factura: 1/75')
}

main().catch(e => { console.error(e); process.exit(1) })

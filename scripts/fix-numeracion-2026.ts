/**
 * Arregla numeración anual:
 * 1. Las facturas 2026 están como "2026/N" → vuelven a "1/N"
 * 2. Las históricas que colisionan con 2026 se renombran a "YYYY/N"
 * Mismo para presupuestos.
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function yearOf(fecha: string) { return fecha.split('-')[0] }

async function fixFacturas() {
  const { data: all } = await sb.from('facturas').select('id, numero, fecha')
  if (!all) return

  // Números que tienen versión 2026/N en la BD
  const nums2026 = all.filter(f => f.numero.startsWith('2026/')).map(f => f.numero.replace('2026/', '1/'))
  console.log(`Facturas 2026 a renombrar: ${nums2026.length}`)

  for (const f of all) {
    if (f.numero.startsWith('2026/')) {
      // Paso 1: renombrar las históricas que colisionan primero
      const numOriginal = f.numero.replace('2026/', '1/')
      const historica = all.find(h => h.numero === numOriginal)
      if (historica) {
        const anio = yearOf(historica.fecha)
        const nuevoNumHistorica = `${anio}/${numOriginal.split('/')[1]}`
        await sb.from('facturas').update({ numero: nuevoNumHistorica }).eq('id', historica.id)
        console.log(`  Historica: ${numOriginal} (${anio}) → ${nuevoNumHistorica}`)
      }
      // Paso 2: renombrar la de 2026 a su número correcto
      const nuevoNum = f.numero.replace('2026/', '1/')
      await sb.from('facturas').update({ numero: nuevoNum }).eq('id', f.id)
      console.log(`  2026: ${f.numero} → ${nuevoNum}`)
    }
  }
  console.log('✅ Facturas arregladas')
}

async function fixPresupuestos() {
  const { data: all } = await sb.from('presupuestos').select('id, numero, fecha')
  if (!all) return

  const nums2026 = all.filter(p => p.numero.startsWith('2026/')).map(p => p.numero)
  if (nums2026.length === 0) { console.log('Sin presupuestos 2026 a renombrar'); return }

  for (const p of all) {
    if (p.numero.startsWith('2026/')) {
      const numOriginal = p.numero.replace('2026/', '1/')
      const historico = all.find(h => h.numero === numOriginal)
      if (historico) {
        const anio = yearOf(historico.fecha)
        await sb.from('presupuestos').update({ numero: `${anio}/${numOriginal.split('/')[1]}` }).eq('id', historico.id)
      }
      await sb.from('presupuestos').update({ numero: numOriginal }).eq('id', p.id)
    }
  }
  console.log('✅ Presupuestos arreglados')
}

async function main() {
  await fixFacturas()
  await fixPresupuestos()

  // Verificar resultado
  const { data: f } = await sb.from('facturas').select('numero, fecha').order('fecha')
  console.log('\nEjemplos facturas finales:')
  f?.slice(-10).forEach(x => console.log(`  ${x.fecha} — ${x.numero}`))
}

main().catch(e => { console.error(e); process.exit(1) })

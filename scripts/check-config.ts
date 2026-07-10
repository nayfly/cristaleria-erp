import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data: config } = await sb.from('configuracion_empresa').select('siguiente_num_factura, siguiente_num_presupuesto, serie_facturas, serie_presupuestos').single()
  console.log('Config numeración:', config)

  const { data: f75 } = await sb.from('facturas').select('id, numero, fecha').eq('numero', '1/75')
  console.log('¿Existe 1/75?', f75)

  // Últimas 5 facturas
  const { data: ultimas } = await sb.from('facturas').select('numero, fecha').order('fecha', { ascending: false }).limit(5)
  console.log('Últimas facturas:', ultimas)
}
main()

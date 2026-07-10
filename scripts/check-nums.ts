import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data } = await sb.from('facturas').select('numero, fecha').order('fecha', { ascending: false }).limit(40)
  data?.forEach(f => console.log(f.fecha, f.numero))
}
main()

import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data, error } = await sb
    .from('facturas')
    .update({ pagado: true, estado: 'cobrada' })
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('id')

  if (error) { console.error(error.message); process.exit(1) }
  console.log(`✅ Facturas marcadas como cobradas: ${data.length}`)
}

main()

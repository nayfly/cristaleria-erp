import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data: facturas } = await sb.from('facturas').select('numero')
  const { data: presupuestos } = await sb.from('presupuestos').select('numero')
  const { data: clientes } = await sb.from('clientes').select('nombre, telefono')

  const result = {
    facturas: facturas?.map(f => f.numero) ?? [],
    presupuestos: presupuestos?.map(p => p.numero) ?? [],
    clientes: clientes?.map(c => ({ nombre: c.nombre, telefono: c.telefono })) ?? [],
  }

  fs.writeFileSync('C:/Users/rober/AppData/Local/Temp/existing.json', JSON.stringify(result))
  console.log(`Facturas: ${result.facturas.length} | Presupuestos: ${result.presupuestos.length} | Clientes: ${result.clientes.length}`)
}

main()

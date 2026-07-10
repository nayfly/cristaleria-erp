import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { error } = await supabase.rpc('exec_sql' as any, {
    sql: `ALTER TABLE facturas ADD COLUMN IF NOT EXISTS condiciones TEXT;
          ALTER TABLE configuracion_empresa ADD COLUMN IF NOT EXISTS condiciones_factura_default TEXT;`
  })

  if (error) {
    console.error('Error:', error.message)
    // Intentar directamente
    console.log('Intenta ejecutar esto en el SQL Editor de Supabase:')
    console.log('ALTER TABLE facturas ADD COLUMN IF NOT EXISTS condiciones TEXT;')
    console.log('ALTER TABLE configuracion_empresa ADD COLUMN IF NOT EXISTS condiciones_factura_default TEXT;')
  } else {
    console.log('✅ Columnas añadidas correctamente')
  }
}

main()

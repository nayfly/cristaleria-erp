import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const admin = createAdminClient()
  const { data: factura } = await admin
    .from('facturas')
    .select('numero, total, fecha, cliente:clientes(nombre, empresa)')
    .eq('id', params.id)
    .single()

  if (!factura) return { title: 'Factura' }

  const cliente = (factura.cliente as any)
  const nombreCliente = cliente?.empresa ?? cliente?.nombre ?? ''
  const title = `Factura ${factura.numero} — Cristalería Torrox Costa`
  const description = nombreCliente
    ? `Factura para ${nombreCliente} — ${Number(factura.total).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`
    : `Factura ${factura.numero} — ${Number(factura.total).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
  }
}

export default async function VerFacturaPage({ params }: Props) {
  const admin = createAdminClient()
  const { data: factura } = await admin
    .from('facturas')
    .select('numero, total, fecha, cliente:clientes(nombre, empresa)')
    .eq('id', params.id)
    .single()

  if (!factura) notFound()

  const cliente = (factura as any).cliente
  const nombreCliente = cliente?.empresa ?? cliente?.nombre ?? ''
  const pdfUrl = `/api/ver/factura/${params.id}`

  return (
    <div style={{ margin: 0, padding: 0, background: '#f1f5f9', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Cabecera */}
      <div style={{ background: '#1e40af', color: 'white', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Factura {factura.numero}</div>
          {nombreCliente && <div style={{ fontSize: 12, opacity: 0.85 }}>{nombreCliente}</div>}
        </div>
        <a
          href={pdfUrl}
          download={`Factura-${factura.numero}.pdf`}
          style={{
            background: 'white', color: '#1e40af', padding: '6px 14px',
            borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
          }}
        >
          Descargar
        </a>
      </div>

      {/* PDF embebido */}
      <iframe
        src={pdfUrl}
        style={{ width: '100%', height: 'calc(100vh - 52px)', border: 'none', display: 'block' }}
        title={`Factura ${factura.numero}`}
      />
    </div>
  )
}

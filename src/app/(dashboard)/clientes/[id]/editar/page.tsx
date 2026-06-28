import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ClienteForm } from '@/components/clientes/cliente-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('clientes').select('nombre').eq('id', id).single()
  const nombre = (data as { nombre?: string } | null)?.nombre
  return { title: `Editar — ${nombre ?? 'Cliente'}` }
}

export default async function EditarClientePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: clienteRaw, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !clienteRaw) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cliente = clienteRaw as any

  return (
    <div className="space-y-5 fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href={`/clientes/${id}`}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Editar cliente</h1>
          <p className="text-sm text-slate-500 mt-0.5">{cliente.nombre}</p>
        </div>
      </div>

      <ClienteForm cliente={cliente} />
    </div>
  )
}

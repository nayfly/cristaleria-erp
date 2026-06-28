import { ClienteForm } from '@/components/clientes/cliente-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nuevo cliente',
}

export default function NuevoClientePage() {
  return (
    <div className="space-y-5 fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/clientes"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Nuevo cliente</h1>
          <p className="text-sm text-slate-500 mt-0.5">Rellena los datos del cliente</p>
        </div>
      </div>

      <ClienteForm />
    </div>
  )
}

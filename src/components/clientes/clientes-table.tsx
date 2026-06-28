'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Phone, Mail, ChevronRight, Building2 } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { iniciales, truncate } from '@/lib/utils'
import type { Cliente } from '@/types'

interface ClientesTableProps {
  clientes: Cliente[]
  busquedaInicial?: string
}

export function ClientesTable({ clientes, busquedaInicial = '' }: ClientesTableProps) {
  const [busqueda, setBusqueda] = useState(busquedaInicial)
  const router = useRouter()

  const filtrados = useMemo(() => {
    if (!busqueda) return clientes
    const q = busqueda.toLowerCase()
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.empresa?.toLowerCase().includes(q) ||
        c.telefono?.includes(q) ||
        c.dni_cif?.includes(q) ||
        c.email?.toLowerCase().includes(q)
    )
  }, [clientes, busqueda])

  return (
    <div className="space-y-3">
      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          placeholder="Buscar por nombre, empresa, teléfono o DNI/CIF..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder:text-slate-400"
        />
      </div>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        busqueda ? (
          <div className="bg-white rounded-xl border border-slate-200 py-12 text-center">
            <p className="text-sm text-slate-500">Sin resultados para &quot;{busqueda}&quot;</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200">
            <EmptyState
              icon={Building2}
              title="Aún no hay clientes"
              description="Crea tu primer cliente para empezar a gestionar presupuestos y facturas"
              actionLabel="Nuevo cliente"
              actionHref="/clientes/nuevo"
            />
          </div>
        )
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Header tabla */}
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_40px] gap-4 px-5 py-3
                          border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Empresa</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Teléfono</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</span>
            <span />
          </div>

          <div className="divide-y divide-slate-100">
            {filtrados.map((cliente) => (
              <Link
                key={cliente.id}
                href={`/clientes/${cliente.id}`}
                className="flex md:grid md:grid-cols-[2fr_1.5fr_1fr_1fr_40px] gap-4 items-center
                           px-5 py-4 hover:bg-slate-50 transition-colors group"
              >
                {/* Nombre + avatar */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center
                                  text-blue-700 text-xs font-bold flex-shrink-0">
                    {iniciales(cliente.nombre)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{cliente.nombre}</p>
                    {cliente.dni_cif && (
                      <p className="text-xs text-slate-400">{cliente.dni_cif}</p>
                    )}
                  </div>
                </div>

                {/* Empresa */}
                <div className="hidden md:block min-w-0">
                  {cliente.empresa ? (
                    <span className="text-sm text-slate-600 truncate block">
                      {truncate(cliente.empresa, 30)}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-300">—</span>
                  )}
                </div>

                {/* Teléfono */}
                <div className="hidden md:block">
                  {cliente.telefono ? (
                    <a
                      href={`tel:${cliente.telefono}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-sm text-slate-600
                                 hover:text-blue-600 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      {cliente.telefono}
                    </a>
                  ) : (
                    <span className="text-sm text-slate-300">—</span>
                  )}
                </div>

                {/* Email */}
                <div className="hidden md:block min-w-0">
                  {cliente.email ? (
                    <a
                      href={`mailto:${cliente.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-sm text-slate-600
                                 hover:text-blue-600 transition-colors truncate"
                    >
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{cliente.email}</span>
                    </a>
                  ) : (
                    <span className="text-sm text-slate-300">—</span>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-end">
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>

          {/* Footer con conteo */}
          {busqueda && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500">
                {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''} para &quot;{busqueda}&quot;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

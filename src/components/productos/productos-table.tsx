'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Package, Pencil } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Producto } from '@/types'

interface ProductosTableProps {
  productos: Producto[]
  busquedaInicial?: string
}

export function ProductosTable({ productos, busquedaInicial = '' }: ProductosTableProps) {
  const [busqueda, setBusqueda] = useState(busquedaInicial)

  const filtrados = productos.filter((p) => {
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase()
    return (
      p.nombre.toLowerCase().includes(q) ||
      (p.referencia ?? '').toLowerCase().includes(q) ||
      (p.descripcion ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, referencia..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="campo pl-9"
        />
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtrados.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              {busqueda ? 'No se encontraron productos' : 'No hay productos aún'}
            </p>
          </div>
        ) : (
          <>
            {/* Cabecera — solo desktop */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_100px_80px_80px_48px] gap-4
                            px-5 py-3 border-b border-slate-100
                            text-xs font-semibold text-slate-400 uppercase tracking-wide">
              <span>Producto</span>
              <span>Referencia</span>
              <span className="text-right">Precio s/IVA</span>
              <span className="text-center">IVA</span>
              <span>Unidad</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100">
              {filtrados.map((producto) => (
                <div key={producto.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_100px_80px_80px_48px]
                                                  gap-2 md:gap-4 px-5 py-4 items-center
                                                  hover:bg-slate-50 transition-colors group">
                  {/* Nombre + descripción */}
                  <div className="min-w-0">
                    <Link href={`/productos/${producto.id}`} className="block">
                      <p className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {producto.nombre}
                      </p>
                      {producto.descripcion && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{producto.descripcion}</p>
                      )}
                    </Link>
                  </div>

                  {/* Referencia */}
                  <div className="hidden md:block">
                    <span className="text-sm text-slate-500 font-mono">
                      {producto.referencia ?? '—'}
                    </span>
                  </div>

                  {/* Precio */}
                  <div className="flex md:justify-end items-center gap-2">
                    <span className="text-xs text-slate-400 md:hidden">Precio:</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatCurrency(producto.precio_base)}
                    </span>
                  </div>

                  {/* IVA */}
                  <div className="flex md:justify-center items-center gap-2">
                    <span className="text-xs text-slate-400 md:hidden">IVA:</span>
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      {producto.tipo_iva}%
                    </span>
                  </div>

                  {/* Unidad */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 md:hidden">Unidad:</span>
                    <span className="text-sm text-slate-500">{producto.unidad}</span>
                  </div>

                  {/* Editar */}
                  <div className="flex justify-end">
                    <Link
                      href={`/productos/${producto.id}/editar`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600
                                 hover:bg-blue-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

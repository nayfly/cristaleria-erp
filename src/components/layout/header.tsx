'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, LogOut, User } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { ResultadoBusqueda } from '@/types'

interface HeaderProps {
  user: SupabaseUser
}

export function Header({ user }: HeaderProps) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusqueda | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const router = useRouter()
  const supabase = createClient()

  // Búsqueda con debounce
  useEffect(() => {
    if (!query || query.length < 2) {
      setResultados(null)
      return
    }

    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const q = query.trim()

        const [{ data: clientes }, { data: facturas }, { data: presupuestos }] =
          await Promise.all([
            supabase
              .from('clientes')
              .select('id, nombre, empresa, telefono')
              .or(`nombre.ilike.%${q}%,empresa.ilike.%${q}%,telefono.ilike.%${q}%,dni_cif.ilike.%${q}%`)
              .eq('activo', true)
              .limit(4),
            supabase
              .from('facturas')
              .select('id, numero, total, estado')
              .ilike('numero', `%${q}%`)
              .limit(4),
            supabase
              .from('presupuestos')
              .select('id, numero, total, estado')
              .ilike('numero', `%${q}%`)
              .limit(4),
          ])

        setResultados({
          clientes: clientes || [],
          facturas: facturas || [],
          presupuestos: presupuestos || [],
        })
      } finally {
        setBuscando(false)
      }
    }, 300)

    return () => clearTimeout(timeoutRef.current)
  }, [query])

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const tieneResultados =
    resultados &&
    (resultados.clientes.length + resultados.facturas.length + resultados.presupuestos.length) > 0

  return (
    <header className="h-[60px] bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0">
      {/* Buscador */}
      <div className="relative flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar cliente, factura, presupuesto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => setTimeout(() => setQuery(''), 200)}
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-slate-200 text-sm
                       bg-slate-50 focus:bg-white focus:outline-none focus:ring-2
                       focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
          />
        </div>

        {/* Resultados */}
        {query.length >= 2 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200
                          rounded-xl shadow-lg z-50 overflow-hidden">
            {buscando && (
              <div className="px-4 py-3 text-sm text-slate-500">Buscando...</div>
            )}

            {!buscando && !tieneResultados && (
              <div className="px-4 py-3 text-sm text-slate-500">
                Sin resultados para &quot;{query}&quot;
              </div>
            )}

            {!buscando && tieneResultados && (
              <div className="py-1 max-h-80 overflow-y-auto scrollbar-thin">
                {/* Clientes */}
                {resultados!.clientes.length > 0 && (
                  <div>
                    <p className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Clientes
                    </p>
                    {resultados!.clientes.map((c) => (
                      <button
                        key={c.id}
                        onMouseDown={() => router.push(`/clientes/${c.id}`)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors"
                      >
                        <p className="text-sm font-medium text-slate-900">{c.nombre}</p>
                        {c.empresa && <p className="text-xs text-slate-500">{c.empresa}</p>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Facturas */}
                {resultados!.facturas.length > 0 && (
                  <div>
                    <p className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Facturas
                    </p>
                    {resultados!.facturas.map((f) => (
                      <button
                        key={f.id}
                        onMouseDown={() => router.push(`/facturas/${f.id}`)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-slate-900">{f.numero}</span>
                        <span className="text-sm text-slate-500">{formatCurrency(f.total)}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Presupuestos */}
                {resultados!.presupuestos.length > 0 && (
                  <div>
                    <p className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Presupuestos
                    </p>
                    {resultados!.presupuestos.map((p) => (
                      <button
                        key={p.id}
                        onMouseDown={() => router.push(`/presupuestos/${p.id}`)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-slate-900">{p.numero}</span>
                        <span className="text-sm text-slate-500">{formatCurrency(p.total)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Menú usuario */}
      <div className="relative">
        <button
          onClick={() => setMenuAbierto(!menuAbierto)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50
                     text-sm text-slate-700 transition-colors"
        >
          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <span className="hidden sm:block max-w-[140px] truncate">
            {user.email}
          </span>
        </button>

        {menuAbierto && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuAbierto(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200
                            rounded-xl shadow-lg z-50 overflow-hidden py-1">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <button
                onClick={cerrarSesion}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600
                           hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

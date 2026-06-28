'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, LogOut, User, X, Receipt } from 'lucide-react'
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
  const [busquedaAbierta, setBusquedaAbierta] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (busquedaAbierta) setTimeout(() => inputRef.current?.focus(), 100)
  }, [busquedaAbierta])

  useEffect(() => {
    if (!query || query.length < 2) { setResultados(null); return }
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const q = query.trim()
        const [{ data: clientes }, { data: facturas }, { data: presupuestos }] = await Promise.all([
          supabase.from('clientes').select('id, nombre, empresa, telefono')
            .or(`nombre.ilike.%${q}%,empresa.ilike.%${q}%,telefono.ilike.%${q}%,dni_cif.ilike.%${q}%`)
            .eq('activo', true).limit(4),
          supabase.from('facturas').select('id, numero, total, estado').ilike('numero', `%${q}%`).limit(4),
          supabase.from('presupuestos').select('id, numero, total, estado').ilike('numero', `%${q}%`).limit(4),
        ])
        setResultados({ clientes: clientes || [], facturas: facturas || [], presupuestos: presupuestos || [] })
      } finally { setBuscando(false) }
    }, 300)
    return () => clearTimeout(timeoutRef.current)
  }, [query])

  function navegar(href: string) {
    setBusquedaAbierta(false)
    setQuery('')
    router.push(href)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const tieneResultados = resultados &&
    (resultados.clientes.length + resultados.facturas.length + resultados.presupuestos.length) > 0

  return (
    <>
      <header className="h-[56px] md:h-[60px] bg-white border-b border-slate-200 flex items-center px-4 md:px-6 gap-3 flex-shrink-0">

        {/* Logo solo en móvil (en desktop lo muestra el sidebar) */}
        <div className="flex md:hidden items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <Receipt className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900 text-sm">Cristalería</span>
        </div>

        <div className="flex-1" />

        {/* Buscador en escritorio */}
        <div className="hidden md:block relative flex-1 max-w-md">
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
          {query.length >= 2 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200
                            rounded-xl shadow-lg z-50 overflow-hidden">
              {buscando && <div className="px-4 py-3 text-sm text-slate-500">Buscando...</div>}
              {!buscando && !tieneResultados && (
                <div className="px-4 py-3 text-sm text-slate-500">Sin resultados para &quot;{query}&quot;</div>
              )}
              {!buscando && tieneResultados && (
                <div className="py-1 max-h-80 overflow-y-auto">
                  {resultados!.clientes.length > 0 && (
                    <div>
                      <p className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase">Clientes</p>
                      {resultados!.clientes.map((c) => (
                        <button key={c.id} onMouseDown={() => navegar(`/clientes/${c.id}`)}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50">
                          <p className="text-sm font-medium text-slate-900">{c.nombre}</p>
                          {c.empresa && <p className="text-xs text-slate-500">{c.empresa}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                  {resultados!.facturas.length > 0 && (
                    <div>
                      <p className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase">Facturas</p>
                      {resultados!.facturas.map((f) => (
                        <button key={f.id} onMouseDown={() => navegar(`/facturas/${f.id}`)}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between">
                          <span className="text-sm font-medium">{f.numero}</span>
                          <span className="text-sm text-slate-500">{formatCurrency(f.total)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {resultados!.presupuestos.length > 0 && (
                    <div>
                      <p className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase">Presupuestos</p>
                      {resultados!.presupuestos.map((p) => (
                        <button key={p.id} onMouseDown={() => navegar(`/presupuestos/${p.id}`)}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between">
                          <span className="text-sm font-medium">{p.numero}</span>
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

        <div className="hidden md:block flex-1" />

        {/* Botón búsqueda en móvil */}
        <button
          className="md:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          onClick={() => setBusquedaAbierta(true)}
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Menú usuario */}
        <div className="relative">
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
          </button>

          {menuAbierto && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuAbierto(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200
                              rounded-xl shadow-lg z-50 overflow-hidden py-1">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <button
                  onClick={cerrarSesion}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600
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

      {/* Panel de búsqueda móvil (overlay) */}
      {busquedaAbierta && (
        <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                type="search"
                placeholder="Buscar..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 text-sm
                           bg-slate-50 focus:bg-white focus:outline-none focus:ring-2
                           focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => { setBusquedaAbierta(false); setQuery('') }}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {query.length < 2 && (
              <p className="text-sm text-slate-400 text-center mt-8 px-4">
                Escribe al menos 2 caracteres para buscar
              </p>
            )}
            {buscando && <div className="px-4 py-4 text-sm text-slate-500 text-center">Buscando...</div>}
            {!buscando && query.length >= 2 && !tieneResultados && (
              <div className="px-4 py-4 text-sm text-slate-500 text-center">
                Sin resultados para &quot;{query}&quot;
              </div>
            )}
            {!buscando && tieneResultados && (
              <div className="py-2">
                {resultados!.clientes.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Clientes</p>
                    {resultados!.clientes.map((c) => (
                      <button key={c.id} onClick={() => navegar(`/clientes/${c.id}`)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-900">{c.nombre}</p>
                        {c.empresa && <p className="text-xs text-slate-500">{c.empresa}</p>}
                      </button>
                    ))}
                  </div>
                )}
                {resultados!.facturas.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Facturas</p>
                    {resultados!.facturas.map((f) => (
                      <button key={f.id} onClick={() => navegar(`/facturas/${f.id}`)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-medium">{f.numero}</span>
                        <span className="text-sm text-slate-500">{formatCurrency(f.total)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {resultados!.presupuestos.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Presupuestos</p>
                    {resultados!.presupuestos.map((p) => (
                      <button key={p.id} onClick={() => navegar(`/presupuestos/${p.id}`)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-medium">{p.numero}</span>
                        <span className="text-sm text-slate-500">{formatCurrency(p.total)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

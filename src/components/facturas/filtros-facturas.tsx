'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { RefreshCw, FolderUp } from 'lucide-react'
import Link from 'next/link'

interface FiltrosFacturasProps {
  años: number[]
  driveConectado: boolean
}

export function FiltrosFacturas({ años, driveConectado }: FiltrosFacturasProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sincronizando, setSincronizando] = useState(false)
  const [, startTransition] = useTransition()

  const estadoActivo = searchParams.get('pagado') === 'false'
    ? 'pendiente'
    : (searchParams.get('estado') ?? 'todos')
  const añoActivo = searchParams.get('año') ?? ''
  const desdeNum = searchParams.get('desde') ?? ''
  const hastaNum = searchParams.get('hasta') ?? ''

  const filtros = [
    { value: 'todos', label: 'Todas', href: buildHref({ estado: undefined, pagado: undefined }) },
    { value: 'pendiente', label: 'Pendientes', href: buildHref({ pagado: 'false' }) },
    { value: 'emitida', label: 'Emitidas', href: buildHref({ estado: 'emitida' }) },
    { value: 'cobrada', label: 'Cobradas', href: buildHref({ estado: 'cobrada' }) },
    { value: 'anulada', label: 'Anuladas', href: buildHref({ estado: 'anulada' }) },
  ]

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const base: Record<string, string | undefined> = {
      año: añoActivo || undefined,
      desde: desdeNum || undefined,
      hasta: hastaNum || undefined,
    }
    const merged = { ...base, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v)
    }
    const qs = params.toString()
    return `/facturas${qs ? `?${qs}` : ''}`
  }

  function onAñoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) params.set('año', e.target.value)
    else params.delete('año')
    router.push(`/facturas?${params.toString()}`)
  }

  function onRangoChange(campo: 'desde' | 'hasta', valor: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (valor) params.set(campo, valor)
    else params.delete(campo)
    router.push(`/facturas?${params.toString()}`)
  }

  async function sincronizarDrive() {
    setSincronizando(true)
    const toastId = toast.loading('Sincronizando con Google Drive...')
    try {
      const res = await fetch('/api/drive/sync', { method: 'POST' })
      const json = await res.json()
      toast.dismiss(toastId)
      if (!res.ok) {
        if (json.error === 'TOKEN_EXPIRADO') {
          toast.error('La conexión con Drive ha expirado. Ve a Configuración y vuelve a conectarlo.', { duration: 8000 })
        } else {
          toast.error('Error al sincronizar con Drive')
        }
        return
      }
      if (json.subidas === 0) {
        toast.success(`Drive ya está al día — ${json.total} factura${json.total !== 1 ? 's' : ''} del año revisada${json.total !== 1 ? 's' : ''}`)
      } else {
        toast.success(`${json.subidas} factura${json.subidas !== 1 ? 's' : ''} subida${json.subidas !== 1 ? 's' : ''} a Drive correctamente`)
      }
      startTransition(() => router.refresh())
    } catch {
      toast.dismiss(toastId)
      toast.error('Error al sincronizar con Drive')
    } finally {
      setSincronizando(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Filtros de estado */}
      <div className="flex gap-1.5 flex-wrap items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {filtros.map((f) => (
            <Link
              key={f.value}
              href={f.href}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                estadoActivo === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Botón sincronizar Drive */}
        {driveConectado && (
          <button
            onClick={sincronizarDrive}
            disabled={sincronizando}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600
                       bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors
                       disabled:opacity-50 disabled:cursor-wait"
            title="Sincronizar facturas del año actual con Google Drive"
          >
            {sincronizando
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : <FolderUp className="w-3.5 h-3.5 text-yellow-500" />
            }
            Sync Drive
          </button>
        )}
      </div>

      {/* Filtros adicionales */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Año */}
        <select
          value={añoActivo}
          onChange={onAñoChange}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los años</option>
          {años.map((a) => (
            <option key={a} value={String(a)}>{a}</option>
          ))}
        </select>

        {/* Rango de número */}
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            placeholder="Desde nº"
            value={desdeNum}
            onChange={(e) => onRangoChange('desde', e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600
                       w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-400">–</span>
          <input
            type="number"
            placeholder="Hasta nº"
            value={hastaNum}
            onChange={(e) => onRangoChange('hasta', e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600
                       w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Limpiar filtros adicionales */}
        {(añoActivo || desdeNum || hastaNum) && (
          <Link
            href={buildHref({ año: undefined, desde: undefined, hasta: undefined })}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Limpiar filtros
          </Link>
        )}
      </div>
    </div>
  )
}

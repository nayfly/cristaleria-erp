'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { HardDrive, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface GoogleDriveCardProps {
  conectado: boolean
}

export function GoogleDriveCard({ conectado: conectadoInicial }: GoogleDriveCardProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [conectado, setConectado] = useState(conectadoInicial)
  const [desconectando, setDesconectando] = useState(false)

  useEffect(() => {
    const drive = searchParams.get('drive')
    if (drive === 'ok') {
      toast.success('Google Drive conectado correctamente')
      setConectado(true)
      router.replace('/configuracion')
    } else if (drive === 'error') {
      toast.error('Error al conectar Google Drive. Inténtalo de nuevo.')
      router.replace('/configuracion')
    } else if (drive === 'no_refresh_token') {
      toast.error('No se obtuvo el token. Asegúrate de marcar "Acceso sin conexión" y vuelve a intentarlo.')
      router.replace('/configuracion')
    }
  }, [searchParams, router])

  async function desconectar() {
    setDesconectando(true)
    try {
      await fetch('/api/auth/google/disconnect', { method: 'POST' })
      setConectado(false)
      toast.success('Google Drive desconectado')
    } catch {
      toast.error('Error al desconectar')
    } finally {
      setDesconectando(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <HardDrive className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Google Drive</h2>
          <p className="text-xs text-slate-500">
            Guarda automáticamente facturas y presupuestos en tu Drive
          </p>
        </div>
      </div>

      {conectado ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50
                          rounded-lg px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Conectado — los PDFs se guardarán en <strong>CristaleriaERP/</strong></span>
          </div>
          <button
            onClick={desconectar}
            disabled={desconectando}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-600
                       transition-colors disabled:opacity-50"
          >
            {desconectando
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <XCircle className="w-3.5 h-3.5" />
            }
            Desconectar Drive
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50
                          rounded-lg px-3 py-2.5">
            <XCircle className="w-4 h-4 flex-shrink-0 text-slate-400" />
            <span>No conectado</span>
          </div>
          <a
            href="/api/auth/google"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                       text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <HardDrive className="w-4 h-4" />
            Conectar Google Drive
          </a>
        </div>
      )}
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronDown, Download, MessageCircle, Mail, FolderUp } from 'lucide-react'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import type { Presupuesto } from '@/types'

interface AccionesPresupuestoProps {
  presupuesto: Presupuesto & { cliente?: { nombre: string; empresa?: string; telefono?: string; email?: string } }
}

export function AccionesPresupuesto({ presupuesto }: AccionesPresupuestoProps) {
  const router = useRouter()
  const supabase = createClient()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)

  const cliente = (presupuesto as any).cliente

  async function cambiarEstado(nuevoEstado: string) {
    const { error } = await supabase.from('presupuestos').update({ estado: nuevoEstado }).eq('id', presupuesto.id)
    if (error) { toast.error('Error al actualizar el estado'); return }
    toast.success(`Presupuesto marcado como ${nuevoEstado}`)
    router.refresh()
  }

  async function convertirAFactura() {
    const { data, error } = await supabase
      .rpc('convertir_presupuesto_a_factura', { p_presupuesto_id: presupuesto.id })
    if (error || !data) { toast.error('Error al convertir en factura'); return }
    toast.success('Factura creada correctamente')
    router.push(`/facturas/${data}`)
  }

  async function descargarPDF() {
    setMenuAbierto(false)
    setCargando(true)
    const toastId = toast.loading('Generando PDF...')
    try {
      const res = await fetch('/api/pdf/presupuesto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presupuestoId: presupuesto.id }),
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${presupuesto.numero}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.dismiss(toastId)
      toast.success('PDF descargado')
    } catch {
      toast.dismiss(toastId)
      toast.error('Error al generar el PDF')
    } finally {
      setCargando(false)
    }
  }

  async function guardarEnDrive() {
    setMenuAbierto(false)
    setCargando(true)
    const toastId = toast.loading('Subiendo a Google Drive...')
    try {
      const res = await fetch('/api/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'presupuesto', id: presupuesto.id }),
      })
      const json = await res.json().catch(() => ({}))
      toast.dismiss(toastId)
      if (!res.ok) {
        if (json.error === 'TOKEN_EXPIRADO') {
          toast.error('La conexión con Google Drive ha expirado. Ve a Configuración > Google Drive y vuelve a conectarlo.', { duration: 8000 })
        } else {
          toast.error('Error al subir a Google Drive')
        }
        return
      }
      toast.success('Presupuesto guardado en Google Drive')
    } catch {
      toast.dismiss(toastId)
      toast.error('Error al subir a Google Drive')
    } finally {
      setCargando(false)
    }
  }

  async function obtenerURLPublica(): Promise<string | null> {
    const res = await fetch(`/api/pdf/presupuesto?id=${presupuesto.id}`)
    if (!res.ok) return null
    const json = await res.json()
    return json.url ?? null
  }

  async function compartirPorWhatsApp() {
    setMenuAbierto(false)
    setCargando(true)
    const toastId = toast.loading('Generando PDF...')
    try {
      const url = await obtenerURLPublica()
      if (!url) throw new Error()

      toast.dismiss(toastId)

      const nombreCliente = cliente?.empresa ?? cliente?.nombre ?? ''
      const mensaje = encodeURIComponent(
        `Hola${nombreCliente ? ` ${nombreCliente}` : ''},\n\nLe adjunto el presupuesto *${presupuesto.numero}* por importe de *${formatCurrency(presupuesto.total)}*.\n\n📄 Descargar PDF: ${url}\n\nQuedamos a su disposición para cualquier consulta.`
      )

      const telefono = cliente?.telefono?.replace(/\D/g, '')
      const waUrl = telefono
        ? `https://wa.me/${telefono.startsWith('34') ? telefono : '34' + telefono}?text=${mensaje}`
        : `https://wa.me/?text=${mensaje}`

      window.open(waUrl, '_blank')
    } catch {
      toast.dismiss(toastId)
      toast.error('Error al generar el PDF')
    } finally {
      setCargando(false)
    }
  }

  async function compartirPorEmail() {
    setMenuAbierto(false)
    setCargando(true)
    const toastId = toast.loading('Generando PDF...')
    try {
      const url = await obtenerURLPublica()
      if (!url) throw new Error()

      toast.dismiss(toastId)

      const nombreCliente = cliente?.empresa ?? cliente?.nombre ?? ''
      const asunto = encodeURIComponent(`Presupuesto ${presupuesto.numero}`)
      const cuerpo = encodeURIComponent(
        `Estimado/a ${nombreCliente},\n\nLe enviamos el presupuesto ${presupuesto.numero} por importe de ${formatCurrency(presupuesto.total)}.\n\nPuede descargarlo aquí:\n${url}\n\nQuedamos a su disposición para cualquier consulta.\n\nUn saludo.`
      )
      const emailCliente = cliente?.email ?? ''

      window.location.href = `mailto:${emailCliente}?subject=${asunto}&body=${cuerpo}`
    } catch {
      toast.dismiss(toastId)
      toast.error('Error al generar el PDF')
    } finally {
      setCargando(false)
    }
  }

  const acciones: Array<{
    label: string
    icono?: React.ReactNode
    onClick: () => void
    danger?: boolean
    highlight?: boolean
    separador?: boolean
  }> = []

  if (presupuesto.estado === 'borrador') {
    acciones.push({ label: 'Marcar como enviado', onClick: () => cambiarEstado('enviado') })
  }
  if (presupuesto.estado === 'enviado') {
    acciones.push({ label: 'Marcar como aceptado', onClick: () => cambiarEstado('aceptado') })
    acciones.push({ label: 'Marcar como rechazado', onClick: () => cambiarEstado('rechazado'), danger: true })
  }
  if (presupuesto.estado === 'aceptado') {
    acciones.push({ label: '✓ Convertir en factura', onClick: convertirAFactura, highlight: true })
  }

  acciones.push({ label: 'Descargar PDF', icono: <Download className="w-3.5 h-3.5" />, onClick: descargarPDF, separador: true })
  acciones.push({ label: 'Enviar por WhatsApp', icono: <MessageCircle className="w-3.5 h-3.5 text-green-600" />, onClick: compartirPorWhatsApp })
  acciones.push({ label: 'Enviar por email', icono: <Mail className="w-3.5 h-3.5 text-blue-500" />, onClick: compartirPorEmail })
  acciones.push({ label: 'Guardar en Drive', icono: <FolderUp className="w-3.5 h-3.5 text-yellow-500" />, onClick: guardarEnDrive })

  if (acciones.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setMenuAbierto(!menuAbierto)}
        disabled={cargando}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                   text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors
                   disabled:opacity-60 disabled:cursor-wait"
      >
        Acciones
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {menuAbierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuAbierto(false)} />
          <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200
                          rounded-xl shadow-lg z-50 overflow-hidden py-1">
            {acciones.map((accion, i) => (
              <div key={i}>
                {accion.separador && i > 0 && <div className="border-t border-slate-100 my-1" />}
                <button
                  onClick={() => { setMenuAbierto(false); accion.onClick() }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                    accion.danger
                      ? 'text-red-600 hover:bg-red-50'
                      : accion.highlight
                      ? 'text-blue-700 font-semibold hover:bg-blue-50'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {accion.icono}
                  {accion.label}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

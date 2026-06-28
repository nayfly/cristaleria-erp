'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronDown, Download, MessageCircle, Mail } from 'lucide-react'
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
  const [generandoPDF, setGenerandoPDF] = useState(false)

  const cliente = (presupuesto as any).cliente

  async function cambiarEstado(nuevoEstado: string) {
    const { error } = await supabase
      .from('presupuestos')
      .update({ estado: nuevoEstado })
      .eq('id', presupuesto.id)

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

  async function obtenerPDFBlob(): Promise<Blob | null> {
    const res = await fetch('/api/pdf/presupuesto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presupuestoId: presupuesto.id }),
    })
    if (!res.ok) return null
    return res.blob()
  }

  async function generarPDF() {
    setMenuAbierto(false)
    setGenerandoPDF(true)
    const toastId = toast.loading('Generando PDF...')
    try {
      const blob = await obtenerPDFBlob()
      if (!blob) throw new Error()
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
      setGenerandoPDF(false)
    }
  }

  async function compartirPorWhatsApp() {
    setMenuAbierto(false)
    setGenerandoPDF(true)
    const toastId = toast.loading('Preparando para compartir...')
    try {
      const blob = await obtenerPDFBlob()
      if (!blob) throw new Error()

      // Descargar PDF
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${presupuesto.numero}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      toast.dismiss(toastId)
      toast.success('PDF descargado — adjúntalo en WhatsApp')

      const nombreCliente = cliente?.empresa ?? cliente?.nombre ?? ''
      const mensaje = encodeURIComponent(
        `Hola${nombreCliente ? ` ${nombreCliente}` : ''},\n\nLe adjunto el presupuesto *${presupuesto.numero}* por importe de *${formatCurrency(presupuesto.total)}*.\n\nQuedamos a su disposición para cualquier consulta.`
      )

      const telefono = cliente?.telefono?.replace(/\D/g, '')
      const waUrl = telefono
        ? `https://wa.me/${telefono.startsWith('34') ? telefono : '34' + telefono}?text=${mensaje}`
        : `https://wa.me/?text=${mensaje}`

      setTimeout(() => window.open(waUrl, '_blank'), 500)
    } catch {
      toast.dismiss(toastId)
      toast.error('Error al generar el PDF')
    } finally {
      setGenerandoPDF(false)
    }
  }

  async function compartirPorEmail() {
    setMenuAbierto(false)
    setGenerandoPDF(true)
    const toastId = toast.loading('Preparando para compartir...')
    try {
      const blob = await obtenerPDFBlob()
      if (!blob) throw new Error()

      // Descargar PDF
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${presupuesto.numero}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      toast.dismiss(toastId)
      toast.success('PDF descargado — adjúntalo en el correo')

      const nombreCliente = cliente?.empresa ?? cliente?.nombre ?? ''
      const asunto = encodeURIComponent(`Presupuesto ${presupuesto.numero}`)
      const cuerpo = encodeURIComponent(
        `Estimado/a ${nombreCliente},\n\nLe adjuntamos el presupuesto ${presupuesto.numero} por importe de ${formatCurrency(presupuesto.total)}.\n\nQuedamos a su disposición para cualquier consulta.\n\nUn saludo.`
      )
      const emailCliente = cliente?.email ?? ''

      setTimeout(() => {
        window.location.href = `mailto:${emailCliente}?subject=${asunto}&body=${cuerpo}`
      }, 500)
    } catch {
      toast.dismiss(toastId)
      toast.error('Error al generar el PDF')
    } finally {
      setGenerandoPDF(false)
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

  acciones.push({ label: 'Descargar PDF', icono: <Download className="w-3.5 h-3.5" />, onClick: generarPDF, separador: true })
  acciones.push({ label: 'Compartir por WhatsApp', icono: <MessageCircle className="w-3.5 h-3.5 text-green-600" />, onClick: compartirPorWhatsApp })
  acciones.push({ label: 'Enviar por email', icono: <Mail className="w-3.5 h-3.5 text-blue-500" />, onClick: compartirPorEmail })

  if (acciones.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setMenuAbierto(!menuAbierto)}
        disabled={generandoPDF}
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
                  onClick={() => {
                    setMenuAbierto(false)
                    accion.onClick()
                  }}
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

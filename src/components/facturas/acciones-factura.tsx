'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronDown, Download, MessageCircle, Mail } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { Factura } from '@/types'

interface AccionesFacturaProps {
  factura: Factura & { cliente?: { nombre: string; empresa?: string; telefono?: string; email?: string } }
}

export function AccionesFactura({ factura }: AccionesFacturaProps) {
  const router = useRouter()
  const supabase = createClient()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [modalCobro, setModalCobro] = useState(false)
  const [formaPago, setFormaPago] = useState<string>(factura.forma_pago ?? 'transferencia')
  const [fechaCobro, setFechaCobro] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(false)

  const cliente = (factura as any).cliente

  async function marcarComoEnviada() {
    const { error } = await supabase.from('facturas').update({ estado: 'enviada' }).eq('id', factura.id)
    if (error) { toast.error('Error al actualizar'); return }
    toast.success('Factura marcada como enviada')
    router.refresh()
  }

  async function confirmarCobro() {
    setGuardando(true)
    const { error } = await supabase
      .from('facturas')
      .update({ estado: 'cobrada', pagado: true, fecha_cobro: fechaCobro, forma_pago: formaPago })
      .eq('id', factura.id)
    setGuardando(false)
    if (error) { toast.error('Error al registrar el cobro'); return }
    toast.success('Factura marcada como cobrada')
    setModalCobro(false)
    router.refresh()
  }

  async function anularFactura() {
    const { error } = await supabase.from('facturas').update({ estado: 'anulada' }).eq('id', factura.id)
    if (error) { toast.error('Error al anular'); return }
    toast.success('Factura anulada')
    router.refresh()
  }

  async function descargarPDF() {
    setMenuAbierto(false)
    setCargando(true)
    const toastId = toast.loading('Generando PDF...')
    try {
      const res = await fetch('/api/pdf/factura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facturaId: factura.id }),
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${factura.numero}.pdf`
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

  async function obtenerURLPublica(): Promise<string | null> {
    const res = await fetch(`/api/pdf/factura?id=${factura.id}`)
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
        `Hola${nombreCliente ? ` ${nombreCliente}` : ''},\n\nLe adjunto la factura *${factura.numero}* por importe de *${formatCurrency(factura.total)}*.\n\n📄 Descargar PDF: ${url}\n\nQuedamos a su disposición para cualquier consulta.`
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
      const asunto = encodeURIComponent(`Factura ${factura.numero}`)
      const cuerpo = encodeURIComponent(
        `Estimado/a ${nombreCliente},\n\nLe enviamos la factura ${factura.numero} por importe de ${formatCurrency(factura.total)}.\n\nPuede descargarla aquí:\n${url}\n\nQuedamos a su disposición para cualquier consulta.\n\nUn saludo.`
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

  if (factura.estado === 'emitida') {
    acciones.push({ label: 'Marcar como enviada', onClick: marcarComoEnviada })
  }
  if (!factura.pagado && factura.estado !== 'anulada') {
    acciones.push({
      label: '✓ Registrar cobro',
      onClick: () => { setMenuAbierto(false); setModalCobro(true) },
      highlight: true,
    })
  }

  acciones.push({ label: 'Descargar PDF', icono: <Download className="w-3.5 h-3.5" />, onClick: descargarPDF, separador: true })
  acciones.push({ label: 'Enviar por WhatsApp', icono: <MessageCircle className="w-3.5 h-3.5 text-green-600" />, onClick: compartirPorWhatsApp })
  acciones.push({ label: 'Enviar por email', icono: <Mail className="w-3.5 h-3.5 text-blue-500" />, onClick: compartirPorEmail })

  if (factura.estado !== 'anulada' && factura.estado !== 'cobrada') {
    acciones.push({
      label: 'Anular factura',
      onClick: () => { setMenuAbierto(false); anularFactura() },
      danger: true,
      separador: true,
    })
  }

  if (acciones.length === 0) return null

  return (
    <>
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
                    onClick={accion.onClick}
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

      {modalCobro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalCobro(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 fade-in">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Registrar cobro</h2>
            <p className="text-sm text-slate-500 mb-5">Confirma cómo y cuándo se cobró esta factura</p>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Fecha de cobro</label>
                <input type="date" value={fechaCobro} onChange={(e) => setFechaCobro(e.target.value)} className="campo" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Forma de pago</label>
                <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className="campo">
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="cheque">Cheque</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setModalCobro(false)} disabled={guardando}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={confirmarCobro} disabled={guardando}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Confirmar cobro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

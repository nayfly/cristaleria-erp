'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { Presupuesto } from '@/types'

interface AccionesPresupuestoProps {
  presupuesto: Presupuesto
}

export function AccionesPresupuesto({ presupuesto }: AccionesPresupuestoProps) {
  const router = useRouter()
  const supabase = createClient()
  const [menuAbierto, setMenuAbierto] = useState(false)

  async function cambiarEstado(nuevoEstado: string) {
    const { error } = await supabase
      .from('presupuestos')
      .update({ estado: nuevoEstado })
      .eq('id', presupuesto.id)

    if (error) {
      toast.error('Error al actualizar el estado')
      return
    }

    toast.success(`Presupuesto marcado como ${nuevoEstado}`)
    router.refresh()
  }

  async function convertirAFactura() {
    const { data, error } = await supabase
      .rpc('convertir_presupuesto_a_factura', { p_presupuesto_id: presupuesto.id })

    if (error || !data) {
      toast.error('Error al convertir en factura')
      return
    }

    toast.success('Factura creada correctamente')
    router.push(`/facturas/${data}`)
  }

  async function generarPDF() {
    toast.loading('Generando PDF...')
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
      toast.dismiss()
      toast.success('PDF descargado')
    } catch {
      toast.dismiss()
      toast.error('Error al generar el PDF')
    }
  }

  const acciones = []

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
  acciones.push({ label: 'Descargar PDF', onClick: generarPDF })

  if (acciones.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setMenuAbierto(!menuAbierto)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                   text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Acciones
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {menuAbierto && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuAbierto(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200
                          rounded-xl shadow-lg z-50 overflow-hidden py-1">
            {acciones.map((accion, i) => (
              <button
                key={i}
                onClick={() => {
                  setMenuAbierto(false)
                  accion.onClick()
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  accion.danger
                    ? 'text-red-600 hover:bg-red-50'
                    : accion.highlight
                    ? 'text-blue-700 font-semibold hover:bg-blue-50'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {accion.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

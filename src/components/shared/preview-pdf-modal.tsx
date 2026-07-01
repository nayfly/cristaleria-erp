'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { calcularTotales } from '@/lib/utils'
import type { Cliente, ConfiguracionEmpresa } from '@/types'

interface PreviewPDFModalProps {
  tipo: 'factura' | 'presupuesto'
  formValues: any
  clientes: Cliente[]
  empresa: ConfiguracionEmpresa
  onClose: () => void
}

export function PreviewPDFModal({ tipo, formValues, clientes, empresa, onClose }: PreviewPDFModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  const cliente = clientes.find(c => c.id === formValues.cliente_id) ?? {
    id: '', nombre: 'Cliente sin seleccionar', empresa: null,
    telefono: null, email: null, direccion: null, codigo_postal: null,
    poblacion: null, provincia: null, dni_cif: null, activo: true,
    created_at: '', updated_at: '',
  } as any

  const items = (formValues.items ?? []).map((item: any, i: number) => ({
    id: item.id ?? `temp-${i}`,
    orden: i + 1,
    descripcion: item.descripcion || '(sin descripción)',
    cantidad: item.cantidad ?? 1,
    unidad: item.unidad ?? 'ud',
    precio_unitario: item.precio_unitario ?? 0,
    descuento: item.descuento ?? 0,
    total: item.total ?? 0,
  }))

  const totales = calcularTotales(formValues.items ?? [], formValues.descuento ?? 0, formValues.iva_porcentaje ?? 21)

  const docBase = {
    id: 'preview',
    numero: '(borrador)',
    cliente_id: cliente.id,
    cliente,
    fecha: formValues.fecha ?? new Date().toISOString().split('T')[0],
    fecha_validez: formValues.fecha_validez ?? null,
    fecha_vencimiento: formValues.fecha_vencimiento ?? null,
    estado: 'borrador',
    descuento: formValues.descuento ?? 0,
    iva_porcentaje: formValues.iva_porcentaje ?? 21,
    observaciones: formValues.observaciones ?? null,
    condiciones: formValues.condiciones ?? null,
    items,
    subtotal: totales.subtotal,
    base_imponible: totales.base_imponible,
    iva_importe: totales.iva_importe,
    total: totales.total,
    created_at: '',
    updated_at: '',
  }

  useEffect(() => {
    let url: string | null = null

    async function generate() {
      try {
        const { pdf } = await import('@react-pdf/renderer')

        let doc: React.ReactElement
        if (tipo === 'factura') {
          const { FacturaPDF } = await import('@/components/pdf/factura-pdf')
          doc = <FacturaPDF factura={docBase as any} empresa={empresa} />
        } else {
          const { PresupuestoPDF } = await import('@/components/pdf/presupuesto-pdf')
          doc = <PresupuestoPDF presupuesto={docBase as any} empresa={empresa} />
        }

        const blob = await pdf(doc).toBlob()
        url = URL.createObjectURL(blob)
        setBlobUrl(url)
      } catch (e) {
        console.error('Error generating PDF preview:', e)
        setError(true)
      }
    }

    generate()

    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900">
            Vista previa — {tipo === 'factura' ? 'Factura' : 'Presupuesto'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 p-2">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
              <p className="text-sm">No se pudo generar la vista previa.</p>
              <button onClick={onClose} className="text-sm text-blue-600 underline">Cerrar</button>
            </div>
          ) : !blobUrl ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm">Generando vista previa...</span>
            </div>
          ) : (
            <iframe
              src={blobUrl}
              className="w-full h-full rounded-lg border-0"
              title="Vista previa PDF"
            />
          )}
        </div>
      </div>
    </div>
  )
}

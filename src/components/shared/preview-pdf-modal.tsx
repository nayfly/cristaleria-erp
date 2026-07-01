'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { calcularTotales } from '@/lib/utils'
import type { Cliente, ConfiguracionEmpresa } from '@/types'

// PDFViewer solo funciona en cliente
const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then(m => m.PDFViewer),
  { ssr: false, loading: () => <Cargando /> }
)
const FacturaPDF = dynamic(
  () => import('@/components/pdf/factura-pdf').then(m => m.FacturaPDF),
  { ssr: false }
)
const PresupuestoPDF = dynamic(
  () => import('@/components/pdf/presupuesto-pdf').then(m => m.PresupuestoPDF),
  { ssr: false }
)

function Cargando() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
      <Loader2 className="w-8 h-8 animate-spin" />
      <span className="text-sm">Generando vista previa...</span>
    </div>
  )
}

interface PreviewPDFModalProps {
  tipo: 'factura' | 'presupuesto'
  formValues: any
  clientes: Cliente[]
  empresa: ConfiguracionEmpresa
  onClose: () => void
}

export function PreviewPDFModal({ tipo, formValues, clientes, empresa, onClose }: PreviewPDFModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Construir objeto similar al que espera el PDF
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
    numero: tipo === 'factura' ? '1/???' : '1/???',
    cliente_id: cliente.id,
    cliente,
    fecha: formValues.fecha ?? new Date().toISOString().split('T')[0],
    estado: 'borrador',
    descuento: formValues.descuento ?? 0,
    iva_porcentaje: formValues.iva_porcentaje ?? 21,
    observaciones: formValues.observaciones ?? null,
    items,
    subtotal: totales.subtotal,
    base_imponible: totales.base_imponible,
    iva_importe: totales.iva_importe,
    total: totales.total,
    created_at: '',
    updated_at: '',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
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

        {/* PDF viewer */}
        <div className="flex-1 min-h-0 p-2">
          {mounted && (
            tipo === 'factura' ? (
              <PDFViewer width="100%" height="100%" showToolbar={false} style={{ borderRadius: 8 }}>
                <FacturaPDF factura={docBase as any} empresa={empresa} />
              </PDFViewer>
            ) : (
              <PDFViewer width="100%" height="100%" showToolbar={false} style={{ borderRadius: 8 }}>
                <PresupuestoPDF presupuesto={docBase as any} empresa={empresa} />
              </PDFViewer>
            )
          )}
        </div>
      </div>
    </div>
  )
}

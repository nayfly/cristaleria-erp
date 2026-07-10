'use client'

import { useForm, FormProvider, useWatch } from 'react-hook-form'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { facturaSchema, type FacturaFormValues } from '@/lib/validations/presupuesto'
import { calcularTotales, tempId } from '@/lib/utils'
import { LineasItems } from '@/components/shared/lineas-items'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Eye } from 'lucide-react'
import { PreviewPDFModal } from '@/components/shared/preview-pdf-modal'
import type { Cliente, Factura, Producto, ConfiguracionEmpresa } from '@/types'

interface FacturaFormProps {
  factura?: Factura
  clientes: Cliente[]
  productos?: Producto[]
  empresa?: ConfiguracionEmpresa
  condicionesDefault?: string
}

export function FacturaForm({ factura, clientes, productos = [], empresa, condicionesDefault = '' }: FacturaFormProps) {
  const [showPreview, setShowPreview] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const clienteIdPrefill = searchParams.get('cliente') ?? ''
  const supabase = createClient()
  const esEdicion = !!factura

  const methods = useForm<FacturaFormValues>({
    resolver: zodResolver(facturaSchema),
    defaultValues: {
      cliente_id: factura?.cliente_id ?? clienteIdPrefill,
      fecha: factura?.fecha ?? format(new Date(), 'yyyy-MM-dd'),
      fecha_vencimiento: factura?.fecha_vencimiento ?? '',
      estado: factura?.estado ?? 'emitida',
      descuento: factura?.descuento ?? 0,
      iva_porcentaje: factura?.iva_porcentaje ?? 21,
      pagado: factura?.pagado ?? false,
      fecha_cobro: factura?.fecha_cobro ?? '',
      forma_pago: factura?.forma_pago,
      observaciones: factura?.observaciones ?? '',
      condiciones: (factura as any)?.condiciones ?? condicionesDefault,
      items: factura?.items?.map((item) => ({
        id: item.id,
        orden: item.orden,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        unidad: item.unidad,
        precio_unitario: item.precio_unitario,
        descuento: item.descuento,
        total: item.total,
      })) ?? [
        {
          id: tempId(),
          orden: 1,
          descripcion: '',
          cantidad: 1,
          unidad: 'ud',
          precio_unitario: 0,
          descuento: 0,
          total: 0,
        },
      ],
    },
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = methods

  const items = watch('items') ?? []
  const descuento = watch('descuento') ?? 0
  const ivaPorcentaje = watch('iva_porcentaje') ?? 21

  async function onSubmit(data: FacturaFormValues) {
    const totalesFinal = calcularTotales(data.items, data.descuento, data.iva_porcentaje)

    if (esEdicion) {
      const { error } = await supabase
        .from('facturas')
        .update({
          cliente_id: data.cliente_id,
          fecha: data.fecha,
          fecha_vencimiento: data.fecha_vencimiento || null,
          estado: data.estado,
          descuento: data.descuento,
          iva_porcentaje: data.iva_porcentaje,
          pagado: data.pagado,
          fecha_cobro: data.fecha_cobro || null,
          forma_pago: data.forma_pago || null,
          observaciones: data.observaciones || null,
          condiciones: (data as any).condiciones || null,
          ...totalesFinal,
        })
        .eq('id', factura!.id)

      if (error) {
        toast.error('Error al guardar la factura')
        return
      }

      await supabase.from('factura_items').delete().eq('factura_id', factura!.id)
      await supabase.from('factura_items').insert(
        data.items.map((item, i) => ({
          factura_id: factura!.id,
          orden: i + 1,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          unidad: item.unidad,
          precio_unitario: item.precio_unitario,
          descuento: item.descuento,
          total: item.total,
        }))
      )

      toast.success('Factura actualizada')
      router.push(`/facturas/${factura!.id}`)
      router.refresh()
    } else {
      // Generar número via API server-side (evita restricciones de PostgREST)
      const numRes = await fetch('/api/numeracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'factura' }),
      })
      const numJson = await numRes.json()
      if (!numRes.ok || !numJson.numero) {
        toast.error('Error al generar el número de factura')
        return
      }
      const numeroData = numJson.numero

      const { data: nueva, error } = await supabase
        .from('facturas')
        .insert({
          numero: numeroData,
          cliente_id: data.cliente_id,
          presupuesto_id: data.presupuesto_id || null,
          fecha: data.fecha,
          fecha_vencimiento: data.fecha_vencimiento || null,
          estado: data.estado,
          descuento: data.descuento,
          iva_porcentaje: data.iva_porcentaje,
          pagado: data.pagado,
          fecha_cobro: data.fecha_cobro || null,
          forma_pago: data.forma_pago || null,
          observaciones: data.observaciones || null,
          condiciones: (data as any).condiciones || null,
          ...totalesFinal,
        })
        .select('id')
        .single()

      if (error || !nueva) {
        toast.error('Error al crear la factura')
        return
      }

      await supabase.from('factura_items').insert(
        data.items.map((item, i) => ({
          factura_id: nueva.id,
          orden: i + 1,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          unidad: item.unidad,
          precio_unitario: item.precio_unitario,
          descuento: item.descuento,
          total: item.total,
        }))
      )

      toast.success('Factura creada')
      router.push(`/facturas/${nueva.id}`)
      // Subir a Drive en segundo plano (silencioso si no está conectado)
      fetch('/api/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'factura', id: nueva.id }),
      }).catch(() => {})
    }
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Cabecera */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Datos de la factura</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="cliente_id" className="text-sm font-medium text-slate-700">
                Cliente <span className="text-red-500">*</span>
              </label>
              <select id="cliente_id" {...register('cliente_id')} className="campo">
                <option value="">Selecciona un cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}{c.empresa ? ` — ${c.empresa}` : ''}
                  </option>
                ))}
              </select>
              {errors.cliente_id && (
                <p className="text-xs text-red-500">{errors.cliente_id.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="fecha" className="text-sm font-medium text-slate-700">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input id="fecha" type="date" {...register('fecha')} className="campo" />
            </div>

            <div className="space-y-1">
              <label htmlFor="fecha_vencimiento" className="text-sm font-medium text-slate-700">
                Fecha de vencimiento
              </label>
              <input id="fecha_vencimiento" type="date" {...register('fecha_vencimiento')} className="campo" />
            </div>
          </div>
        </div>

        {/* Líneas */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Líneas</h2>
          <LineasItems productos={productos} />
        </div>

        {/* Importes */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Importes</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="descuento" className="text-sm font-medium text-slate-700">
                Descuento global (%)
              </label>
              <input
                id="descuento"
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...register('descuento', { valueAsNumber: true })}
                className="campo"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="iva_porcentaje" className="text-sm font-medium text-slate-700">
                IVA (%)
              </label>
              <select id="iva_porcentaje" {...register('iva_porcentaje', { valueAsNumber: true })} className="campo">
                <option value={21}>21% — General</option>
                <option value={10}>10% — Reducido</option>
                <option value={4}>4% — Superreducido</option>
                <option value={0}>0% — Exento</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cobro */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Cobro</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="forma_pago" className="text-sm font-medium text-slate-700">
                Forma de pago
              </label>
              <select id="forma_pago" {...register('forma_pago')} className="campo">
                <option value="">Sin especificar</option>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="cheque">Cheque</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Observaciones y condiciones */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Notas</h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="observaciones" className="text-sm font-medium text-slate-700">
                Observaciones
              </label>
              <textarea
                id="observaciones"
                {...register('observaciones')}
                rows={3}
                placeholder="Notas internas..."
                className="campo resize-none"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="condiciones" className="text-sm font-medium text-slate-700">
                Condiciones
              </label>
              <textarea
                id="condiciones"
                {...register('condiciones' as any)}
                rows={3}
                placeholder="Condiciones que aparecerán en el PDF..."
                className="campo resize-none"
              />
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border
                       border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          {empresa && (
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700
                         bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Vista previa
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
                       hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear factura'}
          </button>
        </div>
      </form>

      {showPreview && empresa && (
        <PreviewPDFModal
          tipo="factura"
          formValues={methods.getValues()}
          clientes={clientes}
          empresa={empresa}
          onClose={() => setShowPreview(false)}
        />
      )}
    </FormProvider>
  )
}

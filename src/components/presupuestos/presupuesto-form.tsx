'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { presupuestoSchema, type PresupuestoFormValues } from '@/lib/validations/presupuesto'
import { calcularTotales, tempId } from '@/lib/utils'
import { LineasItems } from '@/components/shared/lineas-items'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { Cliente, Presupuesto } from '@/types'

interface PresupuestoFormProps {
  presupuesto?: Presupuesto
  clientes: Cliente[]
  condicionesDefault?: string
}

export function PresupuestoForm({ presupuesto, clientes, condicionesDefault = '' }: PresupuestoFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clienteIdPrefill = searchParams.get('cliente') ?? ''
  const supabase = createClient()
  const esEdicion = !!presupuesto

  const methods = useForm<PresupuestoFormValues>({
    resolver: zodResolver(presupuestoSchema),
    defaultValues: {
      cliente_id: presupuesto?.cliente_id ?? clienteIdPrefill,
      fecha: presupuesto?.fecha ?? format(new Date(), 'yyyy-MM-dd'),
      fecha_validez: presupuesto?.fecha_validez ?? '',
      estado: presupuesto?.estado ?? 'borrador',
      descuento: presupuesto?.descuento ?? 0,
      iva_porcentaje: presupuesto?.iva_porcentaje ?? 21,
      observaciones: presupuesto?.observaciones ?? '',
      condiciones: presupuesto?.condiciones ?? condicionesDefault,
      items: presupuesto?.items?.map((item) => ({
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
  const totales = calcularTotales(items, descuento, ivaPorcentaje)

  async function onSubmit(data: PresupuestoFormValues) {
    const totalesFinal = calcularTotales(data.items, data.descuento, data.iva_porcentaje)

    if (esEdicion) {
      // Actualizar presupuesto
      const { error } = await supabase
        .from('presupuestos')
        .update({
          cliente_id: data.cliente_id,
          fecha: data.fecha,
          fecha_validez: data.fecha_validez || null,
          descuento: data.descuento,
          iva_porcentaje: data.iva_porcentaje,
          observaciones: data.observaciones || null,
          condiciones: data.condiciones || null,
          ...totalesFinal,
        })
        .eq('id', presupuesto!.id)

      if (error) {
        toast.error('Error al guardar el presupuesto')
        return
      }

      // Borrar items y reinsertar (más simple que hacer diff)
      await supabase.from('presupuesto_items').delete().eq('presupuesto_id', presupuesto!.id)
      await supabase.from('presupuesto_items').insert(
        data.items.map((item, i) => ({
          presupuesto_id: presupuesto!.id,
          orden: i + 1,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          unidad: item.unidad,
          precio_unitario: item.precio_unitario,
          descuento: item.descuento,
          total: item.total,
        }))
      )

      toast.success('Presupuesto actualizado')
      router.push(`/presupuestos/${presupuesto!.id}`)
      router.refresh()
    } else {
      // Generar número via API server-side (evita restricciones de PostgREST)
      const numRes = await fetch('/api/numeracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'presupuesto' }),
      })
      const numJson = await numRes.json()
      if (!numRes.ok || !numJson.numero) {
        toast.error('Error al generar el número de presupuesto')
        return
      }
      const numeroData = numJson.numero

      // Crear presupuesto
      const { data: nuevo, error } = await supabase
        .from('presupuestos')
        .insert({
          numero: numeroData,
          cliente_id: data.cliente_id,
          fecha: data.fecha,
          fecha_validez: data.fecha_validez || null,
          estado: 'borrador',
          descuento: data.descuento,
          iva_porcentaje: data.iva_porcentaje,
          observaciones: data.observaciones || null,
          condiciones: data.condiciones || null,
          ...totalesFinal,
        })
        .select('id')
        .single()

      if (error || !nuevo) {
        toast.error('Error al crear el presupuesto')
        return
      }

      // Crear items
      await supabase.from('presupuesto_items').insert(
        data.items.map((item, i) => ({
          presupuesto_id: nuevo.id,
          orden: i + 1,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          unidad: item.unidad,
          precio_unitario: item.precio_unitario,
          descuento: item.descuento,
          total: item.total,
        }))
      )

      toast.success('Presupuesto creado')
      router.push(`/presupuestos/${nuevo.id}`)
    }
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Cabecera del presupuesto */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Datos del presupuesto</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente */}
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

            {/* Fecha */}
            <div className="space-y-1">
              <label htmlFor="fecha" className="text-sm font-medium text-slate-700">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input id="fecha" type="date" {...register('fecha')} className="campo" />
            </div>

            {/* Fecha validez */}
            <div className="space-y-1">
              <label htmlFor="fecha_validez" className="text-sm font-medium text-slate-700">
                Válido hasta
              </label>
              <input id="fecha_validez" type="date" {...register('fecha_validez')} className="campo" />
            </div>
          </div>
        </div>

        {/* Líneas */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Líneas</h2>
          <LineasItems />
        </div>

        {/* Configuración fiscal */}
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
                {...register('condiciones')}
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
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
                       hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {isSubmitting
              ? 'Guardando...'
              : esEdicion
              ? 'Guardar cambios'
              : 'Crear presupuesto'}
          </button>
        </div>
      </form>
    </FormProvider>
  )
}

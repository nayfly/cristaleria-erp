'use client'

import { useFieldArray, useFormContext } from 'react-hook-form'
import { Trash2, Plus, GripVertical } from 'lucide-react'
import { calcularTotalLinea, formatCurrency, tempId } from '@/lib/utils'
import type { PresupuestoFormValues } from '@/lib/validations/presupuesto'

const UNIDADES = ['ud', 'm²', 'm', 'ml', 'h', 'kg', 'l']

export function LineasItems() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<PresupuestoFormValues>()

  const { fields, append, remove } = useFieldArray({
    name: 'items',
  })

  const items = watch('items') ?? []
  const descuentoGlobal = watch('descuento') ?? 0
  const ivaPorcentaje = watch('iva_porcentaje') ?? 21

  // Recalcular total de una línea al cambiar cantidad/precio/descuento
  function recalcularLinea(index: number) {
    const item = items[index]
    if (!item) return
    const total = calcularTotalLinea(
      Number(item.cantidad) || 0,
      Number(item.precio_unitario) || 0,
      Number(item.descuento) || 0
    )
    setValue(`items.${index}.total`, total)
  }

  function añadirLinea() {
    append({
      id: tempId(),
      orden: fields.length + 1,
      descripcion: '',
      cantidad: 1,
      unidad: 'ud',
      precio_unitario: 0,
      descuento: 0,
      total: 0,
    })
  }

  // Cálculos de totales
  const subtotal = items.reduce((acc, item) => acc + (Number(item.total) || 0), 0)
  const baseImponible = subtotal * (1 - (Number(descuentoGlobal) || 0) / 100)
  const ivaImporte = baseImponible * ((Number(ivaPorcentaje) || 0) / 100)
  const total = baseImponible + ivaImporte

  return (
    <div className="space-y-3">
      {/* Cabecera */}
      <div className="hidden md:grid grid-cols-[24px_2fr_80px_80px_100px_80px_100px_40px] gap-2
                      px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
        <span />
        <span>Descripción</span>
        <span className="text-right">Cant.</span>
        <span>Unidad</span>
        <span className="text-right">Precio</span>
        <span className="text-right">Dto. %</span>
        <span className="text-right">Total</span>
        <span />
      </div>

      {/* Líneas */}
      {fields.length === 0 && (
        <div className="border-2 border-dashed border-slate-200 rounded-xl py-8 text-center">
          <p className="text-sm text-slate-400">Añade líneas al presupuesto</p>
        </div>
      )}

      {fields.map((field, index) => {
        const lineaErrors = (errors.items as any)?.[index]

        return (
          <div
            key={field.id}
            className="bg-white border border-slate-200 rounded-xl p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-[24px_2fr_80px_80px_100px_80px_100px_40px] gap-2 items-start">
              {/* Handle (visual only) */}
              <div className="hidden md:flex items-center justify-center pt-2">
                <GripVertical className="w-4 h-4 text-slate-300" />
              </div>

              {/* Descripción */}
              <div className="md:col-span-1">
                <input
                  {...register(`items.${index}.descripcion`)}
                  placeholder="Descripción del trabajo o material..."
                  className="campo text-sm"
                />
                {lineaErrors?.descripcion && (
                  <p className="text-xs text-red-500 mt-0.5">{lineaErrors.descripcion.message}</p>
                )}
              </div>

              {/* Cantidad */}
              <div>
                <input
                  {...register(`items.${index}.cantidad`, {
                    valueAsNumber: true,
                    onChange: () => recalcularLinea(index),
                  })}
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="1"
                  className="campo text-sm text-right"
                />
              </div>

              {/* Unidad */}
              <div>
                <select
                  {...register(`items.${index}.unidad`)}
                  className="campo text-sm"
                >
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Precio unitario */}
              <div>
                <div className="relative">
                  <input
                    {...register(`items.${index}.precio_unitario`, {
                      valueAsNumber: true,
                      onChange: () => recalcularLinea(index),
                    })}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="campo text-sm text-right pr-6"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                </div>
              </div>

              {/* Descuento */}
              <div>
                <div className="relative">
                  <input
                    {...register(`items.${index}.descuento`, {
                      valueAsNumber: true,
                      onChange: () => recalcularLinea(index),
                    })}
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0"
                    className="campo text-sm text-right pr-5"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                </div>
              </div>

              {/* Total línea */}
              <div className="flex items-center justify-end h-10">
                <span className="text-sm font-semibold text-slate-900">
                  {formatCurrency(Number(items[index]?.total) || 0)}
                </span>
              </div>

              {/* Eliminar */}
              <div className="flex items-center justify-center md:justify-end h-10">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500
                             hover:bg-red-50 transition-colors"
                  title="Eliminar línea"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {errors.items && typeof errors.items === 'object' && 'message' in errors.items && (
        <p className="text-xs text-red-500">{(errors.items as any).message}</p>
      )}

      {/* Añadir línea */}
      <button
        type="button"
        onClick={añadirLinea}
        className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl
                   text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500
                   hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Añadir línea
      </button>

      {/* Totales */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {(Number(descuentoGlobal) || 0) > 0 && (
          <div className="flex justify-between text-sm text-slate-600">
            <span>Descuento ({descuentoGlobal}%)</span>
            <span className="text-red-500">−{formatCurrency(subtotal - baseImponible)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-slate-600">
          <span>Base imponible</span>
          <span>{formatCurrency(baseImponible)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>IVA ({ivaPorcentaje}%)</span>
          <span>{formatCurrency(ivaImporte)}</span>
        </div>
        <div className="flex justify-between font-bold text-slate-900 text-base pt-2 border-t border-slate-200">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}

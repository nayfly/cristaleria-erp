'use client'

import { useState } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { Trash2, Plus, GripVertical, Package, Search, X } from 'lucide-react'
import { calcularTotalLinea, formatCurrency, tempId } from '@/lib/utils'
import type { PresupuestoFormValues } from '@/lib/validations/presupuesto'
import type { Producto } from '@/types'

const UNIDADES = ['ud', 'm²', 'm', 'ml', 'h', 'kg', 'l']

interface LineasItemsProps {
  productos?: Producto[]
}

export function LineasItems({ productos = [] }: LineasItemsProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<PresupuestoFormValues>()

  const { fields, append, remove } = useFieldArray({ name: 'items' })

  const items = watch('items') ?? []
  const descuentoGlobal = watch('descuento') ?? 0
  const ivaPorcentaje = watch('iva_porcentaje') ?? 21

  const [modalAbierto, setModalAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')

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

  function seleccionarProducto(producto: Producto) {
    const total = calcularTotalLinea(1, producto.precio_base, 0)
    append({
      id: tempId(),
      orden: fields.length + 1,
      descripcion: producto.nombre,
      cantidad: 1,
      unidad: producto.unidad,
      precio_unitario: producto.precio_base,
      descuento: 0,
      total,
    })
    // Sugerir IVA del producto si el formulario tiene IVA en 21% (valor por defecto)
    if (ivaPorcentaje === 21 && producto.tipo_iva !== 21) {
      setValue('iva_porcentaje', producto.tipo_iva)
    }
    setBusqueda('')
    setModalAbierto(false)
  }

  const productosFiltrados = productos.filter((p) => {
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase()
    return (
      p.nombre.toLowerCase().includes(q) ||
      (p.referencia ?? '').toLowerCase().includes(q)
    )
  })

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
          <div key={field.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-[24px_2fr_80px_80px_100px_80px_100px_40px] gap-2 items-start">
              {/* Handle */}
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
                <select {...register(`items.${index}.unidad`)} className="campo text-sm">
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

      {/* Botones añadir */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={añadirLinea}
          className="flex-1 py-2.5 border-2 border-dashed border-slate-200 rounded-xl
                     text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500
                     hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Añadir línea
        </button>

        {productos.length > 0 && (
          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200
                       rounded-xl text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500
                       hover:bg-blue-50/50 transition-colors whitespace-nowrap"
          >
            <Package className="w-4 h-4" />
            Del catálogo
          </button>
        )}
      </div>

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

      {/* Modal catálogo */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalAbierto(false)} />
          <div className="relative bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl
                          shadow-xl flex flex-col max-h-[70vh]">
            {/* Cabecera modal */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Seleccionar producto</h3>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Buscador */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="campo pl-9 text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Lista productos */}
            <div className="overflow-y-auto flex-1">
              {productosFiltrados.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">
                  {busqueda ? 'No se encontraron productos' : 'No hay productos en el catálogo'}
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {productosFiltrados.map((producto) => (
                    <button
                      key={producto.id}
                      type="button"
                      onClick={() => seleccionarProducto(producto)}
                      className="w-full flex items-center justify-between px-4 py-3.5
                                 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{producto.nombre}</p>
                        {producto.referencia && (
                          <p className="text-xs text-slate-400 font-mono">{producto.referencia}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(producto.precio_base)}
                        </p>
                        <p className="text-xs text-slate-400">{producto.unidad} · IVA {producto.tipo_iva}%</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

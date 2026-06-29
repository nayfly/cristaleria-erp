'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { productoSchema, type ProductoFormValues } from '@/lib/validations/producto'
import { toast } from 'sonner'
import type { Producto } from '@/types'

const UNIDADES = ['ud', 'm²', 'm', 'ml', 'h', 'kg', 'l', 'm³', 'juego', 'set']
const TIPOS_IVA = [0, 4, 10, 21]

interface ProductoFormProps {
  producto?: Producto
}

export function ProductoForm({ producto }: ProductoFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const esEdicion = !!producto

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductoFormValues>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      nombre: producto?.nombre ?? '',
      descripcion: producto?.descripcion ?? '',
      referencia: producto?.referencia ?? '',
      precio_base: producto?.precio_base ?? 0,
      tipo_iva: producto?.tipo_iva ?? 21,
      unidad: producto?.unidad ?? 'ud',
      activo: producto?.activo ?? true,
    },
  })

  async function onSubmit(data: ProductoFormValues) {
    const payload = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )

    if (esEdicion) {
      const { error } = await supabase.from('productos').update(payload).eq('id', producto.id)
      if (error) { toast.error('Error al guardar los cambios'); return }
      toast.success('Producto actualizado')
      router.push(`/productos/${producto.id}`)
      router.refresh()
    } else {
      const { data: nuevo, error } = await supabase
        .from('productos')
        .insert(payload)
        .select('id')
        .single()
      if (error) { toast.error('Error al crear el producto'); return }
      toast.success('Producto creado')
      router.push(`/productos/${nuevo.id}`)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Datos principales */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Datos del producto</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="nombre" className="text-sm font-medium text-slate-700">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              id="nombre"
              {...register('nombre')}
              placeholder="Cristal templado 10mm"
              className="campo"
            />
            {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-1 md:col-span-2">
            <label htmlFor="descripcion" className="text-sm font-medium text-slate-700">
              Descripción
            </label>
            <textarea
              id="descripcion"
              {...register('descripcion')}
              placeholder="Descripción detallada que aparecerá en la factura..."
              rows={3}
              className="campo resize-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="referencia" className="text-sm font-medium text-slate-700">
              Referencia / SKU
            </label>
            <input
              id="referencia"
              {...register('referencia')}
              placeholder="REF-001"
              className="campo"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="unidad" className="text-sm font-medium text-slate-700">
              Unidad
            </label>
            <select id="unidad" {...register('unidad')} className="campo">
              {UNIDADES.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Precios e IVA */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Precio e IVA</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="precio_base" className="text-sm font-medium text-slate-700">
              Precio sin IVA (€) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="precio_base"
                {...register('precio_base')}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="campo pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">€</span>
            </div>
            {errors.precio_base && <p className="text-xs text-red-500">{errors.precio_base.message}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="tipo_iva" className="text-sm font-medium text-slate-700">
              Tipo de IVA
            </label>
            <select id="tipo_iva" {...register('tipo_iva')} className="campo">
              {TIPOS_IVA.map((t) => (
                <option key={t} value={t}>{t}%</option>
              ))}
            </select>
            {errors.tipo_iva && <p className="text-xs text-red-500">{errors.tipo_iva.message}</p>}
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
          {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    </form>
  )
}

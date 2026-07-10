'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clienteSchema, type ClienteFormValues } from '@/lib/validations/cliente'
import { toast } from 'sonner'
import type { Cliente } from '@/types'

interface ClienteFormProps {
  cliente?: Cliente  // Si se pasa, es edición; si no, es creación
}


export function ClienteForm({ cliente }: ClienteFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const esEdicion = !!cliente

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nombre: cliente?.nombre ?? '',
      empresa: cliente?.empresa ?? '',
      dni_cif: cliente?.dni_cif ?? '',
      telefono: cliente?.telefono ?? '',
      email: cliente?.email ?? '',
      direccion: cliente?.direccion ?? '',
      codigo_postal: cliente?.codigo_postal ?? '',
      poblacion: cliente?.poblacion ?? '',
      provincia: cliente?.provincia ?? '',
      observaciones: cliente?.observaciones ?? '',
      activo: cliente?.activo ?? true,
    },
  })

  async function onSubmit(data: ClienteFormValues) {
    // Limpiar strings vacíos → undefined
    const payload = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v])
    )

    if (esEdicion) {
      const { error } = await supabase
        .from('clientes')
        .update(payload)
        .eq('id', cliente.id)

      if (error) {
        toast.error('Error al guardar los cambios')
        return
      }

      toast.success('Cliente actualizado')
      router.push(`/clientes/${cliente.id}`)
      router.refresh()
    } else {
      const { data: nuevo, error } = await supabase
        .from('clientes')
        .insert(payload)
        .select('id')
        .single()

      if (error) {
        toast.error('Error al crear el cliente')
        return
      }

      toast.success('Cliente creado')
      router.push(`/clientes/${nuevo.id}`)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Datos personales */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Datos del cliente</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nombre */}
          <div className="space-y-1">
            <label htmlFor="nombre" className="text-sm font-medium text-slate-700">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              id="nombre"
              {...register('nombre')}
              placeholder="Juan García"
              className="campo"
            />
            {errors.nombre && (
              <p className="text-xs text-red-500">{errors.nombre.message}</p>
            )}
          </div>

          {/* Empresa */}
          <div className="space-y-1">
            <label htmlFor="empresa" className="text-sm font-medium text-slate-700">
              Empresa
            </label>
            <input
              id="empresa"
              {...register('empresa')}
              placeholder="Reformas García S.L."
              className="campo"
            />
          </div>

          {/* DNI/CIF */}
          <div className="space-y-1">
            <label htmlFor="dni_cif" className="text-sm font-medium text-slate-700">
              DNI / CIF
            </label>
            <input
              id="dni_cif"
              {...register('dni_cif')}
              placeholder="12345678Z o B12345678"
              className="campo"
            />
            {errors.dni_cif && (
              <p className="text-xs text-red-500">{errors.dni_cif.message}</p>
            )}
          </div>

          {/* Teléfono */}
          <div className="space-y-1">
            <label htmlFor="telefono" className="text-sm font-medium text-slate-700">
              Teléfono
            </label>
            <input
              id="telefono"
              {...register('telefono')}
              type="tel"
              placeholder="666 111 222"
              className="campo"
            />
          </div>

          {/* Email */}
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              {...register('email')}
              type="email"
              placeholder="juan@email.com"
              className="campo"
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Dirección */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Dirección</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="direccion" className="text-sm font-medium text-slate-700">
              Dirección
            </label>
            <input
              id="direccion"
              {...register('direccion')}
              placeholder="Calle Mayor 1, 2ºA"
              className="campo"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="codigo_postal" className="text-sm font-medium text-slate-700">
              Código postal
            </label>
            <input
              id="codigo_postal"
              {...register('codigo_postal')}
              placeholder="28001"
              maxLength={5}
              className="campo"
            />
            {errors.codigo_postal && (
              <p className="text-xs text-red-500">{errors.codigo_postal.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="poblacion" className="text-sm font-medium text-slate-700">
              Población
            </label>
            <input
              id="poblacion"
              {...register('poblacion')}
              placeholder="Málaga"
              className="campo"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="provincia" className="text-sm font-medium text-slate-700">
              Provincia / Estado / Región
            </label>
            <input
              id="provincia"
              {...register('provincia')}
              placeholder="Málaga, Bayern, Île-de-France..."
              className="campo"
            />
          </div>
        </div>
      </div>

      {/* Observaciones */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Observaciones</h2>
        <textarea
          {...register('observaciones')}
          placeholder="Notas internas sobre este cliente..."
          rows={4}
          className="campo resize-none"
        />
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
            : 'Crear cliente'}
        </button>
      </div>
    </form>
  )
}

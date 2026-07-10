'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import Image from 'next/image'
import type { ConfiguracionEmpresa } from '@/types'

const schema = z.object({
  nombre:           z.string().min(1, 'Obligatorio'),
  nif:              z.string().optional().or(z.literal('')),
  telefono:         z.string().optional().or(z.literal('')),
  email:            z.string().email('Email no válido').optional().or(z.literal('')),
  web:              z.string().optional().or(z.literal('')),
  direccion:        z.string().optional().or(z.literal('')),
  codigo_postal:    z.string().regex(/^\d{5}$/, '5 dígitos').optional().or(z.literal('')),
  poblacion:        z.string().optional().or(z.literal('')),
  provincia:        z.string().optional().or(z.literal('')),
  // PDF y firma
  nombre_firmante:  z.string().optional().or(z.literal('')),
  // Datos bancarios
  banco_nombre:     z.string().optional().or(z.literal('')),
  banco_bic:        z.string().optional().or(z.literal('')),
  banco_iban:       z.string().optional().or(z.literal('')),
  paypal_email:     z.string().optional().or(z.literal('')),
  // Series y numeración
  serie_facturas:              z.string().min(1).max(10).default('1'),
  serie_presupuestos:          z.string().min(1).max(10).default('1'),
  siguiente_num_factura:       z.number().int().min(1).default(1),
  siguiente_num_presupuesto:   z.number().int().min(1).default(1),
  iva_defecto:                 z.number().min(0).max(100).default(21),
  // Condiciones por defecto en presupuestos y facturas
  condiciones_presupuesto_default: z.string().optional().or(z.literal('')),
  condiciones_factura_default: z.string().optional().or(z.literal('')),
})

type Valores = z.infer<typeof schema>

interface Props {
  config: ConfiguracionEmpresa | null
}

export function ConfiguracionForm({ config }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [logoUrl, setLogoUrl] = useState<string>(config?.logo_url ?? '')
  const [subiendoLogo, setSubiendoLogo] = useState(false)

  async function subirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El logo no puede superar 2 MB')
      return
    }

    setSubiendoLogo(true)
    const ext = file.name.split('.').pop()
    const ruta = `logo.${ext}`

    const { error: errUpload } = await supabase.storage
      .from('logos')
      .upload(ruta, file, { upsert: true, contentType: file.type })

    if (errUpload) {
      toast.error('Error al subir el logo')
      setSubiendoLogo(false)
      return
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(ruta)
    const url = `${data.publicUrl}?t=${Date.now()}` // cache-bust

    const { error: errDB } = await supabase
      .from('configuracion_empresa')
      .update({ logo_url: data.publicUrl })
      .eq('id', config!.id)

    if (errDB) {
      toast.error('Error al guardar la URL del logo')
    } else {
      setLogoUrl(url)
      toast.success('Logo actualizado')
      router.refresh()
    }
    setSubiendoLogo(false)
  }

  async function eliminarLogo() {
    await supabase.storage.from('logos').remove(['logo.png', 'logo.jpg', 'logo.jpeg', 'logo.webp'])
    await supabase.from('configuracion_empresa').update({ logo_url: null }).eq('id', config!.id)
    setLogoUrl('')
    toast.success('Logo eliminado')
    router.refresh()
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Valores>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre:           config?.nombre           ?? '',
      nif:              config?.nif              ?? '',
      telefono:         config?.telefono         ?? '',
      email:            config?.email            ?? '',
      web:              config?.web              ?? '',
      direccion:        config?.direccion        ?? '',
      codigo_postal:    config?.codigo_postal    ?? '',
      poblacion:        config?.poblacion        ?? '',
      provincia:        config?.provincia        ?? '',
      nombre_firmante:  config?.nombre_firmante  ?? '',
      banco_nombre:     config?.banco_nombre     ?? '',
      banco_bic:        config?.banco_bic        ?? '',
      banco_iban:       config?.banco_iban       ?? '',
      paypal_email:     config?.paypal_email     ?? '',
      serie_facturas:              config?.serie_facturas            ?? '1',
      serie_presupuestos:          config?.serie_presupuestos        ?? '1',
      siguiente_num_factura:       config?.siguiente_num_factura     ?? 1,
      siguiente_num_presupuesto:   config?.siguiente_num_presupuesto ?? 1,
      iva_defecto:                 config?.iva_defecto               ?? 21,
      condiciones_presupuesto_default: (config as any)?.condiciones_presupuesto_default ?? '',
      condiciones_factura_default: (config as any)?.condiciones_factura_default ?? '',
    },
  })

  async function onSubmit(data: Valores) {
    const payload = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )

    const { error } = await supabase
      .from('configuracion_empresa')
      .update(payload)
      .eq('id', config!.id)

    if (error) {
      toast.error('Error al guardar la configuración')
      return
    }

    toast.success('Configuración guardada')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Logo */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Logo de la empresa</h2>
          <p className="text-xs text-slate-500 mt-0.5">Aparece en la cabecera de todos los PDFs. Recomendado: fondo blanco, máx. 2 MB.</p>
        </div>

        <div className="flex items-center gap-5">
          {/* Preview */}
          <div className="w-32 h-20 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <span className="text-xs text-slate-400">Sin logo</span>
            )}
          </div>

          {/* Acciones */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={subirLogo}
            />
            <button
              type="button"
              disabled={subiendoLogo}
              onClick={() => fileInputRef.current?.click()}
              className="block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
                         hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {subiendoLogo ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={eliminarLogo}
                className="block px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Eliminar logo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Datos de empresa */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Datos de la empresa</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Nombre de empresa <span className="text-red-500">*</span>
            </label>
            <input
              {...register('nombre')}
              placeholder="Cristalería y Aluminios de Torrox Costa (Desde 1986)"
              className="campo"
            />
            {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">NIF / CIF</label>
            <input {...register('nif')} placeholder="52584635B" className="campo" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Nombre del titular (firma)</label>
            <input
              {...register('nombre_firmante')}
              placeholder="Juan Antonio Valle Alés"
              className="campo"
            />
            <p className="text-xs text-slate-400">Aparece en la firma del PDF y en los datos bancarios</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Teléfono</label>
            <input {...register('telefono')} type="tel" placeholder="0034683117711" className="campo" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input {...register('email')} type="email" placeholder="alucrisvr@gmail.com" className="campo" />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Web</label>
            <input
              {...register('web')}
              type="url"
              placeholder="https://www.cristaleriayaluminiostorroxcosta.com/"
              className="campo"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Dirección</label>
            <input {...register('direccion')} placeholder="Calle Mayor 1" className="campo" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Código postal</label>
            <input {...register('codigo_postal')} placeholder="29793" maxLength={5} className="campo" />
            {errors.codigo_postal && <p className="text-xs text-red-500">{errors.codigo_postal.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Población</label>
            <input {...register('poblacion')} placeholder="Torrox Costa" className="campo" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Provincia</label>
            <input {...register('provincia')} placeholder="Málaga" className="campo" />
          </div>
        </div>
      </div>

      {/* Datos bancarios */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Datos bancarios</h2>
          <p className="text-xs text-slate-500 mt-0.5">Aparecen en el pie de página de todos los PDFs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Nombre del banco</label>
            <input
              {...register('banco_nombre')}
              placeholder="Cajamar. Caja Rural. Sociedad cooperativa de crédito (TORROX-COSTA)"
              className="campo"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">BIC / SWIFT</label>
            <input
              {...register('banco_bic')}
              placeholder="CCRIES2AXXX"
              className="campo font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">IBAN</label>
            <input
              {...register('banco_iban')}
              placeholder="ES97 3058 0856 7228 1036 0049"
              className="campo font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Email PayPal</label>
            <input
              {...register('paypal_email')}
              type="email"
              placeholder="alucrisvr@gmail.com"
              className="campo"
            />
            <p className="text-xs text-slate-400">Si no usas PayPal, deja en blanco (usará el email principal)</p>
          </div>
        </div>
      </div>

      {/* Series y numeración */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Numeración</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Formato: <span className="font-mono">SERIE/número</span> → ejemplo: <span className="font-mono">1/40</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Serie facturas</label>
            <input
              {...register('serie_facturas')}
              placeholder="1"
              maxLength={10}
              className="campo font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Siguiente nº factura</label>
            <input
              {...register('siguiente_num_factura', { valueAsNumber: true })}
              type="number"
              min={1}
              className="campo font-mono"
            />
            <p className="text-xs text-slate-400">La próxima factura será {config?.serie_facturas ?? '1'}/este número</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Serie presupuestos</label>
            <input
              {...register('serie_presupuestos')}
              placeholder="1"
              maxLength={10}
              className="campo font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Siguiente nº presupuesto</label>
            <input
              {...register('siguiente_num_presupuesto', { valueAsNumber: true })}
              type="number"
              min={1}
              className="campo font-mono"
            />
            <p className="text-xs text-slate-400">El próximo presupuesto será {config?.serie_presupuestos ?? '1'}/este número</p>
          </div>
        </div>
      </div>

      {/* IVA */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Fiscal</h2>
        <div className="space-y-1 max-w-[180px]">
          <label className="text-sm font-medium text-slate-700">IVA por defecto</label>
          <select {...register('iva_defecto', { valueAsNumber: true })} className="campo">
            <option value={21}>21% — General</option>
            <option value={10}>10% — Reducido</option>
            <option value={4}>4% — Superreducido</option>
            <option value={0}>0% — Exento</option>
          </select>
        </div>
      </div>

      {/* Condiciones por defecto en presupuestos */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Condiciones por defecto en presupuestos</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Se rellenan automáticamente al crear un presupuesto. Se pueden editar en cada presupuesto individualmente. Déjalo en blanco si no quieres que aparezcan.
          </p>
        </div>
        <textarea
          {...register('condiciones_presupuesto_default')}
          rows={6}
          placeholder="Presupuesto válido durante 15 días..."
          className="campo resize-none"
        />
      </div>

      {/* Condiciones por defecto en facturas */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Condiciones por defecto en facturas</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Se rellenan automáticamente al crear una factura. Se pueden editar en cada factura individualmente. Déjalo en blanco si no quieres que aparezcan.
          </p>
        </div>
        <textarea
          {...register('condiciones_factura_default')}
          rows={6}
          placeholder="Pago a 30 días desde la fecha de factura..."
          className="campo resize-none"
        />
      </div>

      {/* Botón guardar */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
                     hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed
                     transition-colors"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </form>
  )
}

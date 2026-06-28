import { z } from 'zod'

// ============================================
// LÍNEA DE ITEM (compartida entre presupuesto y factura)
// ============================================

export const itemSchema = z.object({
  id: z.string().optional(),
  orden: z.number().int().min(1),
  descripcion: z
    .string()
    .min(1, 'La descripción es obligatoria')
    .max(500, 'Descripción demasiado larga'),
  cantidad: z
    .number()
    .positive('La cantidad debe ser mayor que 0')
    .max(99999, 'Cantidad demasiado alta'),
  unidad: z.string().default('ud'),
  precio_unitario: z
    .number()
    .min(0, 'El precio no puede ser negativo')
    .max(999999, 'Precio demasiado alto'),
  descuento: z
    .number()
    .min(0, 'El descuento no puede ser negativo')
    .max(100, 'El descuento no puede superar el 100%')
    .default(0),
  total: z.number(),
})

export type ItemFormValues = z.infer<typeof itemSchema>

// ============================================
// PRESUPUESTO
// ============================================

export const presupuestoSchema = z.object({
  cliente_id: z.string().uuid('Selecciona un cliente'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  fecha_validez: z.string().optional().or(z.literal('')),
  estado: z.enum(['borrador', 'enviado', 'aceptado', 'rechazado', 'facturado']).default('borrador'),
  descuento: z
    .number()
    .min(0, 'El descuento no puede ser negativo')
    .max(100, 'El descuento no puede superar el 100%')
    .default(0),
  iva_porcentaje: z
    .number()
    .min(0, 'El IVA no puede ser negativo')
    .max(100, 'El IVA no puede superar el 100%')
    .default(21),
  observaciones: z.string().max(2000).optional().or(z.literal('')),
  condiciones: z.string().max(2000).optional().or(z.literal('')),
  items: z
    .array(itemSchema)
    .min(1, 'El presupuesto debe tener al menos una línea'),
})

export type PresupuestoFormValues = z.infer<typeof presupuestoSchema>

// ============================================
// FACTURA
// ============================================

export const facturaSchema = z.object({
  cliente_id: z.string().uuid('Selecciona un cliente'),
  presupuesto_id: z.string().uuid().optional().or(z.literal('')),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  fecha_vencimiento: z.string().optional().or(z.literal('')),
  estado: z.enum(['borrador', 'emitida', 'enviada', 'cobrada', 'anulada']).default('emitida'),
  descuento: z
    .number()
    .min(0)
    .max(100)
    .default(0),
  iva_porcentaje: z
    .number()
    .min(0)
    .max(100)
    .default(21),
  pagado: z.boolean().default(false),
  fecha_cobro: z.string().optional().or(z.literal('')),
  forma_pago: z
    .enum(['efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro'])
    .optional(),
  observaciones: z.string().max(2000).optional().or(z.literal('')),
  items: z
    .array(itemSchema)
    .min(1, 'La factura debe tener al menos una línea'),
})

export type FacturaFormValues = z.infer<typeof facturaSchema>

// ============================================
// CONFIGURACIÓN EMPRESA
// ============================================

export const configuracionEmpresaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(100),
  nif: z.string().max(20).optional().or(z.literal('')),
  direccion: z.string().max(200).optional().or(z.literal('')),
  codigo_postal: z
    .string()
    .regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos')
    .optional()
    .or(z.literal('')),
  poblacion: z.string().max(100).optional().or(z.literal('')),
  provincia: z.string().max(50).optional().or(z.literal('')),
  telefono: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Email no válido').optional().or(z.literal('')),
  serie_facturas: z.string().min(1).max(10).default('1'),
  serie_presupuestos: z.string().min(1).max(10).default('1'),
  iva_defecto: z.number().min(0).max(100).default(21),
})

export type ConfiguracionEmpresaFormValues = z.infer<typeof configuracionEmpresaSchema>

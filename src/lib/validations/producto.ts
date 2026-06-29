import { z } from 'zod'

export const productoSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(200),
  descripcion: z.string().max(500).optional().or(z.literal('')),
  referencia: z.string().max(50).optional().or(z.literal('')),
  precio_base: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  tipo_iva: z.coerce.number().refine((v) => [0, 4, 10, 21].includes(v), {
    message: 'El IVA debe ser 0%, 4%, 10% o 21%',
  }),
  unidad: z.string().min(1),
  activo: z.boolean().default(true),
})

export type ProductoFormValues = z.infer<typeof productoSchema>

import { z } from 'zod'

export const clienteSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo'),
  empresa: z.string().max(100, 'El nombre de empresa es demasiado largo').optional().or(z.literal('')),
  dni_cif: z
    .string()
    .max(20, 'DNI/CIF demasiado largo')
    .optional()
    .or(z.literal('')),
  telefono: z
    .string()
    .max(20, 'Teléfono demasiado largo')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Email no válido')
    .optional()
    .or(z.literal('')),
  direccion: z.string().max(200, 'Dirección demasiado larga').optional().or(z.literal('')),
  codigo_postal: z
    .string()
    .regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos')
    .optional()
    .or(z.literal('')),
  poblacion: z.string().max(100, 'Población demasiado larga').optional().or(z.literal('')),
  provincia: z.string().max(50, 'Provincia demasiado larga').optional().or(z.literal('')),
  observaciones: z.string().max(1000, 'Observaciones demasiado largas').optional().or(z.literal('')),
  activo: z.boolean().default(true),
})

export type ClienteFormValues = z.infer<typeof clienteSchema>

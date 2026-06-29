// ============================================
// ENUMS / UNION TYPES
// ============================================

export type EstadoPresupuesto =
  | 'borrador'
  | 'enviado'
  | 'aceptado'
  | 'rechazado'
  | 'facturado'

export type EstadoFactura =
  | 'borrador'
  | 'emitida'
  | 'enviada'
  | 'cobrada'
  | 'anulada'

export type FormaPago =
  | 'efectivo'
  | 'transferencia'
  | 'tarjeta'
  | 'cheque'
  | 'otro'

export type Unidad =
  | 'ud'
  | 'm²'
  | 'm'
  | 'ml'
  | 'h'
  | 'kg'
  | 'l'

// ============================================
// CONFIGURACIÓN EMPRESA
// ============================================

export interface ConfiguracionEmpresa {
  id: string
  nombre: string
  nif?: string
  direccion?: string
  codigo_postal?: string
  poblacion?: string
  provincia?: string
  telefono?: string
  email?: string
  logo_url?: string
  web?: string
  nombre_firmante?: string
  banco_nombre?: string
  banco_bic?: string
  banco_iban?: string
  paypal_email?: string
  serie_facturas: string
  serie_presupuestos: string
  siguiente_num_factura: number
  siguiente_num_presupuesto: number
  iva_defecto: number
  created_at: string
  updated_at: string
}

// ============================================
// CLIENTES
// ============================================

export interface Cliente {
  id: string
  nombre: string
  empresa?: string
  dni_cif?: string
  telefono?: string
  email?: string
  direccion?: string
  codigo_postal?: string
  poblacion?: string
  provincia?: string
  observaciones?: string
  activo: boolean
  drive_folder_id?: string
  created_at: string
  updated_at: string
}

export type ClienteInsert = Omit<Cliente, 'id' | 'created_at' | 'updated_at'>
export type ClienteUpdate = Partial<ClienteInsert>

// ============================================
// PRESUPUESTOS
// ============================================

export interface PresupuestoItem {
  id: string
  presupuesto_id: string
  orden: number
  descripcion: string
  cantidad: number
  unidad: string
  precio_unitario: number
  descuento: number
  total: number
}

export type PresupuestoItemInsert = Omit<PresupuestoItem, 'id'>

// Item temporal para formulario (sin id de presupuesto aún)
export interface PresupuestoItemForm {
  id?: string          // undefined si es nuevo
  orden: number
  descripcion: string
  cantidad: number
  unidad: string
  precio_unitario: number
  descuento: number
  total: number
}

export interface Presupuesto {
  id: string
  numero: string
  cliente_id: string
  cliente?: Cliente
  fecha: string
  fecha_validez?: string
  estado: EstadoPresupuesto
  subtotal: number
  descuento: number
  base_imponible: number
  iva_porcentaje: number
  iva_importe: number
  total: number
  observaciones?: string
  condiciones?: string
  pdf_url?: string
  drive_file_id?: string
  items?: PresupuestoItem[]
  created_at: string
  updated_at: string
}

export type PresupuestoInsert = Omit<
  Presupuesto,
  'id' | 'numero' | 'cliente' | 'items' | 'created_at' | 'updated_at'
>

// ============================================
// FACTURAS
// ============================================

export interface FacturaItem {
  id: string
  factura_id: string
  orden: number
  descripcion: string
  cantidad: number
  unidad: string
  precio_unitario: number
  descuento: number
  total: number
}

export type FacturaItemInsert = Omit<FacturaItem, 'id'>

export interface FacturaItemForm {
  id?: string
  orden: number
  descripcion: string
  cantidad: number
  unidad: string
  precio_unitario: number
  descuento: number
  total: number
}

export interface Factura {
  id: string
  numero: string
  cliente_id: string
  cliente?: Cliente
  presupuesto_id?: string
  presupuesto?: Presupuesto
  fecha: string
  fecha_vencimiento?: string
  estado: EstadoFactura
  subtotal: number
  descuento: number
  base_imponible: number
  iva_porcentaje: number
  iva_importe: number
  total: number
  pagado: boolean
  fecha_cobro?: string
  forma_pago?: FormaPago
  observaciones?: string
  pdf_url?: string
  drive_file_id?: string
  items?: FacturaItem[]
  created_at: string
  updated_at: string
}

export type FacturaInsert = Omit<
  Factura,
  'id' | 'numero' | 'cliente' | 'presupuesto' | 'items' | 'created_at' | 'updated_at'
>

// ============================================
// PRODUCTOS
// ============================================

export interface Producto {
  id: string
  nombre: string
  descripcion?: string | null
  referencia?: string | null
  precio_base: number
  tipo_iva: number
  unidad: string
  activo: boolean
  created_at: string
  updated_at: string
}

export type ProductoInsert = Omit<Producto, 'id' | 'created_at' | 'updated_at'>
export type ProductoUpdate = Partial<ProductoInsert>

// ============================================
// BÚSQUEDA GLOBAL
// ============================================

export interface ResultadoBusqueda {
  clientes: Pick<Cliente, 'id' | 'nombre' | 'empresa' | 'telefono'>[]
  facturas: Pick<Factura, 'id' | 'numero' | 'total' | 'estado'>[]
  presupuestos: Pick<Presupuesto, 'id' | 'numero' | 'total' | 'estado'>[]
}

// ============================================
// DASHBOARD
// ============================================

export interface MetricasDashboard {
  total_clientes: number
  total_presupuestos: number
  total_facturas: number
  importe_pendiente: number
  importe_cobrado_mes: number
}

// ============================================
// SUPABASE DATABASE TYPES (simplificado)
// ============================================

export type Database = {
  public: {
    Tables: {
      configuracion_empresa: {
        Row: ConfiguracionEmpresa
        Insert: Omit<ConfiguracionEmpresa, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ConfiguracionEmpresa, 'id' | 'created_at' | 'updated_at'>>
      }
      clientes: {
        Row: Cliente
        Insert: ClienteInsert
        Update: ClienteUpdate
      }
      presupuestos: {
        Row: Omit<Presupuesto, 'cliente' | 'items'>
        Insert: PresupuestoInsert
        Update: Partial<PresupuestoInsert>
      }
      presupuesto_items: {
        Row: PresupuestoItem
        Insert: PresupuestoItemInsert
        Update: Partial<PresupuestoItemInsert>
      }
      facturas: {
        Row: Omit<Factura, 'cliente' | 'presupuesto' | 'items'>
        Insert: FacturaInsert
        Update: Partial<FacturaInsert>
      }
      factura_items: {
        Row: FacturaItem
        Insert: FacturaItemInsert
        Update: Partial<FacturaItemInsert>
      }
    }
  }
}

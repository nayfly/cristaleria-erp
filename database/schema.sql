-- ================================================================
-- CristaleriaERP — Schema completo
-- Ejecutar en: Supabase → SQL Editor
-- ================================================================

-- ============================================
-- EXTENSIONES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CONFIGURACIÓN DE EMPRESA
-- ============================================
CREATE TABLE IF NOT EXISTS configuracion_empresa (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre                      TEXT NOT NULL DEFAULT 'Mi Cristalería',
  nif                         TEXT,
  direccion                   TEXT,
  codigo_postal               TEXT,
  poblacion                   TEXT,
  provincia                   TEXT,
  telefono                    TEXT,
  email                       TEXT,
  logo_url                    TEXT,
  -- Series y numeración  (formato SERIE/número → "1/41")
  serie_facturas              TEXT NOT NULL DEFAULT '1',
  serie_presupuestos          TEXT NOT NULL DEFAULT '1',
  siguiente_num_factura       INTEGER NOT NULL DEFAULT 41,
  siguiente_num_presupuesto   INTEGER NOT NULL DEFAULT 139,
  -- Configuración fiscal
  iva_defecto                 NUMERIC(5,2) NOT NULL DEFAULT 21.00,
  -- Firma y datos bancarios (pie de los PDFs)
  web                         TEXT,
  nombre_firmante             TEXT,
  banco_nombre                TEXT,
  banco_bic                   TEXT,
  banco_iban                  TEXT,
  paypal_email                TEXT,
  -- Metadatos
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Fila única de configuración
INSERT INTO configuracion_empresa (nombre) VALUES ('Mi Cristalería')
ON CONFLICT DO NOTHING;

-- ============================================
-- CLIENTES
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre          TEXT NOT NULL,
  empresa         TEXT,
  dni_cif         TEXT,
  telefono        TEXT,
  email           TEXT,
  direccion       TEXT,
  codigo_postal   TEXT,
  poblacion       TEXT,
  provincia       TEXT DEFAULT 'Málaga',
  observaciones   TEXT,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  drive_folder_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_nombre    ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_dni_cif   ON clientes(dni_cif);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono  ON clientes(telefono);
CREATE INDEX IF NOT EXISTS idx_clientes_activo    ON clientes(activo);

-- ============================================
-- PRESUPUESTOS
-- ============================================
CREATE TABLE IF NOT EXISTS presupuestos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero          TEXT NOT NULL UNIQUE,         -- formato: 1/139
  cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_validez   DATE,
  estado          TEXT NOT NULL DEFAULT 'borrador'
                  CHECK (estado IN ('borrador','enviado','aceptado','rechazado','facturado')),
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  descuento       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  base_imponible  NUMERIC(10,2) NOT NULL DEFAULT 0,
  iva_porcentaje  NUMERIC(5,2)  NOT NULL DEFAULT 21,
  iva_importe     NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  observaciones   TEXT,
  condiciones     TEXT,
  pdf_url         TEXT,
  drive_file_id   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presupuesto_items (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  presupuesto_id  UUID NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  orden           INTEGER NOT NULL DEFAULT 1,
  descripcion     TEXT NOT NULL,
  cantidad        NUMERIC(10,3) NOT NULL DEFAULT 1,
  unidad          TEXT NOT NULL DEFAULT 'ud',
  precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  descuento       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0   -- base de la línea, sin IVA
);

CREATE INDEX IF NOT EXISTS idx_presupuestos_cliente     ON presupuestos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_estado      ON presupuestos(estado);
CREATE INDEX IF NOT EXISTS idx_presupuestos_fecha       ON presupuestos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_presupuesto_items_parent ON presupuesto_items(presupuesto_id, orden);

-- ============================================
-- FACTURAS
-- ============================================
CREATE TABLE IF NOT EXISTS facturas (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero              TEXT NOT NULL UNIQUE,     -- formato: 1/41
  cliente_id          UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  presupuesto_id      UUID REFERENCES presupuestos(id) ON DELETE SET NULL,
  fecha               DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento   DATE,
  estado              TEXT NOT NULL DEFAULT 'emitida'
                      CHECK (estado IN ('borrador','emitida','enviada','cobrada','anulada')),
  subtotal            NUMERIC(10,2) NOT NULL DEFAULT 0,
  descuento           NUMERIC(5,2)  NOT NULL DEFAULT 0,
  base_imponible      NUMERIC(10,2) NOT NULL DEFAULT 0,
  iva_porcentaje      NUMERIC(5,2)  NOT NULL DEFAULT 21,
  iva_importe         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total               NUMERIC(10,2) NOT NULL DEFAULT 0,
  pagado              BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_cobro         DATE,
  forma_pago          TEXT CHECK (forma_pago IN ('efectivo','transferencia','tarjeta','cheque','otro')),
  observaciones       TEXT,
  pdf_url             TEXT,
  drive_file_id       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS factura_items (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  factura_id      UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  orden           INTEGER NOT NULL DEFAULT 1,
  descripcion     TEXT NOT NULL,
  cantidad        NUMERIC(10,3) NOT NULL DEFAULT 1,
  unidad          TEXT NOT NULL DEFAULT 'ud',
  precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  descuento       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0   -- base de la línea, sin IVA
);

CREATE INDEX IF NOT EXISTS idx_facturas_cliente     ON facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado      ON facturas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_pagado      ON facturas(pagado);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha       ON facturas(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_factura_items_parent ON factura_items(factura_id, orden);

-- ============================================
-- FUNCIÓN: updated_at automático
-- ============================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_configuracion_updated_at
  BEFORE UPDATE ON configuracion_empresa
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_presupuestos_updated_at
  BEFORE UPDATE ON presupuestos
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_facturas_updated_at
  BEFORE UPDATE ON facturas
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================
-- FUNCIÓN: generar número de factura → "1/41"
-- ============================================
CREATE OR REPLACE FUNCTION generar_numero_factura()
RETURNS TEXT AS $$
DECLARE
  config  configuracion_empresa%ROWTYPE;
  numero  TEXT;
BEGIN
  SELECT * INTO config FROM configuracion_empresa LIMIT 1 FOR UPDATE;
  numero := config.serie_facturas || '/' || config.siguiente_num_factura::TEXT;
  UPDATE configuracion_empresa
    SET siguiente_num_factura = siguiente_num_factura + 1;
  RETURN numero;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: generar número de presupuesto → "1/139"
-- ============================================
CREATE OR REPLACE FUNCTION generar_numero_presupuesto()
RETURNS TEXT AS $$
DECLARE
  config  configuracion_empresa%ROWTYPE;
  numero  TEXT;
BEGIN
  SELECT * INTO config FROM configuracion_empresa LIMIT 1 FOR UPDATE;
  numero := config.serie_presupuestos || '/' || config.siguiente_num_presupuesto::TEXT;
  UPDATE configuracion_empresa
    SET siguiente_num_presupuesto = siguiente_num_presupuesto + 1;
  RETURN numero;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: convertir presupuesto → factura
-- ============================================
CREATE OR REPLACE FUNCTION convertir_presupuesto_a_factura(p_presupuesto_id UUID)
RETURNS UUID AS $$
DECLARE
  presupuesto       presupuestos%ROWTYPE;
  nueva_factura_id  UUID;
  nuevo_numero      TEXT;
BEGIN
  SELECT * INTO presupuesto FROM presupuestos WHERE id = p_presupuesto_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Presupuesto no encontrado: %', p_presupuesto_id;
  END IF;

  IF presupuesto.estado = 'facturado' THEN
    RAISE EXCEPTION 'El presupuesto ya ha sido facturado';
  END IF;

  nuevo_numero := generar_numero_factura();

  INSERT INTO facturas (
    numero, cliente_id, presupuesto_id,
    fecha, estado,
    subtotal, descuento, base_imponible,
    iva_porcentaje, iva_importe, total,
    observaciones
  ) VALUES (
    nuevo_numero, presupuesto.cliente_id, presupuesto.id,
    CURRENT_DATE, 'emitida',
    presupuesto.subtotal, presupuesto.descuento, presupuesto.base_imponible,
    presupuesto.iva_porcentaje, presupuesto.iva_importe, presupuesto.total,
    presupuesto.observaciones
  ) RETURNING id INTO nueva_factura_id;

  INSERT INTO factura_items (
    factura_id, orden, descripcion, cantidad, unidad,
    precio_unitario, descuento, total
  )
  SELECT
    nueva_factura_id, orden, descripcion, cantidad, unidad,
    precio_unitario, descuento, total
  FROM presupuesto_items
  WHERE presupuesto_id = p_presupuesto_id
  ORDER BY orden;

  UPDATE presupuestos SET estado = 'facturado' WHERE id = p_presupuesto_id;

  RETURN nueva_factura_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE configuracion_empresa  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuesto_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE factura_items          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_configuracion"     ON configuracion_empresa  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_clientes"          ON clientes               FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_presupuestos"      ON presupuestos           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_presupuesto_items" ON presupuesto_items      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_facturas"          ON facturas               FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_factura_items"     ON factura_items          FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- STORAGE: bucket para PDFs
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_pdfs_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'pdfs');

CREATE POLICY "auth_pdfs_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pdfs');

CREATE POLICY "auth_pdfs_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'pdfs');

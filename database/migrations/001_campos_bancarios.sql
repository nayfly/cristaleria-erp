-- ================================================================
-- Migración 001: Campos bancarios, web y firmante
-- Ejecutar en: Supabase → SQL Editor
-- ================================================================

ALTER TABLE configuracion_empresa
  ADD COLUMN IF NOT EXISTS web              TEXT,
  ADD COLUMN IF NOT EXISTS nombre_firmante  TEXT,
  ADD COLUMN IF NOT EXISTS banco_nombre     TEXT,
  ADD COLUMN IF NOT EXISTS banco_bic        TEXT,
  ADD COLUMN IF NOT EXISTS banco_iban       TEXT,
  ADD COLUMN IF NOT EXISTS paypal_email     TEXT;

-- ================================================================
-- Datos reales de Cristalería y Aluminios de Torrox Costa
-- Ajusta los valores antes de ejecutar si son distintos.
-- ================================================================
UPDATE configuracion_empresa SET
  nombre             = 'Cristalería y Aluminios de Torrox Costa (Desde 1986)',
  nif                = '52584635B',
  telefono           = '0034683117711',
  email              = 'alucrisvr@gmail.com',
  web                = 'https://www.cristaleriayaluminiostorroxcosta.com/',
  nombre_firmante    = 'Juan Antonio Valle Alés',
  banco_nombre       = 'Cajamar. Caja Rural .Sociedad cooperativa de crédito (TORROX -COSTA)',
  banco_bic          = 'CCRIES2AXXX',
  banco_iban         = 'ES97 3058 0856 7228 1036 0049',
  paypal_email       = 'alucrisvr@gmail.com',
  -- Numeración: serie 1, siguiente número = 41 (la 1/40 ya está emitida)
  serie_facturas          = '1',
  siguiente_num_factura   = 41,
  -- Numeración: siguiente presupuesto = 139 (el 1/138 ya está emitido)
  serie_presupuestos      = '1',
  siguiente_num_presupuesto = 139,
  iva_defecto        = 21
WHERE id = (SELECT id FROM configuracion_empresa LIMIT 1);

-- ================================================================
-- FIX COMPLETO — Ejecutar en Supabase → SQL Editor
-- Incluye: migraciones pendientes + fix de funciones RPC
-- ================================================================

-- ── 1. Añadir columnas que faltaban (migración 001) ──────────────
ALTER TABLE configuracion_empresa
  ADD COLUMN IF NOT EXISTS web              TEXT,
  ADD COLUMN IF NOT EXISTS nombre_firmante  TEXT,
  ADD COLUMN IF NOT EXISTS banco_nombre     TEXT,
  ADD COLUMN IF NOT EXISTS banco_bic        TEXT,
  ADD COLUMN IF NOT EXISTS banco_iban       TEXT,
  ADD COLUMN IF NOT EXISTS paypal_email     TEXT;

-- ── 2. Asegurarse de que existe la fila de configuración ─────────
INSERT INTO configuracion_empresa (nombre)
VALUES ('Cristalería y Aluminios de Torrox Costa (Desde 1986)')
ON CONFLICT DO NOTHING;

-- ── 3. Rellenar con los datos reales del suegro ──────────────────
UPDATE configuracion_empresa SET
  nombre                    = 'Cristalería y Aluminios de Torrox Costa (Desde 1986)',
  nif                       = '52584635B',
  telefono                  = '0034683117711',
  email                     = 'alucrisvr@gmail.com',
  web                       = 'https://www.cristaleriayaluminiostorroxcosta.com/',
  nombre_firmante           = 'Juan Antonio Valle Alés',
  banco_nombre              = 'Cajamar. Caja Rural .Sociedad cooperativa de crédito (TORROX -COSTA)',
  banco_bic                 = 'CCRIES2AXXX',
  banco_iban                = 'ES97 3058 0856 7228 1036 0049',
  paypal_email              = 'alucrisvr@gmail.com',
  serie_facturas            = '1',
  siguiente_num_factura     = 41,
  serie_presupuestos        = '1',
  siguiente_num_presupuesto = 139,
  iva_defecto               = 21
WHERE id = (SELECT id FROM configuracion_empresa LIMIT 1);

-- ── 4. Recrear funciones con SECURITY DEFINER ────────────────────
-- Sin SECURITY DEFINER, el anon key del navegador no puede hacer
-- UPDATE en configuracion_empresa aunque sea dentro de una RPC.
-- SECURITY DEFINER hace que la función se ejecute como el owner
-- (postgres) que sí tiene permisos totales.

CREATE OR REPLACE FUNCTION generar_numero_factura()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config  configuracion_empresa%ROWTYPE;
  numero  TEXT;
BEGIN
  SELECT * INTO config FROM configuracion_empresa LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay configuración de empresa';
  END IF;
  numero := config.serie_facturas || '/' || config.siguiente_num_factura::TEXT;
  UPDATE configuracion_empresa
    SET siguiente_num_factura = siguiente_num_factura + 1;
  RETURN numero;
END;
$$;

CREATE OR REPLACE FUNCTION generar_numero_presupuesto()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config  configuracion_empresa%ROWTYPE;
  numero  TEXT;
BEGIN
  SELECT * INTO config FROM configuracion_empresa LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay configuración de empresa';
  END IF;
  numero := config.serie_presupuestos || '/' || config.siguiente_num_presupuesto::TEXT;
  UPDATE configuracion_empresa
    SET siguiente_num_presupuesto = siguiente_num_presupuesto + 1;
  RETURN numero;
END;
$$;

CREATE OR REPLACE FUNCTION convertir_presupuesto_a_factura(p_presupuesto_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ── 5. Dar permisos de ejecución a usuarios autenticados ─────────
GRANT EXECUTE ON FUNCTION generar_numero_factura() TO authenticated;
GRANT EXECUTE ON FUNCTION generar_numero_presupuesto() TO authenticated;
GRANT EXECUTE ON FUNCTION convertir_presupuesto_a_factura(UUID) TO authenticated;

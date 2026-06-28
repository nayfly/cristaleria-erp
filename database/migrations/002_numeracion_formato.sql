-- ================================================================
-- Migración 002: Cambiar formato de numeración
-- De: FAC-2026-001
-- A:  1/40  (serie/número correlativo, sin año)
-- ================================================================

-- El suegro usa un número secuencial simple, sin año.
-- La "serie" es el año o una letra, el número va incrementando.
-- Formato real observado: 1/40, 1/138

CREATE OR REPLACE FUNCTION generar_numero_factura()
RETURNS TEXT AS $$
DECLARE
  config  configuracion_empresa%ROWTYPE;
  numero  TEXT;
BEGIN
  SELECT * INTO config FROM configuracion_empresa LIMIT 1 FOR UPDATE;
  -- Formato: serie/número  →  1/40
  numero := config.serie_facturas || '/' || config.siguiente_num_factura::TEXT;
  UPDATE configuracion_empresa
    SET siguiente_num_factura = siguiente_num_factura + 1;
  RETURN numero;
END;
$$ LANGUAGE plpgsql;

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

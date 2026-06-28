import { StyleSheet } from '@react-pdf/renderer'

// Colores del template real de Cristalería y Aluminios de Torrox Costa
export const COLORES = {
  azulOscuro:  '#003087',   // azul oscuro del nombre empresa en cabecera
  azulTitulo:  '#1565C0',   // azul del título FACTURA / ESTIMAR
  azulTabla:   '#1E88E5',   // azul cabecera tabla productos
  azulTotal:   '#1565C0',   // azul Grand Total
  negro:       '#000000',
  gris900:     '#1A1A1A',
  gris700:     '#444444',
  gris500:     '#777777',
  gris300:     '#BBBBBB',
  gris100:     '#F5F5F5',
  blanco:      '#FFFFFF',
  amarilloTotal: '#F5C518',  // amarillo del Grand Total
}

export const estilosBase = StyleSheet.create({
  pagina: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: COLORES.gris900,
    backgroundColor: COLORES.blanco,
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 35,
  },

  // ---- CABECERA ----
  cabecera: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 16,
  },
  logoPlaceholder: {
    width: 80,
    height: 50,
    borderWidth: 1,
    borderColor: COLORES.gris300,
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoImage: {
    width: 80,
    height: 50,
    objectFit: 'contain',
  },
  cabeceraTexto: {
    flex: 1,
  },
  nombreEmpresa: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: COLORES.azulOscuro,
    marginBottom: 3,
  },
  datosCabecera: {
    fontSize: 8,
    color: COLORES.gris700,
    lineHeight: 1.5,
  },

  // ---- LÍNEA SEPARADORA ----
  separador: {
    height: 1,
    backgroundColor: COLORES.gris300,
    marginBottom: 10,
  },

  // ---- TÍTULO (FACTURA / ESTIMAR) ----
  contenedorTitulo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  titulo: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: COLORES.azulTitulo,
    letterSpacing: 1,
  },

  // ---- BLOQUE COBRAR A / ENVÍE A / NÚMERO ----
  bloqueClientes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  bloqueClienteIzq: {
    flex: 1,
  },
  bloqueClienteDer: {
    flex: 1,
  },
  bloqueNumero: {
    width: 120,
    alignItems: 'flex-end',
  },
  etiquetaBloque: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORES.azulOscuro,
    marginBottom: 3,
  },
  nombreClientePDF: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORES.negro,
    marginBottom: 2,
  },
  datosClientePDF: {
    fontSize: 8,
    color: COLORES.gris700,
    lineHeight: 1.5,
  },
  numeroPDF: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORES.azulOscuro,
  },
  fechaPDF: {
    fontSize: 8,
    color: COLORES.gris700,
    marginTop: 2,
  },

  // ---- TABLA ----
  tablaHeader: {
    flexDirection: 'row',
    backgroundColor: COLORES.azulTabla,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tablaFila: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.gris100,
    minHeight: 20,
  },
  tablaFilaPar: {
    backgroundColor: COLORES.gris100,
  },

  // Columnas tabla — proporciones del PDF original
  colProducto:   { flex: 4 },
  colCantidad:   { width: 50, textAlign: 'center' },
  colTarifa:     { width: 55, textAlign: 'right' },
  colIVA:        { width: 50, textAlign: 'right' },
  colImporte:    { width: 55, textAlign: 'right' },

  headerText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORES.blanco,
  },
  celdaTexto: {
    fontSize: 8.5,
    color: COLORES.gris900,
  },
  celdaNegrita: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: COLORES.negro,
  },
  celdaGris: {
    fontSize: 8,
    color: COLORES.gris500,
  },

  // ---- BLOQUE TOTALES (derecha) ----
  contenedorTotales: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  bloqueTotales: {
    width: 200,
  },
  filaTotales: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  etiquetaTotales: {
    fontSize: 8.5,
    color: COLORES.gris700,
  },
  valorTotales: {
    fontSize: 8.5,
    color: COLORES.gris900,
  },
  filaTotalParcial: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: COLORES.gris300,
    marginTop: 2,
  },
  etiquetaTotalParcial: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORES.negro,
  },
  valorTotalParcial: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORES.negro,
  },
  filaGrandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORES.azulTotal,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  etiquetaGrandTotal: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORES.blanco,
  },
  valorGrandTotal: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORES.blanco,
  },

  // ---- PLEASE NOTE ----
  contenedorNota: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 16,
  },
  bloqueNota: {
    flex: 1,
  },
  etiquetaNota: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORES.azulOscuro,
    borderTopWidth: 1,
    borderTopColor: COLORES.gris300,
    paddingTop: 4,
    marginBottom: 4,
  },
  textoNota: {
    fontSize: 7.5,
    color: COLORES.gris700,
    lineHeight: 1.6,
  },

  // ---- FIRMA ----
  bloqueTotal_y_firma: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  bloqueNotaIzq: {
    flex: 1,
  },
  bloqueFirma: {
    width: 200,
    alignItems: 'flex-end',
  },
  textoFirma: {
    fontSize: 8,
    color: COLORES.negro,
    textAlign: 'right',
    lineHeight: 1.5,
  },
  etiquetaFirma: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORES.negro,
    textAlign: 'right',
    marginTop: 4,
  },

  // ---- PIE DE PÁGINA (datos bancarios) ----
  pie: {
    position: 'absolute',
    bottom: 24,
    left: 35,
    right: 35,
    borderTopWidth: 1,
    borderTopColor: COLORES.gris300,
    paddingTop: 8,
    flexDirection: 'row',
    gap: 16,
  },
  bloqueGris: {
    flex: 1,
    backgroundColor: COLORES.gris100,
    padding: 6,
    borderRadius: 3,
  },
  etiquetaPie: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: COLORES.gris700,
    marginBottom: 3,
  },
  textoPie: {
    fontSize: 7,
    color: COLORES.gris700,
    lineHeight: 1.5,
  },
})

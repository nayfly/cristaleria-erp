import {
  Document,
  Page,
  Text,
  View,
  Image,
} from '@react-pdf/renderer'
import { estilosBase } from './estilos-pdf'
import type { Factura, FacturaItem, Cliente, ConfiguracionEmpresa } from '@/types'

interface FacturaPDFProps {
  factura: Factura & { items: FacturaItem[]; cliente: Cliente }
  empresa: ConfiguracionEmpresa
}

// Formato numérico español sin símbolo €
function eur(n: number) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function fecha(d: string) {
  const [year, month, day] = d.split('-')
  return `${day}-${month}-${year}`
}

// item.total = base de la línea (precio × cantidad × (1 - dto%))
// El IVA de la línea = base × (iva% / 100)
// El importe final = base + iva
function calcularLinea(item: FacturaItem, ivaPct: number) {
  const base     = Number(item.total)          // ya guardado en DB como base
  const ivaLinea = base * (ivaPct / 100)
  const importe  = base + ivaLinea
  return { base, ivaLinea, importe }
}

export function FacturaPDF({ factura, empresa }: FacturaPDFProps) {
  const cliente = factura.cliente
  const nombreMostrar = cliente.empresa ?? cliente.nombre
  const nombrePersona = cliente.empresa ? cliente.nombre : undefined

  return (
    <Document
      title={`FACTURA ${factura.numero}`}
      author={empresa.nombre}
      creator="CristaleriaERP"
    >
      <Page size="A4" style={estilosBase.pagina}>

        {/* ── CABECERA ── */}
        <View style={estilosBase.cabecera}>
          {empresa.logo_url ? (
            <Image src={empresa.logo_url} style={estilosBase.logoImage} />
          ) : (
            <View style={estilosBase.logoPlaceholder}>
              <Text style={{ fontSize: 6, color: '#BBBBBB', textAlign: 'center' }}>Logo</Text>
            </View>
          )}
          <View style={estilosBase.cabeceraTexto}>
            <Text style={estilosBase.nombreEmpresa}>{empresa.nombre}</Text>
            <Text style={estilosBase.datosCabecera}>
              {[
                empresa.telefono,
                empresa.email,
                empresa.web,
                empresa.nif ? `NIF/ CIF: ${empresa.nombre_firmante} ${empresa.nif}` : null,
              ].filter(Boolean).join('\n')}
            </Text>
          </View>
        </View>

        <View style={estilosBase.separador} />

        {/* ── TÍTULO ── */}
        <View style={estilosBase.contenedorTitulo}>
          <Text style={estilosBase.titulo}>FACTURA</Text>
        </View>

        {/* ── COBRAR A / ENVÍE A / NÚMERO ── */}
        <View style={estilosBase.bloqueClientes}>
          <View style={estilosBase.bloqueClienteIzq}>
            <Text style={estilosBase.etiquetaBloque}>Cobrar a</Text>
            <Text style={estilosBase.nombreClientePDF}>{nombreMostrar}</Text>
            <Text style={estilosBase.datosClientePDF}>
              {[
                nombrePersona,
                cliente.direccion,
                cliente.poblacion,
                [cliente.codigo_postal, cliente.provincia].filter(Boolean).join(' '),
                cliente.email,
                cliente.telefono,
                cliente.dni_cif ? `NIF/ CIF: ${cliente.dni_cif}` : null,
              ].filter(Boolean).join('\n')}
            </Text>
          </View>

          <View style={estilosBase.bloqueClienteDer}>
            <Text style={estilosBase.etiquetaBloque}>Envie a</Text>
            <Text style={estilosBase.datosClientePDF}>{cliente.email ?? ''}</Text>
          </View>

          <View style={estilosBase.bloqueNumero}>
            <Text style={estilosBase.numeroPDF}>{factura.numero}</Text>
            <Text style={estilosBase.fechaPDF}>{fecha(factura.fecha)}</Text>
          </View>
        </View>

        {/* ── TABLA ── */}
        <View style={estilosBase.tablaHeader}>
          <Text style={[estilosBase.headerText, estilosBase.colProducto]}>Producto</Text>
          <Text style={[estilosBase.headerText, estilosBase.colCantidad]}>Cantidad</Text>
          <Text style={[estilosBase.headerText, estilosBase.colTarifa]}>Tarifa</Text>
          <Text style={[estilosBase.headerText, estilosBase.colIVA]}>IVA</Text>
          <Text style={[estilosBase.headerText, estilosBase.colImporte]}>Importe</Text>
        </View>

        {factura.items.map((item, i) => {
          const { ivaLinea, importe } = calcularLinea(item, factura.iva_porcentaje)
          return (
            <View
              key={item.id}
              style={[estilosBase.tablaFila, i % 2 === 1 ? estilosBase.tablaFilaPar : {}]}
            >
              {/* Descripción */}
              <View style={estilosBase.colProducto}>
                <Text style={estilosBase.celdaNegrita}>{item.descripcion}</Text>
              </View>

              {/* Cantidad + unidad */}
              <View style={estilosBase.colCantidad}>
                <Text style={[estilosBase.celdaTexto, { textAlign: 'center' }]}>
                  {Number(item.cantidad) % 1 === 0
                    ? Number(item.cantidad).toFixed(0)
                    : Number(item.cantidad).toString()}
                </Text>
                <Text style={[estilosBase.celdaGris, { textAlign: 'center' }]}>
                  {item.unidad === 'ud' ? 'Pcs' : item.unidad}
                </Text>
              </View>

              {/* Tarifa (precio base unitario) */}
              <Text style={[estilosBase.celdaTexto, estilosBase.colTarifa]}>
                {eur(item.precio_unitario)}
              </Text>

              {/* IVA: importe + porcentaje */}
              <View style={estilosBase.colIVA}>
                <Text style={[estilosBase.celdaTexto, { textAlign: 'right' }]}>
                  {eur(ivaLinea)}
                </Text>
                <Text style={[estilosBase.celdaGris, { textAlign: 'right' }]}>
                  {Number(factura.iva_porcentaje).toFixed(2)}%
                </Text>
              </View>

              {/* Importe total (base + IVA) */}
              <Text style={[estilosBase.celdaNegrita, estilosBase.colImporte]}>
                {eur(importe)}
              </Text>
            </View>
          )
        })}

        {/* ── PLEASE NOTE + TOTALES ── */}
        <View style={estilosBase.contenedorNota}>
          <View style={estilosBase.bloqueNota}>
            <Text style={estilosBase.etiquetaNota}>Please Note</Text>
            {factura.observaciones ? (
              <Text style={estilosBase.textoNota}>{factura.observaciones}</Text>
            ) : null}
          </View>

          <View style={estilosBase.bloqueTotales}>
            <View style={estilosBase.filaTotales}>
              <Text style={estilosBase.etiquetaTotales}>Cantidad base</Text>
              <Text style={estilosBase.valorTotales}>{eur(factura.base_imponible)} €</Text>
            </View>
            <View style={estilosBase.filaTotales}>
              <Text style={estilosBase.etiquetaTotales}>
                (+) IVA: {Number(factura.iva_porcentaje).toFixed(2)}%
              </Text>
              <Text style={estilosBase.valorTotales}>{eur(factura.iva_importe)} €</Text>
            </View>
            <View style={estilosBase.filaTotalParcial}>
              <Text style={estilosBase.etiquetaTotalParcial}>Total parcial</Text>
              <Text style={estilosBase.valorTotalParcial}>{eur(factura.total)} €</Text>
            </View>
            <View style={estilosBase.filaGrandTotal}>
              <Text style={estilosBase.etiquetaGrandTotal}>Grand Total</Text>
              <Text style={estilosBase.valorGrandTotal}>{eur(factura.total)} €</Text>
            </View>
          </View>
        </View>

        {/* ── FIRMA ── */}
        <View style={[estilosBase.bloqueFirma, { alignSelf: 'flex-end', marginTop: 20 }]}>
          <Text style={estilosBase.textoFirma}>{empresa.nombre_firmante ?? empresa.nombre}</Text>
          <Text style={estilosBase.textoFirma}>{empresa.nombre}</Text>
          <Text style={estilosBase.etiquetaFirma}>Firma</Text>
        </View>

        {/* ── PIE ── */}
        <View style={estilosBase.pie} fixed>
          <View style={estilosBase.bloqueGris}>
            <Text style={estilosBase.etiquetaPie}>A NOMBRE DE</Text>
            <Text style={estilosBase.textoPie}>{empresa.nombre_firmante ?? empresa.nombre}</Text>
          </View>
          <View style={[estilosBase.bloqueGris, { flex: 2 }]}>
            <Text style={estilosBase.etiquetaPie}>Datos bancarios</Text>
            <Text style={estilosBase.textoPie}>
              {[
                empresa.banco_nombre,
                empresa.banco_bic ? `Bic/Swift ${empresa.banco_bic}` : null,
                empresa.banco_iban,
              ].filter(Boolean).join('\n')}
            </Text>
          </View>
          <View style={estilosBase.bloqueGris}>
            <Text style={estilosBase.etiquetaPie}>DETALLES DE PAYPAL</Text>
            <Text style={estilosBase.textoPie}>
              {[
                empresa.paypal_email ?? empresa.email,
                empresa.telefono ? `Tlf : ${empresa.telefono}` : null,
              ].filter(Boolean).join('\n')}
            </Text>
          </View>
        </View>

      </Page>
    </Document>
  )
}

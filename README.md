# 🌱 AgroFertil ERP / CRM - Sistema Integral de Fertirriego, SUNAT, Compras y Módulo Técnico

**AgroFertil ERP/CRM** es una solución web integral y modular de grado empresarial diseñada específicamente para la **venta de productos e insumos agrícolas** y el **ensamblaje/instalación técnica de mesas de fertilización en campo**, con facturación electrónica **SUNAT (UBL 2.1)** y compras automáticas por proveedor.

---

## 🏛️ Arquitectura de los Tres Frontends / Portals

El sistema implementa los tres frontends/interfaces principales especificados en la guía técnica:

1. **[Portal Web Público & Cotizador en Vivo](file:///home/joserh-kent/Escritorio/proyect_mpv/src/app/cotizador/page.tsx)** (`/cotizador`):
   - Selector de tipo de operación: `SOLO_VENTA` de insumos vs `VENTA_ARMADO` de mesas de fertilización.
   - Catálogo interactivo de equipos, bombas dosificadoras, inyectores Venturi, manifold PVC C-80, controladores y fertilizantes.
   - **Consulta de RUC (11 dígitos) y DNI (8 dígitos) con API SUNAT/RENIEC**: autocompletado en tiempo real de Razón Social, Dirección Fiscal y estado de contribuyente (ACTIVO / HABIDO).
   - Generación de Cotización Oficial con numeración correlativa (`COT-2026-XXX`), cálculo de Subtotal, IGV (18%), Total y vista de impresión/PDF oficial.

2. **[Panel Administrativo ERP / CRM](file:///home/joserh-kent/Escritorio/proyect_mpv/src/app/admin/page.tsx)** (`/admin`):
   - **Gestión de Cotizaciones** (`/admin/cotizaciones`): Aprobación con 1-clic y **Generador automático de Órdenes de Compra agrupadas por proveedor**.
   - **Módulo de Compras & Abastecimiento** (`/admin/compras`): Seguimiento de OCs (`BORRADOR` → `ENVIADO` → `RECIBIDO`), recepción de mercadería con registro de Facturas de Proveedores en Cuentas por Pagar y actualización automática de stock.
   - **Facturación Electrónica SUNAT** (`/admin/sunat`): Emisión de Facturas (`F001`), Boletas (`B001`) y Guías de Remisión con generación de firma digital Hash SHA-256, código QR oficial, descarga de XML UBL 2.1 y Constancias de Recepción CDR (ZIP).
   - **Supervisión de Órdenes de Trabajo** (`/admin/ordenes-trabajo`): Asignación de técnicos y visualización de bitácoras de campo.
   - **Control de Inventario & Stock** (`/admin/inventario`): Costo de compra, precio de venta, proveedor asociado y stock actual.
   - **Directorio de Proveedores y Clientes** (`/admin/proveedores`, `/admin/clientes`).

3. **[Portal Técnico de Campo Móvil](file:///home/joserh-kent/Escritorio/proyect_mpv/src/app/tecnico/page.tsx)** (`/tecnico`):
   - Optimizado para smartphones y tablets en fundos agrícolas.
   - Control de estado de la Orden de Trabajo (`PENDIENTE` → `EN_PROCESO` → `FINALIZADO`).
   - **Bitácora de Instalación en Vivo**: registro cronológico de hitos, carga de fotografías de avance y reporte de materiales extra.
   - **Canvas táctil para Firma Digital del Cliente en Pantalla** al entregar la mesa conforme.
   - **Generación y descarga del Informe Técnico Final en PDF**.

---

## 🗄️ Modelo Relacional de Base de Datos (PostgreSQL)

El script SQL completo y listo para producción se encuentra en [`supabase/erp_schema.sql`](file:///home/joserh-kent/Escritorio/proyect_mpv/supabase/erp_schema.sql) con las tablas:

1. `usuarios` (id, nombre, email, password_hash, rol [ADMIN, TECNICO, CLIENTE])
2. `clientes` (id, tipo_doc, num_doc, razon_social, direccion, email, telefono, estado, condicion)
3. `proveedores` (id, ruc, razon_social, email, telefono, contacto, direccion)
4. `productos` (id, codigo, nombre, descripcion, categoria, precio_venta, costo_compra, proveedor_id, stock, unidad_medida)
5. `cotizaciones` (id, numero, cliente_id, tipo_operacion, estado, subtotal, igv, total, moneda, incluye_mano_obra)
6. `cotizacion_detalles` (id, cotizacion_id, producto_id, cantidad, precio_unitario, costo_unitario, subtotal)
7. `ordenes_compra` (id, numero, proveedor_id, cotizacion_id, fecha, estado [BORRADOR, ENVIADO, RECIBIDO], monto_total)
8. `orden_compra_detalles` (id, orden_compra_id, producto_id, cantidad, costo_unitario, subtotal)
9. `facturas_compras` (id, proveedor_id, orden_compra_id, numero_factura, fecha_emision, monto_total)
10. `comprobantes_sunat` (id, cotizacion_id, tipo_comprobante, serie, numero, xml_url, cdr_url, pdf_url, estado_sunat, hash_cpe, qr_data)
11. `ordenes_trabajo` (id, cotizacion_id, tecnico_id, fecha_programada, estado, observaciones, firma_cliente_url)
12. `bitacora_tecnica` (id, orden_trabajo_id, hito, nota, foto_url, materiales_extra, fecha_registro, hora_registro)

---

## 🔄 Flujos Operativos Implementados

### Caso 1: Solo Venta de Productos (Bajo Pedido)
1. **Cliente:** Cotiza productos en `/cotizador` ingresando su RUC/DNI.
2. **Admin:** Revisa en `/admin/cotizaciones`, presiona **"Aprobar"** y luego **"Generar OCs"**.
3. **Sistema:** Agrupa automáticamente los productos según su `proveedor_id` y crea las Órdenes de Compra (`OC-2026-001`, `OC-2026-002`).
4. **Compras:** En `/admin/compras`, el administrador marca la OC como **"Recepcionar"**, ingresa el número de factura del proveedor y el stock se actualiza.
5. **SUNAT:** En `/admin/cotizaciones` presiona **"Facturar SUNAT"** para emitir la Factura Electrónica UBL 2.1 con su CDR.

### Caso 2: Venta + Armado de Mesa de Fertilización
1. **Cliente:** Cotiza en `/cotizador` seleccionando `Venta + Armado en Fundo`.
2. **Admin:** Aprueba cotización y presiona **"Asignar Técnico"** seleccionando la fecha programada.
3. **Compras:** Genera las OCs para pedir las bombas booster, tuberías PVC C-80 y controladores de fertirriego.
4. **Técnico en Campo:** Abre `/tecnico` en su móvil, inicia trabajo, sube fotos de la bitácora y recopila la **firma con el dedo del cliente**.
5. **Cierre:** Al finalizar, el sistema genera el **Informe Técnico en PDF** y emite la Factura Electrónica SUNAT.

---

## 🚀 Cómo Ejecutar el Proyecto

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Abrir en el navegador
# Landing General:        http://localhost:3000
# Cotizador Público:      http://localhost:3000/cotizador
# Panel Administrativo:   http://localhost:3000/admin
# App Técnico Móvil:      http://localhost:3000/tecnico
```

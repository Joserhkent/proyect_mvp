import ExcelJS from 'exceljs';

export interface ColumnaExport<T> {
  header: string;
  key: string;
  width?: number;
  valor: (fila: T) => string | number | null | undefined;
  formatoNumero?: string;
}

/**
 * Genera un archivo .xlsx en el navegador a partir de una lista de filas y
 * la descarga directamente. Pensado para los reportes de listas del panel
 * (cotizaciones, compras, inventario, comprobantes SUNAT, etc.).
 */
export async function exportarExcel<T>(
  nombreArchivo: string,
  nombreHoja: string,
  columnas: ColumnaExport<T>[],
  filas: T[]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AgroFertil ERP';
  workbook.created = new Date();

  const hoja = workbook.addWorksheet(nombreHoja);
  hoja.columns = columnas.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }));

  const filaEncabezado = hoja.getRow(1);
  filaEncabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  filaEncabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
  filaEncabezado.alignment = { vertical: 'middle' };

  filas.forEach((fila) => {
    const registro: Record<string, string | number | null | undefined> = {};
    columnas.forEach((c) => {
      registro[c.key] = c.valor(fila);
    });
    const filaHoja = hoja.addRow(registro);
    columnas.forEach((c, i) => {
      if (c.formatoNumero) {
        filaHoja.getCell(i + 1).numFmt = c.formatoNumero;
      }
    });
  });

  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
  hoja.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

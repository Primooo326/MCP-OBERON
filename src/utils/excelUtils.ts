import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { LOCAL_URL } from '../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function exportToExcel(data: any[], filenamePrefix: string = 'export'): Promise<{ filename: string; url: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${filenamePrefix}-${timestamp}.xlsx`;
    const assetsDir = path.join(__dirname, '../downloads');

    // Asegurar que el directorio assets existe
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    const fullPath = path.join(assetsDir, filename);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(filenamePrefix);

    if (data.length > 0) {
        // Headers: keys del primer objeto
        const headers = Object.keys(data[0]);
        worksheet.addRow(headers);
        worksheet.getRow(1).font = { bold: true };

        // Rows de data
        data.forEach(rowData => {
            const row = headers.map(header => rowData[header] ?? '');
            worksheet.addRow(row);
        });

        // Ajustar ancho de columnas
        worksheet.columns = headers.map(header => ({ width: Math.max(10, header.length + 2) }));
    } else {
        // Excel vacío
        worksheet.addRow(['No data available']);
    }

    await workbook.xlsx.writeFile(fullPath);

    const url = `${LOCAL_URL}/downloads/${filename}`;

    return { filename, url };
}
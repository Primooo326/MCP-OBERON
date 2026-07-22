import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AxiosInstance } from "axios";
import z from "zod";
import { logToolExecution } from "../logging.js";
import { exportToExcel } from "../utils/excelUtils.js";


function translateFilterKeys(filterObj: any, titleToIdMap: Map<string, string>): any {
    if (typeof filterObj !== 'object' || filterObj === null) return filterObj;
    if (Array.isArray(filterObj)) return filterObj.map(item => translateFilterKeys(item, titleToIdMap));
    const newFilter: { [key: string]: any } = {};
    for (const key in filterObj) {
        if (titleToIdMap.has(key)) {
            const columnId = titleToIdMap.get(key)!;
            newFilter[columnId] = translateFilterKeys(filterObj[key], titleToIdMap);
        } else if (key.startsWith('$')) {
            newFilter[key] = translateFilterKeys(filterObj[key], titleToIdMap);
        } else {
            newFilter[key] = translateFilterKeys(filterObj[key], titleToIdMap);
        }
    }
    return newFilter;
}

const DATE_OPS = new Set(['between', 'gte', 'lte', 'gt', 'lt']);

function extractDateFilters(filterObj: any, dateColumns: Set<string>): { apiFilter: any, dateFilter: any } {
    if (typeof filterObj !== 'object' || filterObj === null) return { apiFilter: filterObj, dateFilter: null };
    if (Array.isArray(filterObj)) {
        const results = filterObj.map(item => extractDateFilters(item, dateColumns));
        const apiItems = results.map(r => r.apiFilter).filter(f => f !== null && (typeof f !== 'object' || Object.keys(f).length > 0));
        const dateItems = results.map(r => r.dateFilter).filter(Boolean);
        return {
            apiFilter: apiItems.length > 0 ? apiItems : null,
            dateFilter: dateItems.length > 0 ? dateItems : null
        };
    }
    const apiFilter: any = {};
    const dateComparisons: any[] = [];
    for (const key in filterObj) {
        if (key.startsWith('$')) {
            const { apiFilter: nestedApi, dateFilter: nestedDate } = extractDateFilters(filterObj[key], dateColumns);
            if (nestedApi !== null && (Array.isArray(nestedApi) ? nestedApi.length > 0 : Object.keys(nestedApi).length > 0)) {
                apiFilter[key] = nestedApi;
            }
            if (nestedDate) {
                dateComparisons.push(...(Array.isArray(nestedDate) ? nestedDate : [nestedDate]));
            }
        } else if (dateColumns.has(key)) {
            const value = filterObj[key];
            if (typeof value === 'object' && value !== null) {
                const dateOps: any = {};
                const otherOps: any = {};
                for (const op in value) {
                    if (DATE_OPS.has(op)) {
                        dateOps[op] = value[op];
                    } else {
                        otherOps[op] = value[op];
                    }
                }
                if (Object.keys(dateOps).length > 0) {
                    dateComparisons.push({ columnId: key, operators: dateOps });
                }
                if (Object.keys(otherOps).length > 0) {
                    apiFilter[key] = otherOps;
                }
            } else {
                apiFilter[key] = value;
            }
        } else {
            apiFilter[key] = filterObj[key];
        }
    }
    return {
        apiFilter: Object.keys(apiFilter).length > 0 ? apiFilter : null,
        dateFilter: dateComparisons.length > 0 ? dateComparisons : null
    };
}

function applyDateFilter(records: any[], dateComparisons: any[]): any[] {
    if (!dateComparisons || dateComparisons.length === 0) return records;

    function toDate(value: any): Date | null {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return new Date(value + 'T00:00:00.000-05:00');
        }
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }

    return records.filter(record => {
        return dateComparisons.every((dc: any) => {
            const value = record[dc.columnId];
            if (value === undefined || value === null) return false;
            const date = toDate(value);
            if (!date) return false;
            const dateMs = date.getTime();

            for (const [op, opValue] of Object.entries(dc.operators)) {
                if (op === 'between' && Array.isArray(opValue) && opValue.length === 2) {
                    const from = toDate(opValue[0]);
                    let to = toDate(opValue[1]);
                    if (!from || !to) return false;
                    if (typeof opValue[1] === 'string' && opValue[1].length === 10 && !opValue[1].includes('T')) {
                        to = new Date(opValue[1] + 'T23:59:59.999-05:00');
                    }
                    if (dateMs < from.getTime() || dateMs > to.getTime()) return false;
                } else if (op === 'gte') {
                    const cmp = toDate(opValue as string);
                    if (!cmp || dateMs < cmp.getTime()) return false;
                } else if (op === 'lte') {
                    let cmp = toDate(opValue as string);
                    if (!cmp) return false;
                    if (typeof opValue === 'string' && opValue.length === 10 && !opValue.includes('T')) {
                        cmp = new Date(opValue + 'T23:59:59.999-05:00');
                    }
                    if (dateMs > cmp.getTime()) return false;
                } else if (op === 'gt') {
                    const cmp = toDate(opValue as string);
                    if (!cmp || dateMs <= cmp.getTime()) return false;
                } else if (op === 'lt') {
                    const cmp = toDate(opValue as string);
                    if (!cmp || dateMs >= cmp.getTime()) return false;
                }
            }
            return true;
        });
    });
}
    }
    return newFilter;
}

export const registerFunctionalitiesTool = (server: McpServer, apiClient: AxiosInstance) => {

    server.tool(
        "Obtener_Funcionalidades",
        "Busca y devuelve DEFINICIONES de funcionalidades (admin) usando un filtro JSON complejo. Útil para búsquedas avanzadas con múltiples condiciones. Devuelve datos en formato JSON parseable en el campo 'text'. Si exportToExcel=true, genera un archivo Excel descargable en /assets/ con timestamp.",
        {
            filtro: z.record(z.string(), z.any()).describe(`Objeto de filtro JSON. Ejemplo: { "$and": [{ "moduleType": { "equals": 2 } }, {"name": {"contains": "Reporte"}}] }`),
            cantidad: z.number().optional().default(10),
            pagina: z.number().optional().default(1),
            exportToExcel: z.boolean().optional().default(false).describe("Si true, genera y retorna URL para descargar datos en Excel.")
        },
        async (params) => {
            const toolName = "Buscar Funcionalidades";
            await logToolExecution({ level: 'INFO', toolName, parameters: params, status: 'STARTED', message: 'Iniciando búsqueda de funcionalidades.' });
            try {
                const body = { filters: { columns: [params.filtro] }, discriminatedLocation: false };
                const pageOptions = { take: params.cantidad, page: params.pagina, order: 'DESC' };
                const response = await apiClient.post('/functionalities/admin/findAllFilters', body, { params: pageOptions });
                const funcionalidades = response.data.data;
                const meta = response.data.meta;

                if (!funcionalidades || funcionalidades.length === 0) {
                    await logToolExecution({ level: 'INFO', toolName, parameters: params, status: 'SUCCESS', message: 'No se encontraron funcionalidades.' });
                    const jsonResponse = JSON.stringify({
                        type: "list",
                        data: [],
                        count: 0,
                        meta: meta || {}
                    }, null, 2);
                    return { content: [{ type: "text", text: jsonResponse }] };
                }
                let exportInfo = {};
                if (params.exportToExcel) {
                    const result = await exportToExcel(funcionalidades, 'funcionalidades');
                    exportInfo = { excelFilename: result.filename, excelUrl: result.url };
                    await logToolExecution({
                        level: 'INFO',
                        toolName,
                        parameters: { ...params, exportToExcel: true },
                        status: 'SUCCESS',
                        message: `Se encontraron ${meta.itemCount} funcionalidades y generado Excel en ${result.url}.`
                    });
                } else {
                    await logToolExecution({ level: 'INFO', toolName, parameters: params, status: 'SUCCESS', message: `Se encontraron ${meta.itemCount} funcionalidades.` });
                }
                const jsonResponse = JSON.stringify({
                    type: "list",
                    data: funcionalidades,
                    count: funcionalidades.length,
                    meta: { ...meta, ...exportInfo }
                }, null, 2);
                return { content: [{ type: "text", text: jsonResponse }] };

            } catch (error: any) {
                await logToolExecution({ level: 'ERROR', toolName, parameters: params, status: 'FAILURE', message: error.message, details: error.stack });
                const errorJson = JSON.stringify({
                    type: "error",
                    message: "Ocurrió un error al buscar funcionalidades.",
                    details: { error: error.message }
                }, null, 2);
                return { content: [{ type: "text", text: errorJson }] };
            }
        }
    );

    server.tool(
        "Buscar_Funcionalidad_Por_Nombre",
        "Busca y devuelve la definición de una ÚNICA funcionalidad que coincida con el nombre proporcionado. Es la forma más rápida de obtener el ID y la estructura de una funcionalidad. Devuelve datos en formato JSON parseable en el campo 'text'.",
        {
            nombre: z.string().describe("El nombre (o parte del nombre) de la funcionalidad a buscar.")
        },
        async (params) => {
            const toolName = "buscarFuncionalidadPorNombre";
            await logToolExecution({ level: 'INFO', toolName, parameters: params, status: 'STARTED', message: `Buscando funcionalidad por nombre: '${params.nombre}'.` });
            try {
                const body = { filters: { columns: [{ name: { contains: params.nombre } }] }, discriminatedLocation: false };
                const response = await apiClient.post('/functionalities/admin/findAllFilters', body, { params: { take: 1, page: 1 } });

                if (!response.data.data || response.data.data.length === 0) {
                    await logToolExecution({ level: 'WARN', toolName, parameters: params, status: 'SUCCESS', message: `No se encontró la funcionalidad '${params.nombre}'.` });
                    const jsonResponse = JSON.stringify({
                        type: "detail",
                        data: null,
                        meta: { found: false }
                    }, null, 2);
                    return { content: [{ type: "text", text: jsonResponse }] };
                }
                const funcionalidad = response.data.data[0];
                await logToolExecution({ level: 'INFO', toolName, parameters: params, status: 'SUCCESS', message: `Funcionalidad '${params.nombre}' encontrada con ID: ${funcionalidad._id}.` });
                const jsonResponse = JSON.stringify({
                    type: "detail",
                    data: funcionalidad,
                    meta: { found: true }
                }, null, 2);
                return { content: [{ type: "text", text: jsonResponse }] };

            } catch (error: any) {
                await logToolExecution({ level: 'ERROR', toolName, parameters: params, status: 'FAILURE', message: error.message, details: error.stack });
                const errorJson = JSON.stringify({
                    type: "error",
                    message: "Ocurrió un error al buscar la funcionalidad por nombre.",
                    details: { error: error.message }
                }, null, 2);
                return { content: [{ type: "text", text: errorJson }] };
            }
        }
    );

    server.tool(
        "Buscar_Registros_De_Funcionalidad",
        "Busca y devuelve los REGISTROS de una funcionalidad específica usando su ID. Esta herramienta es el segundo paso, después de obtener el ID con 'Buscar_Funcionalidad_Por_Nombre'. El filtro debe usar los TÍTULOS de los campos como claves (ej: 'FECHA ENTRADA', 'USUARIO') con operadores como 'equals', 'contains', 'between'. Para rangos de fecha usa: { 'FECHA ENTRADA': { 'between': ['2026-01-17', '2026-07-17'] } }. Devuelve datos en formato JSON parseable en el campo 'text'. Si exportToExcel=true, genera un archivo Excel descargable en /assets/ con timestamp, usando títulos de campos como headers.",
        {
            idFuncionalidad: z.string().describe("El ID exacto de la funcionalidad donde se buscarán los registros."),
            filtro: z.record(z.string(), z.any()).optional().describe("Objeto de filtro JSON plano. Usa los TÍTULOS de los campos como claves (ej: 'FECHA ENTRADA', 'USUARIO'). No envolver en {filters:{columns:[...]}}. Para rangos de fecha: { 'FECHA ENTRADA': { 'between': ['2026-01-17', '2026-07-17'] } }."),
            cantidad: z.number().optional().default(5),
            pagina: z.number().optional().default(1),
            orden: z.enum(["ASC", "DESC"]).optional().default("DESC"),
            exportToExcel: z.boolean().optional().default(false).describe("Si true, genera y retorna URL para descargar datos en Excel.")
        },
        async (params) => {
            const toolName = "buscarRegistrosDeFuncionalidad";
            await logToolExecution({ level: 'INFO', toolName, parameters: params, status: 'STARTED', message: `Buscando registros para el ID: ${params.idFuncionalidad}` });

            try {
                const funcResponse = await apiClient.get(`/functionalities/admin/${params.idFuncionalidad}`);
                const funcionalidad = funcResponse.data.data;
                if (!funcionalidad) {
                    throw new Error(`La definición para la funcionalidad con ID '${params.idFuncionalidad}' no fue encontrada.`);
                }

                const filtroReal = params.filtro || {};
                const titleToIdMap: any = new Map(funcionalidad.parametros.map((p: any) => [p.titulo, p.columnId]));
                const dateColumns = new Set<string>(
                    funcionalidad.parametros.filter((p: any) => p.tipo === 'date-time').map((p: any) => p.columnId)
                );

                const translatedFilter = translateFilterKeys(filtroReal, titleToIdMap);
                const { apiFilter, dateFilter } = extractDateFilters(translatedFilter, dateColumns);

                const hasDateFilter = dateFilter !== null && dateFilter.length > 0;

                let take = params.cantidad;
                let page = params.pagina;

                if (hasDateFilter) {
                    take = Math.max(take, 1000);
                    page = 1;
                }

                const body = { filters: { columns: [apiFilter || {}] }, discriminatedLocation: false };
                const pageOptions = { take, page, order: params.orden };

                const regResponse = await apiClient.post(`/functionalities/register/findAllFilters/${params.idFuncionalidad}`, body, { params: pageOptions });

                let registros = regResponse.data.data;
                let meta = regResponse.data.meta;

                if (hasDateFilter && registros && registros.length > 0) {
                    registros = applyDateFilter(registros, dateFilter);
                    const startIdx = (params.pagina - 1) * params.cantidad;
                    const paged = registros.slice(startIdx, startIdx + params.cantidad);
                    registros = paged;
                }

                if (!registros || registros.length === 0) {
                    await logToolExecution({ level: 'INFO', toolName, parameters: params, status: 'SUCCESS', message: `No se encontraron registros.` });
                    const jsonResponse = JSON.stringify({
                        type: "list",
                        data: [],
                        count: 0,
                        meta: { ...meta, funcionalidadName: funcionalidad.name }
                    }, null, 2);
                    return { content: [{ type: "text", text: jsonResponse }] };
                }

                const idToTitleMap: any = new Map(funcionalidad.parametros.map((p: any) => [p.columnId, p.titulo]));
                const fieldsMap = Object.fromEntries(idToTitleMap.entries());
                let exportInfo = {};
                if (params.exportToExcel) {
                    const dataForExcel = registros.map((reg: Record<string, any>) => {
                        const mapped: Record<string, any> = {};
                        for (const [key, val] of Object.entries(reg)) {
                            mapped[fieldsMap[key] || key] = val;
                        }
                        return mapped;
                    });
                    const result = await exportToExcel(dataForExcel, `${funcionalidad.name}-registros`);
                    exportInfo = { excelFilename: result.filename, excelUrl: result.url };
                    await logToolExecution({
                        level: 'INFO',
                        toolName,
                        parameters: { ...params, exportToExcel: true },
                        status: 'SUCCESS',
                        message: `Se encontraron ${meta.itemCount} registros y generado Excel en ${result.url}.`
                    });
                } else {
                    await logToolExecution({ level: 'INFO', toolName, parameters: params, status: 'SUCCESS', message: `Se encontraron ${meta.itemCount} registros.` });
                }
                const jsonResponse = JSON.stringify({
                    type: "list",
                    data: registros,
                    count: registros.length,
                    meta: { ...meta, funcionalidadName: funcionalidad.name, fieldsMap, ...exportInfo }
                }, null, 2);
                return { content: [{ type: "text", text: jsonResponse }] };

            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message;
                await logToolExecution({ level: 'ERROR', toolName, parameters: params, status: 'FAILURE', message: errorMessage, details: error.stack });
                const errorJson = JSON.stringify({
                    type: "error",
                    message: `Ocurrió un error al buscar los registros: ${errorMessage}`,
                    details: { error: error.message }
                }, null, 2);
                return { content: [{ type: "text", text: errorJson }] };
            }
        }
    );
};
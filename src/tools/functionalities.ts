import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AxiosInstance } from "axios";
import z from "zod";
import { logToolExecution } from "../logging.js";


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

export const registerFunctionalitiesTool = (server: McpServer, apiClient: AxiosInstance) => {

    server.tool(
        "Obtener_Funcionalidades",
        "Busca y devuelve DEFINICIONES de funcionalidades (admin) usando un filtro JSON complejo. Útil para búsquedas avanzadas con múltiples condiciones. Devuelve datos en formato JSON parseable en el campo 'text'.",
        {
            filtro: z.record(z.string(), z.any()).describe(`Objeto de filtro JSON. Ejemplo: { "$and": [{ "moduleType": { "equals": 2 } }, {"name": {"contains": "Reporte"}}] }`),
            cantidad: z.number().optional().default(10),
            pagina: z.number().optional().default(1)
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
                await logToolExecution({ level: 'INFO', toolName, parameters: params, status: 'SUCCESS', message: `Se encontraron ${meta.itemCount} funcionalidades.` });
                const jsonResponse = JSON.stringify({
                    type: "list",
                    data: funcionalidades,
                    count: funcionalidades.length,
                    meta: meta || {}
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
        "Busca y devuelve los REGISTROS de una funcionalidad específica usando su ID. Esta herramienta es el segundo paso, después de obtener el ID con 'buscarFuncionalidadPorNombre'. Devuelve datos en formato JSON parseable en el campo 'text'.",
        {
            idFuncionalidad: z.string().describe("El ID exacto de la funcionalidad donde se buscarán los registros."),
            filtro: z.record(z.string(), z.any()).optional().describe("Objeto de filtro JSON para los registros. Usa los TÍTULOS de los campos."),
            cantidad: z.number().optional().default(5),
            pagina: z.number().optional().default(1),
            orden: z.enum(["ASC", "DESC"]).optional().default("DESC")
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
                const translatedFilter = translateFilterKeys(filtroReal, titleToIdMap);
                const body = { filters: { columns: [translatedFilter] }, discriminatedLocation: false };
                const pageOptions = { take: params.cantidad, page: params.pagina, order: params.orden };

                const regResponse = await apiClient.post(`/functionalities/register/findAllFilters/${params.idFuncionalidad}`, body, { params: pageOptions });

                const registros = regResponse.data.data;
                const meta = regResponse.data.meta;

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
                await logToolExecution({ level: 'INFO', toolName, parameters: params, status: 'SUCCESS', message: `Se encontraron ${meta.itemCount} registros.` });
                const jsonResponse = JSON.stringify({
                    type: "list",
                    data: registros,
                    count: registros.length,
                    meta: { ...meta, funcionalidadName: funcionalidad.name, fieldsMap }
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
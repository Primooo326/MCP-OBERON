import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AxiosInstance } from "axios";
import z from "zod";

/**
 * Formatea un valor individual de un registro para que sea legible.
 * Maneja objetos {label, value}, booleanos y otros tipos.
 * @param value El valor del campo del registro.
 * @returns Una cadena de texto formateada.
 */
function formatValue(value: any): string {
    if (value === null || value === undefined) {
        return "No especificado";
    }
    if (typeof value === 'object' && value.hasOwnProperty('label')) {
        return value.label;
    }
    if (typeof value === 'boolean') {
        return value ? "Sí" : "No";
    }
    return value.toString();
}

/**
 * Formatea un único registro de una funcionalidad, usando la definición para hacerla legible.
 * @param registro El objeto del registro con columnId como claves.
 * @param paramMap Un mapa que relaciona columnId con su título.
 * @returns Una cadena de texto formateada del registro.
 */
function formatRegistro(registro: any, paramMap: Map<string, string>): string {
    const fields = Object.keys(registro)
        // Filtrar claves internas como _id, _status, etc.
        .filter(key => !key.startsWith('_'))
        .map(key => {
            const titulo = paramMap.get(key) || key; // Usa el título si existe, si no, el ID.
            const valor = formatValue(registro[key]);
            return `  - ${titulo}: ${valor}`;
        })
        .join('\n');

    return `
-----------------------------------------
REGISTRO ID: ${registro._id}
Fecha de Creación: ${new Date(registro._insert_date).toLocaleString()}
-----------------
${fields}
    `.trim();
}

function formatFuncionalidad(f: any) {
    // Mapeo para convertir el número de moduleType a un texto legible
    const moduleTypeMap: { [key: number]: string } = {
        1: "Parametrización",
        2: "Gestión",
        3: "Autorización",
        4: "PowerBI",
        5: "Dashboard"
    };

    // Formatear la lista de parámetros
    const parametrosInfo = f.parametros && f.parametros.length > 0
        ? f.parametros.map((p: any) => {
            const obligatorio = p.obligatorio ? "Sí" : "No";
            return `  - "${p.titulo}" (ID: ${p.columnId})\n    › Tipo: ${p.tipo}\n    › Obligatorio: ${obligatorio}`;
        }).join('\n')
        : "  No se han definido parámetros.";

    const tipoModulo = moduleTypeMap[f.moduleType] || "Desconocido";

    return `
=========================================
⚙️ FUNCIONALIDAD: ${f.name || f.label}
-----------------------------------------
--- INFORMACIÓN GENERAL ---
ID: ${f._id}
Descripción: ${f.description || 'Sin descripción'}
Tipo de Módulo: ${tipoModulo}
Disponibilidad: ${f.available || 'No especificada'}
Icono: ${f.icon || 'No especificado'}

--- CONFIGURACIÓN TÉCNICA ---
Ubicación (Path): ${f.location}
Ubicación Datos (Collection): ${f.structureLocation}
Discrimina por Ubicación: ${f.discriminatedLocation ? "Sí" : "No"}
Permite Asignar Usuario: ${f.assignUser ? "Sí" : "No"}

--- PARÁMETROS (${f.parametros ? f.parametros.length : 0}) ---
${parametrosInfo}
=========================================
    `.trim();
}

/**
 * Función recursiva para traducir las claves de un objeto de filtro (títulos de parámetros)
 * a sus correspondientes columnId.
 * @param filterObj El objeto de filtro con títulos como claves.
 * @param titleToIdMap Un mapa que relaciona títulos con columnId.
 * @returns Un nuevo objeto de filtro con columnId como claves.
 */
function translateFilterKeys(filterObj: any, titleToIdMap: Map<string, string>): any {
    if (typeof filterObj !== 'object' || filterObj === null) {
        return filterObj;
    }

    if (Array.isArray(filterObj)) {
        return filterObj.map(item => translateFilterKeys(item, titleToIdMap));
    }

    const newFilter: { [key: string]: any } = {};
    for (const key in filterObj) {
        if (titleToIdMap.has(key)) {
            // Clave encontrada, reemplazar con columnId
            const columnId = titleToIdMap.get(key)!;
            newFilter[columnId] = translateFilterKeys(filterObj[key], titleToIdMap);
        } else if (key.startsWith('$')) {
            // Es un operador lógico ($and, $or), mantenerlo y procesar su contenido
            newFilter[key] = translateFilterKeys(filterObj[key], titleToIdMap);
        } else {
            // Clave no encontrada en el mapa (podría ser un campo anidado o un error)
            // por ahora lo mantenemos y procesamos su valor.
            newFilter[key] = translateFilterKeys(filterObj[key], titleToIdMap);
        }
    }
    return newFilter;
}

export const registerFunctionalitiesTool = (server: McpServer, apiClient: AxiosInstance) => {

    server.tool(
        "Buscar Funcionalidades",
        "Realiza una búsqueda avanzada en la colección de 'definiciones' de funcionalidades (admin) utilizando un objeto de filtro complejo.",
        {
            filtro: z.any().describe(`Objeto de filtro JSON que sigue la estructura de buildCondition. Ejemplo: { "name": { "contains": "Ronda" }, "moduleType": { "equals": 2 } }`),
            cantidad: z.number().optional().default(10).describe("Número de resultados a devolver."),
            pagina: z.number().optional().default(1).describe("Número de página a devolver.")
        },
        async ({ filtro, cantidad, pagina }) => {
            try {
                const body = {
                    filters: {
                        columns: [filtro] // La API espera el filtro dentro de un array 'columns'
                    },
                    discriminatedLocation: false
                };

                const pageOptions = { take: cantidad, page: pagina, order: 'DESC' };

                console.log(`[Herramienta: buscarFuncionalidadesAvanzado] Llamando a /functionalities/admin/findAllFilters con body:`, JSON.stringify(body));

                const response = await apiClient.post('/functionalities/admin/findAllFilters', body, { params: pageOptions });

                const funcionalidades = response.data.data;
                const meta = response.data.meta;

                if (!funcionalidades || funcionalidades.length === 0) {
                    return { content: [{ type: "text", text: "No se encontraron funcionalidades que coincidan con el filtro." }] };
                }

                // Reutilizamos la función de formato para una salida consistente
                const textoFormateado = funcionalidades.map((f: any) => formatFuncionalidad(f)).join('\n\n');

                return {
                    content: [{
                        type: "text",
                        text: `Se encontraron ${meta.itemCount} funcionalidades. Mostrando página ${meta.page} de ${meta.pageCount}:\n\n${textoFormateado}`,
                        "_meta": meta
                    }]
                };
            } catch (error: any) {
                console.error(`[Herramienta: buscarFuncionalidadesAvanzado] Error: ${error.message}`);
                return { content: [{ type: "text", text: "Ocurrió un error al realizar la búsqueda avanzada de funcionalidades." }] };
            }
        }
    );

    server.tool(
        "Buscar Registros de Funcionalidad",
        "Realiza una búsqueda avanzada en los 'registros' de una funcionalidad específica por medio de su id. Debes usar los nombres de los campos (títulos) en el filtro, no sus IDs.",
        {
            idFuncionalidad: z.string().describe("El ID de la funcionalidad donde se buscarán los registros."),
            filtro: z.any().describe(`Objeto de filtro JSON. Usa los TÍTULOS de los campos. Ejemplo: { "$and": [{ "Nombre Cliente": { "value": { "equals": "ID_DEL_CLIENTE" } } }, { "Estado": { "value": { "equals": "Abierto" } } }] }`),
            cantidad: z.number().optional().default(10).describe("Número de registros a devolver."),
            pagina: z.number().optional().default(1).describe("Número de página a devolver."),
            orden: z.enum(["ASC", "DESC"]).optional().default("DESC").describe("Orden de los registros (DESC para los más recientes).")
        },
        async ({ idFuncionalidad, filtro, cantidad, pagina, orden }) => {
            try {
                // 1. OBTENER LA DEFINICIÓN PARA CREAR EL MAPA DE TRADUCCIÓN
                console.log(`[Herramienta: buscarRegistrosAvanzado] Obteniendo definición de funcionalidad: '${idFuncionalidad}'`);
                const funcResponse = await apiClient.get(`/core/functionalities/${idFuncionalidad}`);
                const funcionalidad = funcResponse.data.data;
                if (!funcionalidad) {
                    return { content: [{ type: "text", text: `No se encontró la funcionalidad con ID '${idFuncionalidad}'.` }] };
                }

                const titleToIdMap: any = new Map(funcionalidad.parametros.map((p: any) => [p.titulo, p.columnId]));
                const idToTitleMap: any = new Map(funcionalidad.parametros.map((p: any) => [p.columnId, p.titulo]));

                // 2. TRADUCIR EL FILTRO DE TÍTULOS A COLUMN_IDs
                const translatedFilter = translateFilterKeys(filtro, titleToIdMap);

                // 3. CONSTRUIR EL BODY Y REALIZAR LA BÚSQUEDA
                const body = {
                    filters: {
                        columns: [translatedFilter]
                    },
                    discriminatedLocation: false
                };
                const pageOptions = { take: cantidad, page: pagina, order: orden };

                console.log(`[Herramienta: buscarRegistrosAvanzado] Llamando a /register/findAllFilters/${idFuncionalidad} con body traducido:`, JSON.stringify(body));

                const response = await apiClient.post(`/functionalities/register/findAllFilters/${idFuncionalidad}`, body, { params: pageOptions });

                const registros = response.data.data;
                const meta = response.data.meta;

                if (!registros || registros.length === 0) {
                    return { content: [{ type: "text", text: `No se encontraron registros en '${funcionalidad.name}' que coincidan con el filtro.` }] };
                }

                // 4. FORMATEAR LA SALIDA USANDO EL MAPA INVERSO
                const textoFormateado = registros.map((r: any) => formatRegistro(r, idToTitleMap)).join('\n\n');

                return {
                    content: [{
                        type: "text",
                        text: `Búsqueda en "${funcionalidad.name}": Se encontraron ${meta.itemCount} registros. Mostrando página ${meta.page}:\n\n${textoFormateado}`,
                        "_meta": meta
                    }]
                };

            } catch (error: any) {
                console.error(`[Herramienta: buscarRegistrosAvanzado] Error: ${error.message}`);
                const errorMessage = error.response?.data?.message || error.message;
                return { content: [{ type: "text", text: `Ocurrió un error al buscar en los registros: ${errorMessage}` }] };
            }

        }
    );
}
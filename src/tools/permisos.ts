import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AxiosInstance } from "axios";
import z from "zod";

export function registerPermisosTool(server: McpServer, apiClient: AxiosInstance) {
    console.log(`[Tools] Registrando herramientas de Permisos en el servidor...`);

    server.tool(
        "Obtener_Permisos",
        "Busca y devuelve una lista detallada de permisos de módulo del sistema. Devuelve datos en formato JSON parseable en el campo 'text'.",
        {
            terminoBusqueda: z.string().optional().describe("Texto para buscar por descripción de permiso."),
            cantidad: z.number().optional().default(10).describe("Número de permisos a devolver (por defecto 10)."),
            pagina: z.number().optional().default(1).describe("Número de página a devolver (por defecto 1)."),
            orden: z.enum(["ASC", "DESC"]).optional().default("ASC").describe("Orden de la lista de permisos (por defecto ASC)."),
        },
        async ({ terminoBusqueda, cantidad, pagina, orden }) => {
            try {
                const params = { take: cantidad, term: terminoBusqueda, page: pagina, order: orden };
                console.log(`[Herramienta: Obtener_Permisos] Llamando a /core/module-permissions con params:`, params);

                const response = await apiClient.get('/core/module-permissions', {
                    params,
                });
                const permisos = response.data.data;
                const meta = response.data.meta;

                if (!permisos || permisos.length === 0) {
                    const jsonResponse = JSON.stringify({
                        type: "list",
                        data: [],
                        count: 0,
                        meta: meta || {}
                    }, null, 2);
                    return { content: [{ type: "text", text: jsonResponse }] };
                }

                const jsonResponse = JSON.stringify({
                    type: "list",
                    data: permisos,
                    count: permisos.length,
                    meta: meta || {}
                }, null, 2);
                return {
                    content: [
                        {
                            type: "text",
                            text: jsonResponse
                        },
                    ]
                };

            } catch (error: any) {
                console.error(`[Herramienta: Obtener_Permisos] Error: ${error.message}`);
                const errorJson = JSON.stringify({
                    type: "error",
                    message: "Ocurrió un error al consultar la API de permisos.",
                    details: { error: error.message }
                }, null, 2);
                return { content: [{ type: "text", text: errorJson }] };
            }
        }
    );

    server.tool(
        "Obtener_Permiso_por_ID",
        "Busca y devuelve un permiso del sistema dado su ID. Devuelve datos en formato JSON parseable en el campo 'text'.",
        {
            id: z.string().describe("ID del permiso a buscar."),
        },
        async ({ id }) => {
            try {
                console.log(`[Herramienta: Obtener_Permiso_por_ID] Llamando a /core/module-permissions/${id}...`);

                const response = await apiClient.get('/core/module-permissions/' + id);
                const permisos = response.data.data;
                const meta = response.data.meta;

                if (!permisos || permisos.length === 0) {
                    const jsonResponse = JSON.stringify({
                        type: "detail",
                        data: null,
                        meta: { found: false }
                    }, null, 2);
                    return { content: [{ type: "text", text: jsonResponse }] };
                }

                const permiso = permisos[0]; // Asumiendo que viene en array al igual que usuarios
                const jsonResponse = JSON.stringify({
                    type: "detail",
                    data: permiso,
                    meta: { found: true, ...meta }
                }, null, 2);
                return {
                    content: [
                        {
                            type: "text",
                            text: jsonResponse
                        },
                    ]
                };

            } catch (error: any) {
                console.error(`[Herramienta: Obtener_Permiso_por_ID] Error: ${error.message}`);
                const errorJson = JSON.stringify({
                    type: "error",
                    message: "Ocurrió un error al consultar la API de permisos por ID.",
                    details: { error: error.message }
                }, null, 2);
                return { content: [{ type: "text", text: errorJson }] };
            }
        }
    );
}

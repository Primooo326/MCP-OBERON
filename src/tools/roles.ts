import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AxiosInstance } from "axios";
import z from "zod";


export function registerRolesTool(server: McpServer, apiClient: AxiosInstance) {
    console.log(`[Tools] Registrando herramientas de Roles en el servidor...`);


    server.tool(
        "Obtener_Roles",
        "Busca y devuelve una lista detallada de roles del sistema, incluyendo el cliente asociado y los usuarios que lo tienen. Devuelve datos en formato JSON parseable en el campo 'text'.",
        {
            terminoBusqueda: z.string().optional().describe("Texto para buscar por nombre de rol."),
            cantidad: z.number().optional().default(10).describe("Número de roles a devolver (por defecto 10)."),
            pagina: z.number().optional().default(1).describe("Número de página a devolver (por defecto 1)."),
            orden: z.enum(["ASC", "DESC"]).optional().default("ASC").describe("Orden de la lista de roles (por defecto ASC)."),
        },
        async ({ terminoBusqueda, cantidad, pagina, orden }) => {
            try {
                const params = { take: cantidad, term: terminoBusqueda, page: pagina, order: orden };
                console.log(`[Herramienta: obtenerRoles] Llamando a /core/roles con params:`, params);

                const response = await apiClient.get('/core/roles', {
                    params,
                });
                const roles = response.data.data;
                const meta = response.data.meta;

                if (!roles || roles.length === 0) {
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
                    data: roles,
                    count: roles.length,
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
                console.error(`[Herramienta: obtenerRoles] Error: ${error.message}`);
                const errorJson = JSON.stringify({
                    type: "error",
                    message: "Ocurrió un error al consultar la API de roles.",
                    details: { error: error.message }
                }, null, 2);
                return { content: [{ type: "text", text: errorJson }] };
            }
        }
    );
}
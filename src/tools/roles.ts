import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AxiosInstance } from "axios";
import z from "zod";

function formatRole(r: any) {
    const usuariosAsignados = r.user && r.user.length > 0
        ? r.user.map((user: any) => `  - ${user.name} (ID: ${user.id})`).join('\n')
        : "  Ninguno";

    const esSuperAdmin = r.mainAdmin ? "Sí" : "No";

    return `
=========================================
📜 ROL: ${r.name}
-----------------------------------------
--- INFORMACIÓN PRINCIPAL ---
ID Rol: ${r.id}
Es Super Admin: ${esSuperAdmin}

--- CLIENTE ASOCIADO ---
Nombre Cliente: ${r.client ? r.client.name : 'No especificado'}
ID Cliente: ${r.clientId}

--- USUARIOS CON ESTE ROL ---
${usuariosAsignados}
=========================================
                    `.trim();
}

export function registerRolesTool(server: McpServer, apiClient: AxiosInstance) {
    console.log(`[Tools] Registrando herramientas de Roles en el servidor...`);


    server.tool(
        "Obtener_Roles",
        "Busca y devuelve una lista detallada de roles del sistema, incluyendo el cliente asociado y los usuarios que lo tienen.",
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
                    return { content: [{ type: "text", text: "No se encontraron roles que coincidan con la búsqueda." }] };
                }

                const textoFormateado = roles.map((r: any) => {

                    return formatRole(r).trim();
                }).join('\n\n');

                return {
                    content: [
                        {
                            type: "text",
                            text: `Se encontraron ${roles.length} roles:\n\n${textoFormateado}`,
                            "_meta": meta
                        },
                    ]
                };

            } catch (error: any) {
                console.error(`[Herramienta: obtenerRoles] Error: ${error.message}`);
                return { content: [{ type: "text", text: "Ocurrió un error al consultar la API de roles." }] };
            }
        }
    );
}
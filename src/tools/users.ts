import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AxiosInstance } from "axios";
import z from "zod";




export function registerUsersTool(server: McpServer, apiClient: AxiosInstance) {


    // GET /core/users

    server.tool(
        "Obtener_Usuarios",
        "Busca y devuelve una lista detallada de usuarios del sistema, incluyendo su rol, zona y ubicaciones. Devuelve datos en formato JSON parseable en el campo 'text'.",
        {
            terminoBusqueda: z.string().optional().describe("Texto para buscar por nombre, email, username, etc."),
            cantidad: z.number().optional().default(10).describe("Número de usuarios a devolver (por defecto 10)."),
            pagina: z.number().optional().default(1).describe("Número de página a devolver (por defecto 1)."),
            orden: z.enum(["ASC", "DESC"]).optional().default("ASC").describe("Orden de la lista de usuarios (por defecto ASC)."),
        },
        async ({ terminoBusqueda, cantidad, pagina, orden }) => {
            try {
                const params = { take: cantidad, term: terminoBusqueda, page: pagina, order: orden };
                console.log(`[Herramienta: obtenerUsuarios] Llamando a /core/users con params:`, params);

                const response = await apiClient.get('/core/users', {
                    params,
                });
                const usuarios = response.data.data;
                const meta = response.data.meta;

                if (!usuarios || usuarios.length === 0) {
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
                    data: usuarios,
                    count: usuarios.length,
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
                console.error(`[Herramienta: obtenerUsuarios] Error: ${error.message}`);
                const errorJson = JSON.stringify({
                    type: "error",
                    message: "Ocurrió un error al consultar la API de usuarios.",
                    details: { error: error.message }
                }, null, 2);
                return { content: [{ type: "text", text: errorJson }] };
            }
        }
    );

    // GET /core/users/{id}
    server.tool(
        "Obtener_Usuario_por_ID",
        "Busca y devuelve un usuario del sistema, incluyendo su rol, zona y ubicaciones. Devuelve datos en formato JSON parseable en el campo 'text'.",
        {
            id: z.string().describe("ID del usuario a buscar."),
        },
        async ({ id }) => {
            try {
                console.log(`[Herramienta: obtenerUsuario] Llamando a /core/users/${id}...`);

                const response = await apiClient.get('/core/users/' + id);
                const usuarios = response.data.data;
                const meta = response.data.meta;

                if (!usuarios || usuarios.length === 0) {
                    const jsonResponse = JSON.stringify({
                        type: "detail",
                        data: null,
                        meta: { found: false }
                    }, null, 2);
                    return { content: [{ type: "text", text: jsonResponse }] };
                }

                const usuario = usuarios[0];
                const jsonResponse = JSON.stringify({
                    type: "detail",
                    data: usuario,
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
                console.error(`[Herramienta: obtenerUsuario] Error: ${error.message}`);
                const errorJson = JSON.stringify({
                    type: "error",
                    message: "Ocurrió un error al consultar la API de usuarios.",
                    details: { error: error.message }
                }, null, 2);
                return { content: [{ type: "text", text: errorJson }] };
            }
        }
    );

    // GET /core/users/getUsersByClientId/{clientId}
    server.tool(
        "Obtener_Usuarios_por_Cliente",
        "Busca y devuelve una lista de usuarios del sistema, incluyendo su rol, zona y ubicaciones. Devuelve datos en formato JSON parseable en el campo 'text'.",
        {
            clientId: z.string().describe("ID del cliente a buscar."),
        },
        async ({ clientId }) => {
            try {
                console.log(`[Herramienta: obtenerUsuariosPorCliente] Llamando a /core/users/getUsersByClientId/${clientId}...`);

                const response = await apiClient.get('/core/users/getUsersByClientId/' + clientId);
                const usuarios = response.data.data;
                const meta = response.data.meta;

                if (!usuarios || usuarios.length === 0) {
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
                    data: usuarios,
                    count: usuarios.length,
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
                console.error(`[Herramienta: obtenerUsuariosPorCliente] Error: ${error.message}`);
                const errorJson = JSON.stringify({
                    type: "error",
                    message: "Ocurrió un error al consultar la API de usuarios.",
                    details: { error: error.message }
                }, null, 2);
                return { content: [{ type: "text", text: errorJson }] };
            }
        }
    );

    // POST /core/users
    server.tool(
        "Crear_Usuario",
        "Crea un nuevo usuario en el sistema con la información proporcionada. Devuelve datos en formato JSON parseable en el campo 'text'.",
        {
            name: z.string().describe("Nombre completo del usuario."),
            username: z.string().describe("Nombre de usuario único para el login."),
            email: z.string().email().describe("Correo electrónico del usuario."),
            rolId: z.number().describe("El ID numérico del rol a asignar."),
            cellphone: z.string().optional().describe("Número de celular del usuario."),
            numeroIdentificacion: z.string().describe("Número de identificación (Cédula, etc.)."),
            locations: z.array(z.string()).describe("Una lista de los IDs de las ubicaciones a asignar."),
        },
        async ({ rolId, name, username, cellphone, email, numeroIdentificacion, locations }) => {

            const formattedLocations = locations.map(id => ({ locationId: id }));

            const body = {
                rolId,
                userZoneId: 1,
                name,
                username,
                cellphone,
                email,
                numeroIdentificacion,
                locations: formattedLocations,
            };

            try {
                console.log(`[Herramienta: crearUsuario] Llamando a POST /core/users con body:`, body);

                const response = await apiClient.post('/core/users', body);

                const usuarioCreado = response.data;

                if (!usuarioCreado) {
                    const jsonResponse = JSON.stringify({
                        type: "create",
                        data: null,
                        success: true,
                        message: "La API no devolvió el usuario creado, pero la operación pudo haber sido exitosa."
                    }, null, 2);
                    return { content: [{ type: "text", text: jsonResponse }] };
                }

                const jsonResponse = JSON.stringify({
                    type: "create",
                    data: usuarioCreado,
                    success: true,
                    message: "Usuario creado exitosamente."
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
                console.error(`[Herramienta: crearUsuario] Error: ${error.message}`);

                const errorData = error.response?.data?.message || "Ocurrió un error al crear el usuario.";
                const errorJson = JSON.stringify({
                    type: "error",
                    message: `Error: ${errorData}`,
                    success: false,
                    details: { error: error.message }
                }, null, 2);
                return { content: [{ type: "text", text: errorJson }] };
            }
        }
    );

}
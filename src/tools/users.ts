import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AxiosInstance } from "axios";
import z from "zod";



function formatUsuario(u: any) {
    const ubicaciones = u.locationUsers && u.locationUsers.length > 0
        ? u.locationUsers.map((loc: any) => `  - ID Cliente Ubicación: ${loc.locationClientId}`).join('\n')
        : "  Ninguna";

    const estado = u.status ? "Activo" : "Inactivo";

    return `
=========================================
👤 USUARIO: ${u.name} (${u.username})
-----------------------------------------
--- INFORMACIÓN PRINCIPAL ---
ID: ${u.id}
Email: ${u.email}
Celular: ${u.cellphone || 'No especificado'}
Nº Identificación: ${u.numeroIdentificacion || 'No especificado'}
Estado: ${estado}
Foto Path: ${u.photo || 'No especificada'}

--- ROL Y ZONA ---
Rol: ${u.role ? u.role.name : 'No asignado'} (ID: ${u.rolId})
Zona: ${u.userZone ? u.userZone.description : 'No asignada'} (ID: ${u.userZoneId})

--- FECHAS IMPORTANTES ---
Fecha de Creación: ${u.insertDate}
Última Actualización de Contraseña: ${u.passwordUpdateDate}
=========================================
                    `.trim();
}

export function registerUsersTool(server: McpServer, apiClient: AxiosInstance) {


    // GET /core/users

    server.tool(
        "Obtener_Usuarios",
        "Busca y devuelve una lista detallada de usuarios del sistema, incluyendo su rol, zona y ubicaciones.",
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
                    return { content: [{ type: "text", text: "No se encontraron usuarios que coincidan con la búsqueda." }] };
                }

                const textoFormateado = usuarios.map((u: any) => {
                    return formatUsuario(u).trim();
                }).join('\n\n');

                return {
                    content: [
                        {
                            type: "text",
                            text: `Se encontraron ${usuarios.length} usuarios:\n\n${textoFormateado}`,
                            "_meta": meta
                        },
                    ]
                };

            } catch (error: any) {
                console.error(`[Herramienta: obtenerUsuarios] Error: ${error.message}`);
                return { content: [{ type: "text", text: "Ocurrió un error al consultar la API de usuarios." }] };
            }
        }
    );

    // GET /core/users/{id}
    server.tool(
        "Obtener_Usuario_por_ID",
        "Busca y devuelve un usuario del sistema, incluyendo su rol, zona y ubicaciones.",
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
                    return { content: [{ type: "text", text: "No se encontraron usuarios que coincidan con la búsqueda." }] };
                }

                const textoFormateado = usuarios.map((u: any) => {

                    return formatUsuario(u).trim();
                }).join('\n\n');

                return {
                    content: [
                        {
                            type: "text",
                            text: `Se encontraron ${usuarios.length} usuarios:\n\n${textoFormateado}`,
                            "_meta": meta
                        },
                    ]
                };

            } catch (error: any) {
                console.error(`[Herramienta: obtenerUsuario] Error: ${error.message}`);
                return { content: [{ type: "text", text: "Ocurrió un error al consultar la API de usuarios." }] };
            }
        }
    );

    // GET /core/users/getUsersByClientId/{clientId}
    server.tool(
        "Obtener_Usuarios_por_Cliente",
        "Busca y devuelve una lista de usuarios del sistema, incluyendo su rol, zona y ubicaciones.",
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
                    return { content: [{ type: "text", text: "No se encontraron usuarios que coincidan con la búsqueda." }] };
                }

                const textoFormateado = usuarios.map((u: any) => {

                    return formatUsuario(u).trim();
                }).join('\n\n');

                return {
                    content: [
                        {
                            type: "text",
                            text: `Se encontraron ${usuarios.length} usuarios:\n\n${textoFormateado}`,
                            "_meta": meta
                        },
                    ]
                };

            } catch (error: any) {
                console.error(`[Herramienta: obtenerUsuariosPorCliente] Error: ${error.message}`);
                return { content: [{ type: "text", text: "Ocurrió un error al consultar la API de usuarios." }] };
            }
        }
    );

    // POST /core/users
    server.tool(
        "Crear_Usuario",
        "Crea un nuevo usuario en el sistema con la información proporcionada.",
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
                    return { content: [{ type: "text", text: "La API no devolvió el usuario creado, pero la operación pudo haber sido exitosa." }] };
                }

                const textoFormateado = formatUsuario(usuarioCreado);

                return {
                    content: [
                        {
                            type: "text",
                            text: `¡Usuario creado exitosamente!\n\n${textoFormateado}`,
                        },
                    ]
                };

            } catch (error: any) {
                console.error(`[Herramienta: crearUsuario] Error: ${error.message}`);

                const errorData = error.response?.data?.message || "Ocurrió un error al crear el usuario.";
                return { content: [{ type: "text", text: `Error: ${errorData}` }] };
            }
        }
    );

}
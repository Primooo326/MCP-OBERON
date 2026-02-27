import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AxiosInstance } from "axios";
import z from "zod";

export function registerWhaTool(server: McpServer, apiClient: AxiosInstance) {
    console.log(`[Tools] Registrando herramienta de WhatsApp en el servidor...`);

    server.tool(
        "Enviar_Mensaje_WhatsApp",
        "Envía un mensaje de texto por WhatsApp a una lista de números de teléfono celular. Devuelve el resultado de la operación.",
        {
            message: z.string().describe("El texto del mensaje que se enviará por WhatsApp."),
            to: z.array(z.string()).describe("Lista de números de teléfono celular destinatarios (con código de país, p.ej. 573001234567)."),
            replyMessageId: z.string().optional().describe("ID del mensaje al cual se quiere responder (para hacer un quote). Opcional.")
        },
        async ({ message, to, replyMessageId }) => {
            const URL_WHA = "https://wha.oberon360.com/api/wha/send";

            console.log(`[Herramienta: Enviar_Mensaje_WhatsApp] Enviando mensaje a: ${to.join(", ")}`);

            try {
                // Obtenemos el token dinámicamente del cliente Axios configurado para este MCP session
                let apiKeyHeader = apiClient.defaults.headers['x-api-key'] || apiClient.defaults.headers['Authorization'] ||
                    (apiClient.defaults.headers.common && (apiClient.defaults.headers.common['x-api-key'] || apiClient.defaults.headers.common['Authorization']));

                if (!apiKeyHeader) {
                    throw new Error("No se encontró token de autorización en la instancia del cliente para enviar el mensaje de WhatsApp.");
                }

                apiKeyHeader = String(apiKeyHeader).replace(/^Bearer\s+/i, '');

                const bodyPayload: any = {
                    to: to,
                    message: message
                };
                if (replyMessageId) {
                    bodyPayload.replyMessageId = replyMessageId;
                }

                const response = await fetch(URL_WHA, {
                    method: 'POST',
                    headers: {
                        'bearer': String(apiKeyHeader),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bodyPayload)
                });

                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
                }

                const data = await response.json().catch(() => ({}));

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ success: true, data }, null, 2)
                        }
                    ]
                };
            } catch (error: any) {
                console.error(`[Herramienta: Enviar_Mensaje_WhatsApp] Error enviando mensaje a ${to.join(", ")}:`, error.message);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                success: false,
                                message: "Ocurrió un error al intentar enviar el mensaje de WhatsApp.",
                                error: error.message
                            }, null, 2)
                        }
                    ]
                };
            }
        }
    );
}

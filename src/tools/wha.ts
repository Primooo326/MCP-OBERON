import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { logToolExecution } from "../logging.js";

export function registerWhaTool(server: McpServer) {
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
            const toolName = "Enviar Mensaje WhatsApp";
            const logParams = { to, replyMessageId };
            await logToolExecution({
                toolName,
                level: "INFO",
                parameters: logParams,
                status: "STARTED",
                message: `Iniciando envío de mensaje por WhatsApp a ${to.length} destinatarios.`,
            });
            const URL_WHA = "https://wha.oberon360.com/api/wha/send";

            console.log(`[Herramienta: Enviar_Mensaje_WhatsApp] Enviando mensaje a: ${to.join(", ")}`);
            try {


                const bodyPayload: any = {
                    to: to,
                    message: message
                };
                if (replyMessageId) {
                    bodyPayload.replyMessageId = replyMessageId;
                }

                console.log(bodyPayload)
                const response = await fetch(URL_WHA, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bodyPayload)
                });

                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
                }

                const data = await response.json().catch(() => ({}));

                await logToolExecution({
                    toolName,
                    level: "INFO",
                    parameters: logParams,
                    status: "SUCCESS",
                    message: `Mensaje enviado exitosamente a: ${to.join(", ")}`,
                    details: data
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ success: true, data }, null, 2)
                        }
                    ]
                };
            } catch (error: any) {
                await logToolExecution({
                    toolName,
                    level: "ERROR",
                    parameters: logParams,
                    status: "FAILURE",
                    message: `Error al enviar mensaje por WhatsApp: ${error.message}`,
                    details: { error: error.message, stack: error.stack }
                });
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

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import axios from "axios";
import { logToolExecution } from "../logging.js";

export const registerTimeTool = (server: McpServer) => {
    server.tool(
        "Obtener_Tiempo",
        "Obtiene el tiempo actual para un timezone específico o basado en la IP pública del usuario en formato JSON usando WorldTimeAPI.",
        {
            timezone: z.string().optional().describe("Timezone opcional, e.g., 'America/Bogota'. Si no se proporciona, usa la IP pública.")
        },
        async (params) => {
            const toolName = "Obtener_Tiempo";
            await logToolExecution({ level: 'INFO', toolName, parameters: params, status: 'STARTED', message: 'Iniciando obtención de tiempo.' });
            try {
                let url = "http://worldtimeapi.org/api/ip";
                if (params.timezone) {
                    url = `http://worldtimeapi.org/api/timezone/${params.timezone}`;
                }
                const response = await axios.get(url);
                await logToolExecution({ level: 'INFO', toolName, parameters: params, status: 'SUCCESS', message: 'Tiempo obtenido exitosamente.' });
                const jsonResponse = JSON.stringify(response.data, null, 2);
                return { content: [{ type: "text", text: jsonResponse }] };
            } catch (error: any) {
                await logToolExecution({ level: 'ERROR', toolName, parameters: params, status: 'FAILURE', message: error.message, details: error.stack });
                const errorJson = JSON.stringify({
                    type: "error",
                    message: "Ocurrió un error al obtener el tiempo.",
                    details: { error: error.message }
                }, null, 2);
                return { content: [{ type: "text", text: errorJson }] };
            }
        }
    );
};
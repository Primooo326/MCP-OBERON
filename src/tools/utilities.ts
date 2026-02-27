import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AxiosInstance } from "axios";
import z from "zod";

export function registerUtilitiesTool(server: McpServer, apiClient: AxiosInstance) {
    console.log(`[Tools] Registrando herramientas de Utilidades en el servidor...`);

    server.tool(
        "Verificar_Estado_Placa",
        "Verifica el estado métrico e historiales temporales y GPS de un vehículo a partir de su placa. Retorna la información más reciente registrada incluyendo la fecha.",
        {
            placa: z.string().describe("Placa del vehículo a consultar (se pasará a mayúsculas automáticamente).")
        },
        async ({ placa }) => {
            const URL_OBERON = 'https://api.dev.oberon360.com/api/functionalities/register/findAllFiltersDav/';
            const FUNCT_ID_HISTORICO = '68640ae722068f1bff55f76a';
            const EXTERNAL_API_KEY = 'e3428fd9b401b15c55f6c32b1a092d1d577446517114856b4d9d0264f2c459ae';

            const body = {
                "filters": {
                    "columns": [
                        {
                            "ca995800d0": {
                                "label": {
                                    "equals": placa.toUpperCase().trim()
                                }
                            }
                        }
                    ]
                }
            };

            console.log(`[Herramienta: Verificar_Estado_Placa] Consultando placa: ${placa}`);

            try {
                const response = await fetch(`${URL_OBERON}${FUNCT_ID_HISTORICO}?take=1`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${EXTERNAL_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    throw new Error(`Error de red: ${response.statusText}`);
                }

                const data = await response.json();

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ success: true, data: data.data || data }, null, 2)
                        }
                    ]
                };
            } catch (error: any) {
                console.error(`[Herramienta: Verificar_Estado_Placa] Error consultando placa ${placa}:`, error.message);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                success: false,
                                message: "Ocurrió un error al verificar el estado de la placa.",
                                error: error.message
                            }, null, 2)
                        }
                    ]
                };
            }
        }
    );
}
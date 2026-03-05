import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AxiosInstance } from "axios";
import z from "zod";

const URL_OBERON = 'https://api.dev.oberon360.com/api/functionalities/register/findAllFiltersDav/';
const FUNCT_ID_TEMPERATURA = '68640ae722068f1bff55f76a';
const FUNCT_ID_GPS = '68483d789596d9d122f7222a'; // MAPA OPERATIVO
const FUNCT_ID_VEHICULO = '68192b4aa8179b37f7eff226';
const FUNCT_ID_SENSOR = '68192cc7a8179b37f7f004e6';
const EXTERNAL_API_KEY = 'e3428fd9b401b15c55f6c32b1a092d1d577446517114856b4d9d0264f2c459ae';





export function registerUtilitiesTool(server: McpServer) {
    console.log(`[Tools] Registrando herramientas de Utilidades en el servidor...`);

    server.tool(
        "Verificar_Estado_Temperatura_Placa",
        "Verifica el estado métrico e historiales temporales y GPS de un vehículo a partir de su placa. Retorna la información más reciente registrada incluyendo la fecha.",
        {
            placa: z.string().describe("Placa del vehículo a consultar (se pasará a mayúsculas automáticamente).")
        },
        async ({ placa }) => {


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

            console.log(`[Herramienta: Verificar_Estado_Temperatura_Placa] Consultando placa: ${placa}`);

            try {
                const response = await fetch(`${URL_OBERON}${FUNCT_ID_TEMPERATURA}?take=1`, {
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
                console.error(`[Herramienta: Verificar_Estado_Temperatura_Placa] Error consultando placa ${placa}:`, error.message);
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

    server.tool(
        "Verificar_Estado_GPS_Placa",
        "Verifica el estado métrico e historiales temporales y GPS de un vehículo a partir de su placa. Retorna la información más reciente registrada incluyendo la fecha.",
        {
            placa: z.string().describe("Placa del vehículo a consultar (se pasará a mayúsculas automáticamente).")
        },
        async ({ placa }) => {



            try {
                console.log(`[Herramienta: Verificar_Estado_GPS_Placa] Consultando placa: ${placa}`);

                const bodyVehiculos = {
                    "filters": {
                        "columns": [
                            {
                                "91c2de084j": {
                                    "equals": placa.toUpperCase().trim()
                                }
                            }
                        ]
                    }
                };

                const responseVehiculos = await fetch(`${URL_OBERON}${FUNCT_ID_VEHICULO}?take=1`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${EXTERNAL_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bodyVehiculos)
                });

                if (!responseVehiculos.ok) {
                    throw new Error(`Error de red: ${responseVehiculos.statusText}`);
                }

                const data_vehiculo = (await responseVehiculos.json()).data[0];

                console.log("Data vehiculo:::", data_vehiculo)


                const bodySensores = {
                    "filters": {
                        "columns": [
                            {
                                "641a4300vx": {
                                    "label": {
                                        "equals": placa.toUpperCase().trim()
                                    }
                                }
                            }
                        ]
                    }
                };

                const responseSensores = await fetch(`${URL_OBERON}${FUNCT_ID_SENSOR}?take=1`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${EXTERNAL_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bodySensores)
                });

                if (!responseSensores.ok) {
                    throw new Error(`Error de red: ${responseSensores.statusText}`);
                }

                const data_sensores = (await responseSensores.json()).data[0];

                console.log("Data sensores:::", data_sensores)


                const bodyGps = {
                    "filters": {
                        "columns": [
                            {
                                "302014002k": {
                                    "label": {
                                        "equals": data_sensores['7ec59900pv']
                                    }
                                }
                            }
                        ]
                    }
                };

                const responseGps = await fetch(`${URL_OBERON}${FUNCT_ID_GPS}?take=1`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${EXTERNAL_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bodyGps)
                });

                if (!responseGps.ok) {
                    throw new Error(`Error de red: ${responseGps.statusText}`);
                }

                const data_gps = await responseGps.json();

                console.log("Data gps:::", data_gps)

                const data_final = {
                    vehiculo: {
                        tipo: data_vehiculo['91c2de021s'],
                        flota: data_vehiculo['91c2de04aw'],

                    },
                    sensores: {
                        tipo: data_sensores['7ec59905p8'],
                        proveedor: data_sensores['fd60b3003m'],
                        reportaUbicacionGps: data_sensores['33894800sf'],

                    },
                    gps: {
                        estado: data_gps.data[0]['3020140b4c'],
                        velocidad: data_gps.data[0]['30201409fq'],
                        fechaReporte: data_gps.data[0]['30201406jl'],
                        ubicacion: data_gps.data[0]['70eb3c00mt'],

                    }
                }


                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ success: true, data: data_final }, null, 2)
                        }
                    ]
                };
            } catch (error: any) {
                console.error(`[Herramienta: Verificar_Estado_GPS_Placa] Error consultando placa ${placa}:`, error.message);
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
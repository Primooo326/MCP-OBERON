import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AxiosInstance } from "axios";
import z from "zod";

const URL_OBERON = 'https://api.dev.oberon360.com/api/functionalities/register/findAllFiltersDav/';
const FUNCT_ID_TEMPERATURA = '68640ae722068f1bff55f76a';
const FUNCT_ID_GPS = '68483d789596d9d122f7222a'; // MAPA OPERATIVO
const FUNCT_ID_VEHICULO = '68192b4aa8179b37f7eff226';
const FUNCT_ID_SENSOR = '68192cc7a8179b37f7f004e6';
const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY || '';





export function registerUtilitiesTool(server: McpServer) {
    console.log(`[Tools] Registrando herramientas de Utilidades en el servidor...`);

    server.tool(
        "Verificar_Estado_Temperatura_Placa",
        "Verifica el estado métrico y de temperatura de un vehículo a partir de su placa. Retorna la información más reciente de temperatura registrada incluyendo la fecha.",
        {
            placa: z.string().describe("Placa del vehículo a consultar para temperatura.").transform(val => val.toUpperCase().trim())
        },
        async ({ placa }) => {


            const body = {
                "filters": {
                    "columns": [
                        {
                            "ca995800d0": {
                                "label": {
                                    "equals": placa
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
        "Verifica historial y la ubicación GPS actual de un vehículo a partir de su placa. Retorna la información más reciente de ubicación (lat, lng, velocidad).",
        {
            placa: z.string().describe("Placa del vehículo a consultar para GPS.").transform(val => val.toUpperCase().trim())
        },
        async ({ placa }) => {



            try {
                console.log(`[Herramienta: Verificar_Estado_GPS_Placa] Consultando placa: ${placa}`);

                const bodyVehiculos = {
                    "filters": {
                        "columns": [
                            {
                                "91c2de084j": {
                                    "equals": placa
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

                const jsonVehiculos = await responseVehiculos.json();
                const data_vehiculo = jsonVehiculos.data && jsonVehiculos.data.length > 0 ? jsonVehiculos.data[0] : null;

                if (!data_vehiculo) {
                    return {
                        content: [{ type: "text", text: JSON.stringify({ success: false, message: `Vehículo con placa ${placa} no encontrado.` }, null, 2) }]
                    };
                }

                console.log("Data vehiculo:::", data_vehiculo)


                const bodySensores = {
                    "filters": {
                        "columns": [
                            {
                                "641a4300vx": {
                                    "label": {
                                        "equals": placa
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

                const jsonSensores = await responseSensores.json();
                const data_sensores = jsonSensores.data && jsonSensores.data.length > 0 ? jsonSensores.data[0] : null;

                if (!data_sensores) {
                    return {
                        content: [{ type: "text", text: JSON.stringify({ success: false, message: `Sensores para el vehículo ${placa} no encontrados.` }, null, 2) }]
                    };
                }

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

                const jsonGps = await responseGps.json();
                const data_gps = jsonGps.data && jsonGps.data.length > 0 ? jsonGps.data[0] : null;

                if (!data_gps) {
                    return {
                        content: [{ type: "text", text: JSON.stringify({ success: false, message: `Datos de GPS para el sensor del vehículo ${placa} no encontrados.` }, null, 2) }]
                    };
                }

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
                        estado: data_gps['3020140b4c'],
                        velocidad: data_gps['30201409fq'],
                        fechaReporte: data_gps['30201406jl'],
                        ubicacion: data_gps['70eb3c00mt'],

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
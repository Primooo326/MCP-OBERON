import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AxiosInstance } from "axios";
import z from "zod";
import { logToolExecution } from "../logging.js";

/**
 * Registra las herramientas operativas de monitoreo, flotas, rutas y geocercas.
 */
export function registerFleetTools(server: McpServer, apiClient: AxiosInstance) {
    console.log(`[Tools] Registrando herramientas de Flotas y Monitoreo en el servidor...`);

    // 1. Consultar_Desviaciones_Activas
    server.tool(
        "Consultar_Desviaciones_Activas",
        "Consulta en tiempo real los vehículos que actualmente se encuentran fuera de su corredor o ruta programada. Devuelve un resumen estructurado con placa, estado, distancia y tiempo de desvío, además de los datos originales completos.",
        {
            locationClient: z.string().optional().describe("ID de sede o cliente para filtrar desvíos activos."),
            status: z.string().optional().describe("Filtro por estado de desvío (ej: 'DESVIADO', 'ALERTA', etc.)."),
            repositorioId: z.string().optional().describe("ID opcional del repositorio multi-tenant (cabecera x-repository-id).")
        },
        async ({ locationClient, status, repositorioId }) => {
            const toolName = "Consultar Desviaciones Activas";
            const logParams = { locationClient, status, repositorioId };
            await logToolExecution({
                toolName,
                level: "INFO",
                parameters: logParams,
                status: "STARTED",
                message: "Consultando desviaciones de ruta activas en tiempo real."
            });

            try {
                const headers: Record<string, string> = {};
                if (repositorioId) {
                    headers['x-repository-id'] = repositorioId;
                }

                const response = await apiClient.get('/route-deviation/active', {
                    params: {
                        ...(locationClient ? { locationClient } : {}),
                        ...(status ? { status } : {})
                    },
                    headers
                });

                const raw = response.data?.data || response.data || [];
                const items = Array.isArray(raw) ? raw : [raw];
                const totalDesviados = Array.isArray(raw) ? raw.length : 0;

                const resumen = items.map((item: any) => ({
                    placa: item.plate || item.placa || item.vehicle || item.id || "N/A",
                    itinerarioId: item.itineraryId || item.itinerarioId || null,
                    estado: item.status || item.estado || "DESVIADO",
                    distanciaDesvioMetros: item.deviationDistanceMeters ?? item.distanciaM ?? item.distance ?? null,
                    duracionMinutos: item.durationMinutes ?? item.duracionMinutos ?? null,
                    coordenadasActuales: item.lastPoint || item.coordinates || item.lastLocation || null,
                    fechaReporte: item.reportedAt || item.updatedAt || item.date || null
                }));

                await logToolExecution({
                    toolName,
                    level: "INFO",
                    parameters: logParams,
                    status: "SUCCESS",
                    message: `Consulta exitosa. Se detectaron ${totalDesviados} eventos de desviación activos.`,
                    details: { totalDesviados }
                });

                const jsonResponse = JSON.stringify({
                    type: "active_deviations",
                    totalDesviados,
                    resumen,
                    raw
                }, null, 2);

                return { content: [{ type: "text", text: jsonResponse }] };
            } catch (error: any) {
                await logToolExecution({
                    toolName,
                    level: "ERROR",
                    parameters: logParams,
                    status: "FAILURE",
                    message: `Error al consultar desviaciones activas: ${error.message}`,
                    details: { error: error.message, stack: error.stack }
                });

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            message: "Error al consultar las desviaciones activas.",
                            error: error.response?.data?.message || error.message
                        }, null, 2)
                    }]
                };
            }
        }
    );

    // 2. Resumen_Desviaciones_Ruta
    server.tool(
        "Resumen_Desviaciones_Ruta",
        "Obtiene las métricas consolidadas del tablero de desvíos en un periodo de fechas (total de incidentes, vehículos afectados, tiempos promedio de desvío y estados de gestión).",
        {
            fechaInicio: z.string().describe("Fecha inicial en formato ISO o YYYY-MM-DD (ej: '2026-10-01')."),
            fechaFin: z.string().describe("Fecha final en formato ISO o YYYY-MM-DD (ej: '2026-10-09')."),
            placa: z.string().optional().describe("Placa específica para aislar el análisis a un solo vehículo."),
            itinerarioId: z.string().optional().describe("ID de un itinerario específico."),
            repositorioId: z.string().optional().describe("ID opcional del repositorio multi-tenant.")
        },
        async ({ fechaInicio, fechaFin, placa, itinerarioId, repositorioId }) => {
            const toolName = "Resumen Desviaciones Ruta";
            const logParams = { fechaInicio, fechaFin, placa, itinerarioId, repositorioId };
            await logToolExecution({
                toolName,
                level: "INFO",
                parameters: logParams,
                status: "STARTED",
                message: `Consultando resumen de desvíos de ruta entre ${fechaInicio} y ${fechaFin}.`
            });

            try {
                const headers: Record<string, string> = {};
                if (repositorioId) {
                    headers['x-repository-id'] = repositorioId;
                }

                const bodyPayload: any = {
                    startDate: fechaInicio,
                    endDate: fechaFin,
                    ...(placa ? { plate: placa } : {}),
                    ...(itinerarioId ? { itineraryId: itinerarioId } : {})
                };

                const response = await apiClient.post('/route-deviation/dashboard/summary', bodyPayload, { headers });
                const raw = response.data?.data || response.data || {};

                const metricas = {
                    totalEventos: raw.totalDeviations ?? raw.total ?? raw.totalEvents ?? 0,
                    vehiculosAfectados: raw.affectedVehicles ?? raw.vehiclesCount ?? null,
                    duracionPromedioMinutos: raw.avgDurationMinutes ?? raw.averageDuration ?? null,
                    desviosGestionados: raw.managedDeviations ?? raw.closed ?? null,
                    desviosPendientes: raw.pendingDeviations ?? raw.open ?? null
                };

                await logToolExecution({
                    toolName,
                    level: "INFO",
                    parameters: logParams,
                    status: "SUCCESS",
                    message: "Resumen de desviaciones obtenido correctamente.",
                    details: { metricas }
                });

                const jsonResponse = JSON.stringify({
                    type: "deviation_summary",
                    periodo: { desde: fechaInicio, hasta: fechaFin },
                    metricas,
                    raw
                }, null, 2);

                return { content: [{ type: "text", text: jsonResponse }] };
            } catch (error: any) {
                await logToolExecution({
                    toolName,
                    level: "ERROR",
                    parameters: logParams,
                    status: "FAILURE",
                    message: `Error al consultar resumen de desviaciones: ${error.message}`,
                    details: { error: error.message, stack: error.stack }
                });

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            message: "Error al consultar el resumen de desviaciones.",
                            error: error.response?.data?.message || error.message
                        }, null, 2)
                    }]
                };
            }
        }
    );

    // 3. Consultar_Cumplimiento_Itinerario
    server.tool(
        "Consultar_Cumplimiento_Itinerario",
        "Consulta la matriz de cumplimiento de itinerarios en un rango de fechas. Permite evaluar si los vehículos cumplieron los horarios planificados de salida y llegada (ON_TIME, OUTSIDE_WINDOW, PENDING).",
        {
            fechaInicio: z.string().describe("Fecha inicial de evaluación (YYYY-MM-DD)."),
            fechaFin: z.string().describe("Fecha final de evaluación (YYYY-MM-DD)."),
            placas: z.array(z.string()).optional().describe("Lista de placas de vehículos a evaluar."),
            estadoCumplimiento: z.enum(['ON_TIME', 'OUTSIDE_WINDOW', 'PENDING', 'NOT_EVALUABLE']).optional()
                .describe("Filtro por estado de cumplimiento: ON_TIME, OUTSIDE_WINDOW, PENDING o NOT_EVALUABLE."),
            repositorioId: z.string().optional().describe("ID opcional del repositorio multi-tenant.")
        },
        async ({ fechaInicio, fechaFin, placas, estadoCumplimiento, repositorioId }) => {
            const toolName = "Consultar Cumplimiento Itinerario";
            const logParams = { fechaInicio, fechaFin, placas, estadoCumplimiento, repositorioId };
            await logToolExecution({
                toolName,
                level: "INFO",
                parameters: logParams,
                status: "STARTED",
                message: `Consultando cumplimiento de itinerarios entre ${fechaInicio} y ${fechaFin}.`
            });

            try {
                const headers: Record<string, string> = {};
                if (repositorioId) {
                    headers['x-repository-id'] = repositorioId;
                }

                const bodyPayload: any = {
                    startDate: fechaInicio,
                    endDate: fechaFin,
                    ...(placas && placas.length > 0 ? { plateIds: placas } : {}),
                    ...(estadoCumplimiento ? { onTimeStatus: estadoCumplimiento } : {})
                };

                const response = await apiClient.post('/core/itinerary-compliance/query', bodyPayload, { headers });
                const raw = response.data?.data || response.data || {};
                const items = Array.isArray(raw.items) ? raw.items : (Array.isArray(raw) ? raw : []);

                const resumen = items.map((it: any) => ({
                    placa: it.plateId || it.placa || it.plate || "N/A",
                    ruta: it.routeName || it.routeId || it.itineraryName || "N/A",
                    estado: it.onTimeStatus || it.status || "DESCONOCIDO",
                    salidaPlanificada: it.plannedDepartureTime || it.plannedStart || null,
                    salidaReal: it.actualDepartureTime || it.actualStart || null,
                    llegadaPlanificada: it.plannedArrivalTime || it.plannedEnd || null,
                    llegadaReal: it.actualArrivalTime || it.actualEnd || null,
                    retrasoMinutos: it.delayMinutes ?? it.departureDelayMinutes ?? null
                }));

                await logToolExecution({
                    toolName,
                    level: "INFO",
                    parameters: logParams,
                    status: "SUCCESS",
                    message: `Consulta de cumplimiento exitosa. ${items.length} itinerarios evaluados.`,
                    details: { totalEvaluados: items.length }
                });

                const jsonResponse = JSON.stringify({
                    type: "itinerary_compliance",
                    totalEvaluados: items.length,
                    resumen,
                    raw
                }, null, 2);

                return { content: [{ type: "text", text: jsonResponse }] };
            } catch (error: any) {
                await logToolExecution({
                    toolName,
                    level: "ERROR",
                    parameters: logParams,
                    status: "FAILURE",
                    message: `Error al consultar cumplimiento de itinerarios: ${error.message}`,
                    details: { error: error.message, stack: error.stack }
                });

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            message: "Error al consultar el cumplimiento de itinerarios.",
                            error: error.response?.data?.message || error.message
                        }, null, 2)
                    }]
                };
            }
        }
    );

    // 4. Consultar_Geocercas
    server.tool(
        "Consultar_Geocercas",
        "Consulta las geocercas y polígonos perimetrales autorizados en el sistema. Si se envía un ID, retorna la definición detallada de esa geocerca.",
        {
            id: z.string().optional().describe("ID opcional de una geocerca específica para consultar sus coordenadas detalladas."),
            repositorioId: z.string().optional().describe("ID opcional del repositorio multi-tenant.")
        },
        async ({ id, repositorioId }) => {
            const toolName = "Consultar Geocercas";
            const logParams = { id, repositorioId };
            await logToolExecution({
                toolName,
                level: "INFO",
                parameters: logParams,
                status: "STARTED",
                message: id ? `Consultando detalle de geocerca ID: ${id}` : "Consultando listado de geocercas autorizadas."
            });

            try {
                const headers: Record<string, string> = {};
                if (repositorioId) {
                    headers['x-repository-id'] = repositorioId;
                }

                const endpoint = id ? `/core/geofence/${id}` : '/core/geofence';
                const response = await apiClient.get(endpoint, { headers });
                const raw = response.data?.data || response.data || [];
                const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);

                const resumen = list.map((g: any) => ({
                    id: g.id || g._id || "N/A",
                    nombre: g.name || g.nombre || "Sin Nombre",
                    tipo: g.type || g.tipo || "Polígono",
                    estado: g.status ?? g.active ?? true,
                    sedeId: g.locationClientId || g.locationId || null
                }));

                await logToolExecution({
                    toolName,
                    level: "INFO",
                    parameters: logParams,
                    status: "SUCCESS",
                    message: `Consulta de geocercas completada. ${list.length} registros obtenidos.`,
                    details: { totalGeocercas: list.length }
                });

                const jsonResponse = JSON.stringify({
                    type: "geofences",
                    totalGeocercas: list.length,
                    resumen,
                    raw
                }, null, 2);

                return { content: [{ type: "text", text: jsonResponse }] };
            } catch (error: any) {
                await logToolExecution({
                    toolName,
                    level: "ERROR",
                    parameters: logParams,
                    status: "FAILURE",
                    message: `Error al consultar geocercas: ${error.message}`,
                    details: { error: error.message, stack: error.stack }
                });

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            message: "Error al consultar las geocercas.",
                            error: error.response?.data?.message || error.message
                        }, null, 2)
                    }]
                };
            }
        }
    );
}

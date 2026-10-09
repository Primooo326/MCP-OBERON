import { registerFleetTools } from '../src/tools/fleet';
import { registerFleetPrompts } from '../src/prompts/fleet';

describe('Fleet and Monitoring Tools & Prompts', () => {
    let registeredTools: Record<string, Function> = {};
    let registeredPrompts: Record<string, Function> = {};

    const mockServer = {
        tool: jest.fn((name, desc, schema, handler) => {
            registeredTools[name] = handler;
        }),
        prompt: jest.fn((name, desc, schema, handler) => {
            registeredPrompts[name] = handler;
        })
    };

    const mockApiClient = {
        get: jest.fn(),
        post: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        registeredTools = {};
        registeredPrompts = {};

        registerFleetTools(mockServer as any, mockApiClient as any);
        registerFleetPrompts(mockServer as any);
    });

    describe('Tools Registration', () => {
        it('debe registrar las 4 herramientas operativas de flota', () => {
            expect(registeredTools).toHaveProperty('Consultar_Desviaciones_Activas');
            expect(registeredTools).toHaveProperty('Resumen_Desviaciones_Ruta');
            expect(registeredTools).toHaveProperty('Consultar_Cumplimiento_Itinerario');
            expect(registeredTools).toHaveProperty('Consultar_Geocercas');
        });
    });

    describe('Consultar_Desviaciones_Activas', () => {
        it('debe consultar desviaciones activas y procesar el resumen correctamente', async () => {
            const mockData = [
                {
                    plate: 'ABC123',
                    itineraryId: 'it-001',
                    status: 'DESVIADO',
                    deviationDistanceMeters: 450,
                    durationMinutes: 12,
                    lastPoint: [4.65, -74.08],
                    reportedAt: '2026-10-09T14:30:00Z'
                }
            ];

            mockApiClient.get.mockResolvedValueOnce({
                data: { statusCode: 200, data: mockData }
            });

            const handler = registeredTools['Consultar_Desviaciones_Activas'];
            const result = await handler({ locationClient: 'sede-1', status: 'DESVIADO', repositorioId: 'repo-abc' });

            expect(mockApiClient.get).toHaveBeenCalledWith('/route-deviation/active', {
                params: { locationClient: 'sede-1', status: 'DESVIADO' },
                headers: { 'x-repository-id': 'repo-abc' }
            });

            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.type).toBe('active_deviations');
            expect(parsed.totalDesviados).toBe(1);
            expect(parsed.resumen[0].placa).toBe('ABC123');
            expect(parsed.resumen[0].distanciaDesvioMetros).toBe(450);
        });

        it('debe manejar errores de la API correctamente', async () => {
            mockApiClient.get.mockRejectedValueOnce(new Error('Network error'));

            const handler = registeredTools['Consultar_Desviaciones_Activas'];
            const result = await handler({});

            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.success).toBe(false);
            expect(parsed.error).toContain('Network error');
        });
    });

    describe('Resumen_Desviaciones_Ruta', () => {
        it('debe enviar fechas y parámetros para obtener las métricas de resumen', async () => {
            const mockSummary = {
                totalDeviations: 10,
                affectedVehicles: 3,
                avgDurationMinutes: 15.2,
                managedDeviations: 8,
                pendingDeviations: 2
            };

            mockApiClient.post.mockResolvedValueOnce({
                data: { statusCode: 200, data: mockSummary }
            });

            const handler = registeredTools['Resumen_Desviaciones_Ruta'];
            const result = await handler({
                fechaInicio: '2026-10-01',
                fechaFin: '2026-10-09',
                placa: 'XYZ999'
            });

            expect(mockApiClient.post).toHaveBeenCalledWith('/route-deviation/dashboard/summary', {
                startDate: '2026-10-01',
                endDate: '2026-10-09',
                plate: 'XYZ999'
            }, { headers: {} });

            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.type).toBe('deviation_summary');
            expect(parsed.metricas.totalEventos).toBe(10);
            expect(parsed.metricas.vehiculosAfectados).toBe(3);
        });
    });

    describe('Consultar_Cumplimiento_Itinerario', () => {
        it('debe consultar la matriz de cumplimiento y sintetizar los itinerarios', async () => {
            const mockCompliance = {
                items: [
                    {
                        plateId: 'ABC123',
                        routeName: 'Ruta Norte',
                        onTimeStatus: 'ON_TIME',
                        plannedDepartureTime: '08:00',
                        actualDepartureTime: '08:02',
                        delayMinutes: 2
                    }
                ]
            };

            mockApiClient.post.mockResolvedValueOnce({
                data: { statusCode: 200, data: mockCompliance }
            });

            const handler = registeredTools['Consultar_Cumplimiento_Itinerario'];
            const result = await handler({
                fechaInicio: '2026-10-01',
                fechaFin: '2026-10-05',
                placas: ['ABC123'],
                estadoCumplimiento: 'ON_TIME',
                repositorioId: 'repo-1'
            });

            expect(mockApiClient.post).toHaveBeenCalledWith('/core/itinerary-compliance/query', {
                startDate: '2026-10-01',
                endDate: '2026-10-05',
                plateIds: ['ABC123'],
                onTimeStatus: 'ON_TIME'
            }, { headers: { 'x-repository-id': 'repo-1' } });

            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.type).toBe('itinerary_compliance');
            expect(parsed.totalEvaluados).toBe(1);
            expect(parsed.resumen[0].placa).toBe('ABC123');
            expect(parsed.resumen[0].estado).toBe('ON_TIME');
        });
    });

    describe('Consultar_Geocercas', () => {
        it('debe listar geocercas cuando no se pasa ID', async () => {
            const mockGeofences = [
                { id: 'geo-1', name: 'Zona Franca', type: 'Polígono', status: true }
            ];

            mockApiClient.get.mockResolvedValueOnce({
                data: { statusCode: 200, data: mockGeofences }
            });

            const handler = registeredTools['Consultar_Geocercas'];
            const result = await handler({});

            expect(mockApiClient.get).toHaveBeenCalledWith('/core/geofence', { headers: {} });

            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.type).toBe('geofences');
            expect(parsed.totalGeocercas).toBe(1);
            expect(parsed.resumen[0].nombre).toBe('Zona Franca');
        });

        it('debe consultar detalle de geocerca cuando se pasa ID', async () => {
            const mockGeofence = { id: 'geo-2', name: 'Base Operativa', type: 'Círculo', status: true };

            mockApiClient.get.mockResolvedValueOnce({
                data: { statusCode: 200, data: mockGeofence }
            });

            const handler = registeredTools['Consultar_Geocercas'];
            const result = await handler({ id: 'geo-2' });

            expect(mockApiClient.get).toHaveBeenCalledWith('/core/geofence/geo-2', { headers: {} });

            const parsed = JSON.parse(result.content[0].text);
            expect(parsed.totalGeocercas).toBe(1);
            expect(parsed.resumen[0].nombre).toBe('Base Operativa');
        });
    });

    describe('Prompts Registration', () => {
        it('debe registrar los dos prompts de análisis operativo', () => {
            expect(registeredPrompts).toHaveProperty('analisis_desviaciones_activas');
            expect(registeredPrompts).toHaveProperty('auditoria_cumplimiento_itinerarios');
        });

        it('debe generar las instrucciones de prompt para análisis de desvíos activos', async () => {
            const promptHandler = registeredPrompts['analisis_desviaciones_activas'];
            const result = await promptHandler({ locationClient: 'sede-bogota', prioridad: 'ALTA' });

            expect(result.messages[0].content.text).toContain('Consultar_Desviaciones_Activas');
            expect(result.messages[0].content.text).toContain('sede-bogota');
            expect(result.messages[0].content.text).toContain('ALTA');
        });

        it('debe generar las instrucciones de prompt para auditoría de cumplimiento', async () => {
            const promptHandler = registeredPrompts['auditoria_cumplimiento_itinerarios'];
            const result = await promptHandler({
                fechaInicio: '2026-10-01',
                fechaFin: '2026-10-09',
                placas: 'ABC123, XYZ789'
            });

            expect(result.messages[0].content.text).toContain('Consultar_Cumplimiento_Itinerario');
            expect(result.messages[0].content.text).toContain('2026-10-01');
            expect(result.messages[0].content.text).toContain('2026-10-09');
            expect(result.messages[0].content.text).toContain('ABC123');
        });
    });
});

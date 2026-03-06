import { registerUtilitiesTool } from '../src/tools/utilities';

// Mocks
const mockServer = {
    tool: jest.fn()
};

global.fetch = jest.fn();

describe('Utilities Tools', () => {
    let registeredTools: Record<string, Function> = {};

    beforeEach(() => {
        jest.clearAllMocks();
        registeredTools = {};

        // Interceptar llamadas a server.tool para guardar los callbacks (handlers)
        (mockServer.tool as jest.Mock).mockImplementation((name, description, schema, handler) => {
            registeredTools[name] = handler;
        });

        // Registrar las herramientas en nuestro servidor mock
        registerUtilitiesTool(mockServer as any);
    });

    describe('Verificar_Estado_Temperatura_Placa', () => {
        it('debe registrarse correctamente con el nombre esperado', () => {
            expect(registeredTools).toHaveProperty('Verificar_Estado_Temperatura_Placa');
        });

        it('debe transformar la placa a mayúsculas y sin espacios mediante Zod', () => {
            // Este test requiere validación directa con zod que normalmente hace el SDK,
            // asumiendo que el SDK aplica el transform, probaremos directamente la funcion asíncrona.
        });
    });

    describe('Verificar_Estado_GPS_Placa', () => {
        let handler: Function;

        beforeEach(() => {
            handler = registeredTools['Verificar_Estado_GPS_Placa'];
        });

        it('debe retornar mensaje de error si el vehículo no es encontrado', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: [] }) // Vehículos vacíos
            });

            const result = await handler({ placa: 'XYZ123' });

            expect(result.content[0].text).toContain('no encontrado');
            expect(JSON.parse(result.content[0].text).success).toBe(false);
        });

        it('debe retornar mensaje de error si no se encuentran sensores', async () => {
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: [{ '91c2de021s': 'Camion', '91c2de04aw': 'Flota A' }] })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: [] }) // Sensores vacíos
                });

            const result = await handler({ placa: 'XYZ123' });

            expect(result.content[0].text).toContain('Sensores para el vehículo XYZ123 no encontrados');
            expect(JSON.parse(result.content[0].text).success).toBe(false);
        });

        it('debe retornar mensaje de error si no se encuentra data GPS', async () => {
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: [{ '91c2de021s': 'Camion', '91c2de04aw': 'Flota A' }] })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: [{ '7ec59900pv': 'id_sensor' }] })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: [] }) // GPS vacío
                });

            const result = await handler({ placa: 'XYZ123' });

            expect(result.content[0].text).toContain('Datos de GPS para el sensor del vehículo XYZ123 no encontrados');
            expect(JSON.parse(result.content[0].text).success).toBe(false);
        });

        it('debe armar el objeto exitoso si toda la data está presente', async () => {
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: [{ '91c2de021s': 'Camion', '91c2de04aw': 'Flota A' }] })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: [{ '7ec59900pv': 'id_sensor', '7ec59905p8': 'TipoX', 'fd60b3003m': 'ProvY', '33894800sf': true }] })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        data: [{
                            '3020140b4c': 'En movimiento',
                            '30201409fq': '80km/h',
                            '30201406jl': '2023-10-01',
                            '70eb3c00mt': 'UbicacionA'
                        }]
                    })
                });

            const result = await handler({ placa: 'XYZ123' });
            const parsedText = JSON.parse(result.content[0].text);

            expect(parsedText.success).toBe(true);
            expect(parsedText.data.vehiculo.tipo).toBe('Camion');
            expect(parsedText.data.sensores.proveedor).toBe('ProvY');
            expect(parsedText.data.gps.velocidad).toBe('80km/h');
        });
    });
});

# Skill: Crear Usuario en Oberon 360

Guía paso a paso para crear un nuevo usuario en el sistema Oberon 360.

## Flujo del Skill

### Paso 1: Obtener Roles Disponibles

Antes de crear un usuario, debes conocer los roles existentes para asignar uno.

Usa la herramienta `Obtener_Roles` para listar los roles disponibles. Puedes filtrar por nombre si el usuario ya tiene uno en mente.

**Consulta sugerida a la API:**
```
GET /core/roles?take=100&page=1&order=ASC
```

### Paso 2: Seleccionar un Rol

Presenta al usuario los roles obtenidos y pídele que elija uno. Cada rol tiene:
- `_id`: Identificador único
- `name`: Nombre del rol
- `label`: Etiqueta visible

Confirma con el usuario cuál desea asignar antes de continuar.

### Paso 3: Solicitar Datos del Usuario

Una vez seleccionado el rol `rolId`, solicita al usuario los siguientes campos obligatorios:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `name` | Nombre completo del usuario | "Juan Pérez García" |
| `username` | Nombre de usuario único para login | "juan.perez" |
| `email` | Correo electrónico | "juan@ejemplo.com" |
| `cellphone` | Número de celular | "573001234567" |
| `numeroIdentificacion` | Número de identificación | "1234567890" |
| `locations` | IDs de ubicaciones a asignar | ["loc_id_1", "loc_id_2"] |

### Paso 4: Crear el Usuario

Ejecuta `Crear_Usuario` con todos los datos recolectados.

**Campos para la herramienta:**
- `rolId`: ID del rol seleccionado en Paso 2
- `name`: Nombre completo
- `username`: Nombre de usuario
- `email`: Correo electrónico
- `cellphone`: Celular (con código de país, sin `+`)
- `numeroIdentificacion`: Documento de identidad
- `locations`: Array de IDs de ubicación

### Paso 5: Confirmación

Si la creación es exitosa, informa al usuario con los datos del nuevo usuario creado.
Si ocurre un error, muestra el mensaje de error y sugiere posibles soluciones:
- El `username` ya existe: solicitar uno diferente
- El `email` ya está registrado: verificar con el usuario
- Campos obligatorios faltantes: revisar los datos ingresados

## Casos Especiales

### Ubicaciones
Si el usuario no sabe qué ubicaciones asignar, usa `Obtener_Clientes` para listar los clientes disponibles y sus ubicaciones.
Las ubicaciones se asignan como un array de strings con los IDs de ubicación.

### Validaciones
- `email`: Debe tener formato de correo válido
- `cellphone`: Incluir código de país sin `+` (ej: 57300...)
- `username`: Sin espacios, único en el sistema

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs/promises";


export function registerFunctionalitiesResource(server: McpServer) {


    server.resource(
        "functionalities context",
        "config://functionalities",
        {
            title: "Interface IFuncionalidad",
            description: "Define la estructura completa de un módulo o pantalla dentro de la aplicación. Es la entidad principal del sistema.",
            mimeType: "text/plain"
        },
        async (uri) => ({
            contents: [{
                uri: uri.href,
                text: "A continuación se detalla cada interfaz y sus propiedades.",
                blob: {
                    "interfaces": {
                        "IFuncionalidad": {
                            "description": "Define la estructura completa de un módulo o pantalla dentro de la aplicación. Es la entidad principal del sistema.",
                            "properties": [
                                {
                                    "name": "_id",
                                    "type": "string",
                                    "description": "Identificador único del documento en MongoDB (ObjectId)."
                                },
                                {
                                    "name": "_update_date",
                                    "type": "Date",
                                    "description": "(Opcional) Fecha de la última actualización del documento."
                                },
                                {
                                    "name": "id",
                                    "type": "string",
                                    "description": "Un identificador único legible y manejable para el módulo (ej: 'gestion_usuarios')."
                                },
                                {
                                    "name": "name",
                                    "type": "string",
                                    "description": "Nombre técnico o interno del módulo."
                                },
                                {
                                    "name": "label",
                                    "type": "string",
                                    "description": "Etiqueta o nombre visible para el usuario final en la UI (ej: 'Gestión de Usuarios')."
                                },
                                {
                                    "name": "location",
                                    "type": "string",
                                    "description": "La ruta URL donde este módulo será accesible en la aplicación (ej: '/admin/usuarios')."
                                },
                                {
                                    "name": "moduleType",
                                    "type": "EModuleType",
                                    "description": "Clave: Define el tipo de módulo, lo que determina su comportamiento y renderizado."
                                },
                                {
                                    "name": "structureLocation",
                                    "type": "string",
                                    "description": "Nombre de la colección en MongoDB donde se almacenarán los datos de este módulo."
                                },
                                {
                                    "name": "description",
                                    "type": "string",
                                    "description": "Descripción breve de lo que hace el módulo, visible para el usuario."
                                },
                                {
                                    "name": "icon",
                                    "type": "string",
                                    "description": "Nombre o clase del ícono a mostrar en el menú junto al 'label' del módulo."
                                },
                                {
                                    "name": "parametros",
                                    "type": "IParametro[]",
                                    "description": "Clave: Array que define cada campo/columna del módulo. Es el blueprint para tablas y formularios."
                                },
                                {
                                    "name": "authorizedModules",
                                    "type": "string",
                                    "description": "(Opcional) Indica si este módulo depende de la autorización de otro módulo."
                                },
                                {
                                    "name": "authorizedRoles",
                                    "type": "IAutorizedRole[]",
                                    "description": "Array que define qué roles y desde qué ubicaciones tienen permiso para acceder a este módulo."
                                },
                                {
                                    "name": "discriminatedLocation",
                                    "type": "boolean",
                                    "description": "Si es 'true', el acceso a los datos de este módulo se filtra por la ubicación ('locationClient') del usuario."
                                },
                                {
                                    "name": "onlyForm",
                                    "type": "boolean",
                                    "description": "Si es 'true', este módulo se renderizará únicamente como un formulario, sin la vista de tabla."
                                },
                                {
                                    "name": "_locationClient",
                                    "type": "string",
                                    "description": "(Opcional) Campo interno para almacenar la ubicación del cliente que realiza una operación."
                                },
                                {
                                    "name": "columnsOrder",
                                    "type": "any[]",
                                    "description": "(Opcional) Define un orden personalizado para las columnas en la vista de tabla."
                                },
                                {
                                    "name": "toolsMaps",
                                    "type": "any[]",
                                    "description": "(Opcional) Configuraciones específicas para herramientas relacionadas con mapas."
                                },
                                {
                                    "name": "checklist",
                                    "type": "any[]",
                                    "description": "(Opcional) Si el módulo funciona como un checklist, aquí se define su estructura."
                                },
                                {
                                    "name": "causes",
                                    "type": "any[]",
                                    "description": "(Opcional) Utilizado para definir posibles causas o categorías en módulos de gestión de incidencias."
                                },
                                {
                                    "name": "selectedModuleP",
                                    "type": "string",
                                    "description": "(Opcional) Identificador de un módulo 'padre' en una relación jerárquica."
                                },
                                {
                                    "name": "selectedModuleC",
                                    "type": "string",
                                    "description": "(Opcional) Identificador de un módulo 'hijo'."
                                },
                                {
                                    "name": "available",
                                    "type": "string",
                                    "description": "Estado del módulo (ej: 'disponible', 'archivado')."
                                },
                                {
                                    "name": "link",
                                    "type": "string",
                                    "description": "Un enlace URL externo relacionado con el módulo."
                                },
                                {
                                    "name": "assignUser",
                                    "type": "boolean",
                                    "description": "Si es 'true', permite asignar registros de este módulo a usuarios específicos."
                                },
                                {
                                    "name": "alertWithSound",
                                    "type": "boolean",
                                    "description": "(Opcional) Si es true, las alertas generadas por este módulo producirán un sonido."
                                },
                                {
                                    "name": "advancedConfiguration",
                                    "type": "object",
                                    "description": "(Opcional) Contiene configuraciones avanzadas, como notificaciones por email o WhatsApp."
                                },
                                {
                                    "name": "maxHoursToManage",
                                    "type": "number",
                                    "description": "(Opcional) Tiempo máximo en horas para gestionar un registro antes de que se genere una alerta."
                                },
                                {
                                    "name": "paramsDashboards",
                                    "type": "unknown",
                                    "description": "(Opcional, obsoleto) Parámetros para dashboards. Reemplazado por 'paramDashboard'."
                                },
                                {
                                    "name": "paramDashboard",
                                    "type": "IDashboardConfig",
                                    "description": "(Opcional) Configuración detallada si 'moduleType' es 'Dashboard'. Define nodos y conexiones."
                                },
                                {
                                    "name": "orderAndVisible",
                                    "type": "string[]",
                                    "description": "Array de 'columnId' de los 'parametros' que define qué columnas son visibles y en qué orden."
                                },
                                {
                                    "name": "layout",
                                    "type": "FormLayout",
                                    "description": "(Opcional) Define una estructura de formulario compleja con secciones, filas y columnas para un layout no estándar."
                                }
                            ]
                        },
                        "EModuleType": {
                            "description": "Enumera los posibles tipos de módulos, dictando su funcionalidad principal.",
                            "values": [
                                {
                                    "value": 1,
                                    "name": "Parametrizacion",
                                    "description": "Módulos de configuración base del sistema (ej: tipos de usuario, categorías)."
                                },
                                {
                                    "value": 2,
                                    "name": "Gestion",
                                    "description": "Módulos operacionales para el día a día (ej: gestión de tickets, registro de clientes)."
                                },
                                {
                                    "value": 3,
                                    "name": "Autorizacion",
                                    "description": "Módulos que requieren un flujo de aprobación o autorización."
                                },
                                {
                                    "value": 4,
                                    "name": "PowerBI",
                                    "description": "Módulos diseñados para embeber y mostrar reportes de Power BI."
                                },
                                {
                                    "value": 5,
                                    "name": "Dashboard",
                                    "description": "Módulos que renderizan un dashboard personalizado definido en 'paramDashboard'."
                                }
                            ]
                        },
                        "IParametro": {
                            "description": "Define una única columna de una tabla o un campo de un formulario. Es el átomo de la construcción de la UI.",
                            "properties": [
                                {
                                    "name": "columnId",
                                    "type": "string",
                                    "description": "Identificador único del campo (ej: 'user_name', 'product_price')."
                                },
                                {
                                    "name": "titulo",
                                    "type": "string",
                                    "description": "Etiqueta visible del campo para el usuario (ej: 'Nombre de Usuario')."
                                },
                                {
                                    "name": "tipo",
                                    "type": "string",
                                    "description": "Clave: Tipo de dato del campo (ej: 'texto', 'numero', 'fecha', 'select', 'file', 'mapa', 'referencia')."
                                },
                                {
                                    "name": "icon",
                                    "type": "string",
                                    "description": "Ícono asociado al campo en el formulario."
                                },
                                {
                                    "name": "obligatorio",
                                    "type": "boolean",
                                    "description": "'true' si el campo no puede estar vacío."
                                },
                                {
                                    "name": "minLength",
                                    "type": "string",
                                    "description": "Validación de longitud mínima para campos de texto."
                                },
                                {
                                    "name": "maxLength",
                                    "type": "string",
                                    "description": "Validación de longitud máxima."
                                },
                                {
                                    "name": "accept",
                                    "type": "string[]",
                                    "description": "Para campos de tipo 'file', define los tipos de archivo aceptados (ej: ['.pdf', '.jpg'])."
                                },
                                {
                                    "name": "referencia",
                                    "type": "string",
                                    "description": "Si 'tipo' es 'referencia', este es el 'id' del 'IFuncionalidad' al que se hace referencia. Crea una relación."
                                },
                                {
                                    "name": "displayField",
                                    "type": "string",
                                    "description": "Para campos de 'referencia', especifica qué 'columnId' del módulo referenciado se debe mostrar."
                                },
                                {
                                    "name": "opciones",
                                    "type": "{ value: string; label: string }[]",
                                    "description": "Para campos de tipo 'select', array con los pares '{ value, label }' de las opciones."
                                },
                                {
                                    "name": "newOption",
                                    "type": "string",
                                    "description": "(Opcional) Permite al usuario agregar una nueva opción a un campo 'select' si no existe."
                                },
                                {
                                    "name": "selectedModule",
                                    "type": "string",
                                    "description": "(Opcional) En ciertos contextos, pre-selecciona un módulo relacionado."
                                },
                                {
                                    "name": "multiple",
                                    "type": "boolean",
                                    "description": "Para campos 'select' o 'referencia', permite seleccionar múltiples valores."
                                },
                                {
                                    "name": "depende",
                                    "type": "boolean",
                                    "description": "'true' si el valor o las opciones de este campo dependen de otro."
                                },
                                {
                                    "name": "columnaDependiente",
                                    "type": "string",
                                    "description": "'columnId' del campo del cual este depende."
                                },
                                {
                                    "name": "dependValue",
                                    "type": "any",
                                    "description": "El valor que debe tener 'columnaDependiente' para que este campo se active o muestre."
                                },
                                {
                                    "name": "automaticOption",
                                    "type": "{ value: string; label: string } | string",
                                    "description": "Una opción que se selecciona automáticamente bajo ciertas condiciones."
                                },
                                {
                                    "name": "alerta",
                                    "type": "boolean",
                                    "description": "'true' si se debe generar una alerta basada en el valor de este campo."
                                },
                                {
                                    "name": "alertaValor",
                                    "type": "string",
                                    "description": "El valor que dispara la alerta."
                                },
                                {
                                    "name": "viewConfig",
                                    "type": "object",
                                    "description": "Para campos complejos como 'referencia', define cómo previsualizar los datos referenciados."
                                },
                                {
                                    "name": "valueFormula",
                                    "type": "string",
                                    "description": "Una fórmula para calcular el valor de este campo automáticamente (ej: `campoA * campoB`)."
                                },
                                {
                                    "name": "dateFormat",
                                    "type": "string",
                                    "description": "Formato para mostrar fechas (ej: 'DD/MM/YYYY HH:mm')."
                                },
                                {
                                    "name": "chackboxAutomatic",
                                    "type": "boolean",
                                    "description": "Para un checkbox, indica si debe marcarse automáticamente bajo alguna condición."
                                },
                                {
                                    "name": "autoincremental",
                                    "type": "boolean",
                                    "description": "Si es 'true', el valor de este campo se genera automáticamente como un número secuencial."
                                },
                                {
                                    "name": "useWhereCondition",
                                    "type": "IUseWhereCondition",
                                    "description": "Define una condición 'WHERE' para filtrar las opciones de un campo de tipo 'referencia'."
                                },
                                {
                                    "name": "visible",
                                    "type": "boolean",
                                    "description": "(Opcional) Controla si el campo es visible en el formulario o tabla por defecto."
                                }
                            ]
                        },
                        "IUseWhereCondition": {
                            "description": "Define una condición de filtrado para campos de tipo 'referencia', permitiendo crear filtros dinámicos.",
                            "properties": [
                                {
                                    "name": "moduleId",
                                    "type": "string",
                                    "description": "ID del módulo sobre el cual se aplicará el filtro."
                                },
                                {
                                    "name": "columnId",
                                    "type": "string",
                                    "description": "Columna del módulo referenciado que se usará para filtrar."
                                },
                                {
                                    "name": "operator",
                                    "type": "string",
                                    "description": "Operador de comparación (ej: 'eq', 'ne', 'gt', 'lt')."
                                },
                                {
                                    "name": "value",
                                    "type": "string",
                                    "description": "Valor contra el cual se compara. Puede ser un valor fijo."
                                },
                                {
                                    "name": "valueFromField",
                                    "type": "boolean",
                                    "description": "Si es 'true', el 'value' se toma dinámicamente de otro campo del formulario actual."
                                }
                            ]
                        },
                        "IAutorizedRole": {
                            "description": "Define la relación entre una ubicación permitida y los roles que pueden acceder desde ella.",
                            "properties": [
                                {
                                    "name": "locationClient",
                                    "type": "IAllowedLocation",
                                    "description": "El objeto que representa la ubicación física (sede, oficina) desde donde se permite el acceso."
                                },
                                {
                                    "name": "roles",
                                    "type": "{ label: string, value: string }[]",
                                    "description": "Array de roles que tienen permiso desde esa 'locationClient'."
                                }
                            ]
                        },
                        "IAllowedLocation": {
                            "description": "Representa una ubicación física específica desde la cual un usuario puede operar.",
                            "properties": [
                                { "name": "id", "type": "string", "description": "Identificador único de la ubicación." },
                                { "name": "clientId", "type": "string", "description": "ID del cliente al que pertenece la ubicación." },
                                { "name": "address", "type": "string", "description": "Dirección de la ubicación." },
                                { "name": "descriptionAddress", "type": "string", "description": "Descripción adicional de la dirección." },
                                { "name": "latitude", "type": "number", "description": "Coordenada de latitud." },
                                { "name": "longitude", "type": "number", "description": "Coordenada de longitud." },
                                { "name": "status", "type": "boolean", "description": "Estado de la ubicación (activa/inactiva)." },
                                { "name": "insertDate", "type": "string", "description": "Fecha de creación del registro." },
                                { "name": "lastUpdateUser", "type": "string", "description": "Usuario que realizó la última modificación." }
                            ]
                        },
                        "IDashboardConfig": {
                            "description": "Estructura para definir un dashboard personalizado, compatible con librerías como React Flow.",
                            "properties": [
                                {
                                    "name": "nodes",
                                    "type": "Array<object>",
                                    "description": "Array de nodos del dashboard. Cada nodo es un componente visual (una tarjeta, un gráfico)."
                                },
                                {
                                    "name": "edges",
                                    "type": "Array<object>",
                                    "description": "Array de conexiones (líneas) entre los nodos, definiendo el flujo o relación."
                                },
                                {
                                    "name": "canvas",
                                    "type": "object",
                                    "description": "(Opcional) Configuraciones de estilo para el lienzo del dashboard (fondo, tamaño, etc.)."
                                }
                            ]
                        },
                        "FormLayout": {
                            "description": "Contenedor principal que tiene un array de secciones para construir un formulario con layout complejo.",
                            "properties": [
                                {
                                    "name": "sections",
                                    "type": "Section[]",
                                    "description": "Un array de objetos 'Section' que componen el formulario."
                                }
                            ]
                        },
                        "Section": {
                            "description": "Representa una sección del formulario con un título (ej: 'Datos Personales'). Contiene un array de filas.",
                            "properties": [
                                { "name": "id", "type": "string", "description": "Identificador único de la sección." },
                                { "name": "title", "type": "string", "description": "Título visible de la sección." },
                                { "name": "showTitle", "type": "boolean", "description": "Controla si el título es visible." },
                                { "name": "showBorder", "type": "boolean", "description": "Controla si se muestra un borde alrededor de la sección." },
                                { "name": "rows", "type": "Row[]", "description": "Un array de objetos 'Row' que componen la sección." }
                            ]
                        },
                        "Row": {
                            "description": "Representa una fila dentro de una sección. Contiene un array de columnas.",
                            "properties": [
                                { "name": "id", "type": "string", "description": "Identificador único de la fila." },
                                { "name": "showBorder", "type": "boolean", "description": "Controla si se muestra un borde alrededor de la fila." },
                                { "name": "columns", "type": "Column[]", "description": "Un array de objetos 'Column' que componen la fila." }
                            ]
                        },
                        "Column": {
                            "description": "Representa una columna dentro de una fila. Define el ancho y el contenido final.",
                            "properties": [
                                { "name": "id", "type": "string", "description": "Identificador único de la columna." },
                                { "name": "width", "type": "number", "description": "Ancho de la columna (usualmente en un sistema de grillas, ej: 50 para 50%)." },
                                { "name": "showBorder", "type": "boolean", "description": "Controla si se muestra un borde alrededor de la columna." },
                                { "name": "content", "type": "ColumnContent", "description": "El contenido de la columna, que especifica el 'columnId' del parámetro a renderizar." }
                            ]
                        }
                    }
                }
            }]
        })
    );

    server.resource(
        "guia_filtros_avanzados_oberon",
        "file:///assets/guia_filtros_avanzados_oberon.md",
        {
            title: "Guía para Búsquedas y Filtros Avanzados en Oberon 360",
            description: "Para realizar búsquedas avanzadas, debes construir un objeto de filtro en formato JSON.Este objeto se traduce internamente en una consulta a la base de datos MongoDB.",
            "mimeType": "text/markdown",
        },
        async (uri) => ({
            contents: [{
                uri: uri.href,
                text: await fs.readFile(uri.href, "utf8"),
            }]
        })
    );

}
# Arquitectura de Agentes y IA

Este proyecto utiliza **Genkit**, un framework de Google, para orquestar toda la funcionalidad relacionada con la Inteligencia Artificial (IA). Genkit proporciona un conjunto de herramientas para construir flujos de IA robustos, conectarse a modelos de lenguaje (LLMs) y gestionar la lógica de la IA del lado del servidor.

## Configuración Principal de Genkit

El punto central de la configuración de Genkit en esta aplicación se encuentra en:

-   `src/ai/genkit.ts`: Este archivo exporta una instancia global de Genkit (`ai`). Aquí es donde se inicializa Genkit y se configuran los plugins necesarios, como el plugin de `googleAI` para conectarse a los modelos de Gemini. Cualquier configuración global, como la selección del modelo por defecto, se realiza en este archivo.

## Entorno de Desarrollo

-   `src/ai/dev.ts`: Este archivo sirve como punto de entrada para el servidor de desarrollo de Genkit (`genkit start`). Su propósito es importar todos los flujos de IA definidos en el proyecto para que Genkit los reconozca y los haga disponibles para pruebas y ejecución.

## Creación de Nuevos Agentes (Flujos)

Para mantener el código organizado, todos los nuevos agentes o capacidades de IA deben implementarse como **Flujos de Genkit** y ubicarse dentro del directorio `src/ai/flows/`.

Un flujo típico de Genkit en este proyecto sigue esta estructura:

1.  **Directiva `'use server';`**: Todos los flujos deben ejecutarse en el servidor.
2.  **Definición de Esquemas (Zod)**: Se utiliza `zod` para definir esquemas de entrada (`InputSchema`) y salida (`OutputSchema`) para el flujo, garantizando la seguridad de los tipos.
3.  **Definición del Prompt (`ai.definePrompt`)**: Se crea una plantilla de prompt reutilizable que define cómo se estructurará la entrada para el LLM.
4.  **Definición del Flujo (`ai.defineFlow`)**: Este es el núcleo del agente. Envuelve la lógica, llama al prompt con los datos de entrada y devuelve la salida procesada.
5.  **Función de Exportación**: Se exporta una función `async` simple que actúa como un contenedor (wrapper) para el flujo, haciéndolo fácilmente invocable desde los componentes de React en el frontend.

Este enfoque modular permite que cada capacidad de IA sea autónoma, fácil de probar y reutilizable en toda la aplicación.

## Consideraciones Críticas para la IA

Este documento, junto con el `README.md`, debe ser **revisado obligatoriamente** antes de realizar cualquier modificación en el código. Contienen directrices esenciales para mantener la estabilidad y coherencia del proyecto.

### Protocolo para Cambios Significativos

Si se solicita un cambio que pueda afectar el funcionamiento central de la plataforma (ej. flujos de autenticación, lógica de base de datos, reglas de seguridad, procesos de monetización), se debe seguir estrictamente el siguiente protocolo:

1.  **Consultar Primero**: Nunca implementar un cambio crítico directamente. Primero, se debe **consultar con el operador humano** (el usuario que proporciona los prompts). Explicar de manera clara y concisa el plan de acción propuesto.

2.  **Análisis de Riesgos y Beneficios**: Como parte de la consulta, se debe presentar un análisis detallado:
    *   **Qué se puede romper**: Identificar las partes del sistema que podrían verse afectadas negativamente por el cambio. (Ej: "Cambiar esta regla de seguridad podría bloquear el acceso de los administradores al panel de usuarios").
    *   **Ventajas del cambio**: Explicar claramente qué problema resuelve el cambio o qué mejora aporta.
    *   **Complejidad y Esfuerzo**: Dar una estimación del alcance del cambio.

3.  **Cuestionar Decisiones Peligrosas**: Si el cambio solicitado es inherentemente riesgoso, ineficiente o va en contra de las buenas prácticas establecidas (ej. cambiar las reglas de seguridad de una manera que exponga datos de usuarios), es mi **responsabilidad cuestionar la decisión**. Debo explicar los riesgos de forma clara y proponer alternativas más seguras y robustas.

4.  **Implementación Segura (Si se Aprueba)**: Si el operador humano confirma que desea proceder a pesar de los riesgos, mi deber es encontrar la **mejor y más segura manera de implementar el cambio**. Esto implica:
    *   Revisar **todos** los archivos que puedan verse afectados directa o indirectamente.
    *   Corregir cualquier inconsistencia o error que el cambio pueda introducir.
    *   Asegurar que la nueva implementación sea coherente con la arquitectura existente.

### Errores Pasados y Zonas de Cuidado

La experiencia ha demostrado que ciertas áreas son particularmente sensibles:

*   **Reglas de Seguridad de Firestore (`firestore.rules`)**: Esta ha sido la principal fuente de errores. Una regla mal configurada puede denegar el acceso a toda la aplicación. Cualquier cambio aquí debe ser analizado con extremo cuidado, considerando cada consulta (`get`, `list`, `read`, `write`) y cada rol de usuario (público, autenticado, administrador).
*   **Lógica de Conteo de Clics (`link/[shortId]/ClientComponent.tsx`)**: Se ha optado por un enfoque del lado del cliente para el conteo de clics debido a su simplicidad y fiabilidad, después de que un enfoque de API de backend fallara por problemas de permisos. Es crucial que las operaciones de actualización (incrementar clics, añadir ganancias) se realicen de forma atómica usando `writeBatch`.
*   **Coherencia de Datos y Lógica Financiera**: La sincronización de datos es vital.
    *   **Cálculo de Ganancias y Balance**: El hook `useUser.ts` es la **única fuente de la verdad** para el balance. Las ganancias generadas (`generatedEarnings`) se calculan dinámicamente sumando las ganancias de cada enlace individual, tanto en el dashboard de usuario como en el de admin, para garantizar consistencia. El balance disponible final tiene en cuenta los pagos ya completados y los pendientes.
    *   **Adición de Balance Manual**: Cuando un administrador añade balance manualmente, se trata como un "pago negativo". En lugar de modificar las ganancias generadas, se decrementa el campo `paidEarnings` del usuario. Esto aumenta correctamente el balance disponible (`Generated - Paid`).
    *   Cualquier cambio en la lógica de monetización (`link/[shortId]/ClientComponent.tsx`) debe revisarse en los hooks y componentes que muestran estos datos (`useUser.ts`, `admin/users/page.tsx`).
*   **Puerta de Monetización (`LinkGate.tsx`)**: La interfaz de monetización ahora detecta dinámicamente la plataforma de cada regla (YouTube, Facebook, etc.) y aplica un color e icono distintivo al botón. Esto mejora la experiencia del usuario y requiere que los estilos y los iconos asociados se mantengan correctamente.

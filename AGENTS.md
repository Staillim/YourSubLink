# Arquitectura de Agentes y IA

Este proyecto utiliza **Genkit**, un framework de Google, para orquestar toda la funcionalidad relacionada con la Inteligencia Artificial (IA). Genkit proporciona un conjunto de herramientas para construir flujos de IA robustos, conectarse a modelos de lenguaje (LLMs) y gestionar la lógica de la IA del lado del servidor.

## ⚡ Agentes Implementados (Actualizados)

### 1. Agente de Análisis de Seguridad (`analyzeLinkSecurity`)

**Nuevo agente de IA** implementado para detectar actividad fraudulenta:

- **Ubicación**: `src/ai/flows/analyzeLinkSecurity.ts`
- **Propósito**: Analiza patrones de clics para detectar comportamiento robotizado o fraudulento
- **Entrada**: ID del enlace a analizar
- **Proceso**:
  1. Consulta los últimos 200 clics del enlace
  2. Ordena los timestamps cronológicamente
  3. Envía los datos al modelo de IA (Gemini) con prompt especializado
  4. Analiza patrones como intervalos uniformes, ráfagas de actividad, etc.
- **Salida**: 
  - `isSuspicious`: Boolean
  - `riskLevel`: 'none' | 'moderate' | 'high'
  - `reason`: Explicación de la decisión
  - `analyzedClicks`: Número de clics analizados
- **Integración**: Llamado desde el panel de administración de enlaces
- **Acción automática**: Suspende monetización si riesgo = 'high'

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

## 🚨 Consideraciones Críticas para Desarrollo

### Seguridad y Anti-Fraude
- **NUNCA** modificar la lógica de conteo de clics sin analizar el impacto en las ganancias
- Todos los cambios en `ClientComponent.tsx` deben mantener las validaciones temporales
- El agente de seguridad debe mantenerse actualizado con nuevos patrones de fraude

### Integridad Financiera
- Los cálculos de CPM (global vs personalizado) son críticos para la monetización
- El sistema de suspensiones debe verificarse en todas las rutas de generación de ingresos
- Las notificaciones de cambios en CPM son obligatorias para transparencia

### Escalabilidad de IA
- Nuevos agentes deben seguir el patrón establecido en `analyzeLinkSecurity.ts`
- Todos los flujos de Genkit deben tener esquemas de entrada y salida bien definidos
- Los prompts deben ser específicos y claros para obtener resultados consistentes

## 📋 Checklist para Nuevas Implementaciones de IA

1. ✅ Definir esquemas Zod para entrada y salida
2. ✅ Crear prompt especializado y específico
3. ✅ Implementar manejo de errores robusto
4. ✅ Agregar logging apropiado
5. ✅ Exportar función wrapper para uso en frontend
6. ✅ Registrar en `src/ai/dev.ts` para desarrollo
7. ✅ Documentar en este archivo

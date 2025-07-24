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

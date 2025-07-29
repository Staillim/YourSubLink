# YourSubLink - Documentación del Proyecto

Bienvenido a YourSubLink, una completa aplicación de acortamiento y monetización de enlaces construida con tecnologías web modernas.

## 1. Advertencias y Directrices para Cambios Futuros

**¡Atención!** Antes de realizar cualquier modificación, es **obligatorio** revisar este `README.md` y el archivo `AGENTS.md`. Contienen directrices cruciales para la estabilidad y el funcionamiento de la aplicación.

### Protocolo para Cambios Significativos

Cualquier cambio que afecte la lógica central (autenticación, base de datos, flujo de monetización, reglas de seguridad) debe ser tratado con extremo cuidado.

1.  **Consultar con el Operador de la IA**: Antes de escribir código, se debe presentar un plan claro al operador humano.
2.  **Analizar Riesgos**: Se debe explicar qué podría romperse, cuáles son las ventajas y cuál es la complejidad.
3.  **Cuestionar y Proponer Alternativas**: Si un cambio es arriesgado, se deben proponer soluciones más seguras. La estabilidad es la máxima prioridad.
4.  **Implementación Responsable**: Si se aprueba el cambio, el responsable (sea humano o IA) debe revisar y corregir **todos** los archivos afectados para garantizar una transición sin errores.

### Zonas de Alto Riesgo y Errores Históricos

*   **Reglas de Seguridad de Firestore (`firestore.rules`)**: **La principal fuente de errores en el pasado.** Una configuración incorrecta aquí puede denegar el acceso a toda la aplicación para ciertos roles. Un error común fue no diferenciar entre permisos `get` (un documento) y `list` (múltiples documentos), bloqueando los paneles de control. **Cualquier cambio aquí debe ser verificado contra cada consulta de la aplicación.**
*   **Lógica del Lado del Cliente vs. Servidor**: Inicialmente, se intentó un enfoque de API de backend (`/api/click`) para contar las visitas, pero falló debido a la complejidad de los permisos. **La solución actual y más robusta es manejar el conteo de visitas directamente en el cliente (`src/app/link/[shortId]/ClientComponent.tsx`)**, lo cual es más simple y fiable para este caso de uso. **No reintroducir un endpoint de API para esto sin una razón de peso.**
*   **Sincronización y Lógica Financiera**:
    *   **Cálculo de Ganancias y Balance**: El hook `useUser.ts` es la **única fuente de la verdad** para el estado financiero del usuario. Las `generatedEarnings` de un usuario se calculan dinámicamente sumando las ganancias de todos sus enlaces individuales, asegurando consistencia. El `availableBalance` final considera los pagos ya completados y los que están pendientes.
    *   **Lógica de Pagos**: Cuando un administrador aprueba un pago, el monto se suma al campo `paidEarnings` del usuario.
    *   **Añadir Saldo Manualmente**: Cuando un administrador añade saldo, se trata como un "pago negativo" y se resta del campo `paidEarnings`, lo que aumenta correctamente el balance disponible.

---

## 2. Tecnologías Principales

-   **Framework**: [Next.js](https://nextjs.org/) (con App Router)
-   **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
-   **UI**: [React](https://react.dev/)
-   **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
-   **Componentes UI**: [ShadCN/UI](https://ui.shadcn.com/)
-   **Backend y Base de Datos**: [Firebase](https://firebase.google.com/) (Firestore, Authentication, Storage)
-   **Inteligencia Artificial**: [Genkit](https://firebase.google.com/docs/genkit)
-   **Validación de Formularios**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

---

## 3. Estructura del Proyecto

A continuación se detalla la estructura del proyecto, explicando el propósito de cada carpeta y archivo relevante.

### 3.1. Directorio Raíz

-   `AGENTS.md`: **Lectura obligatoria.** Documentación sobre la arquitectura de IA y las directrices críticas para la colaboración y los cambios en el proyecto.
-   `README.md`: Este archivo. La documentación principal del proyecto.
-   `apphosting.yaml`: Configuración para el despliegue en Firebase App Hosting.
-   `components.json`: Configuración de ShadCN/UI.
-   `firebase.json`: Configuración de los servicios de Firebase, como las reglas de Firestore.
-   `next.config.ts`: Archivo de configuración de Next.js.
-   `package.json`: Scripts y dependencias de Node.js.
-   `tailwind.config.ts`: Configuración de Tailwind CSS.
-   `tsconfig.json`: Configuración del compilador de TypeScript.

### 3.2. `src/` - Código Fuente Principal

#### `src/app/` - Enrutamiento y Páginas (App Router)

-   `globals.css`: Estilos globales y variables de tema de ShadCN/UI.
-   `layout.tsx`: Layout raíz de la aplicación.
-   `page.tsx`: Página de inicio y autenticación (formularios de login/registro).

##### `src/app/admin/` - Panel de Administración

Panel protegido accesible solo para usuarios con el rol `admin`.

-   `layout.tsx`: Protege las rutas y renderiza la navegación principal del panel de admin.
-   `page.tsx`: **Dashboard Principal**. Muestra tarjetas con estadísticas clave: usuarios totales, clics totales, ingresos y un feed de los últimos pagos procesados.
-   `cpm-history/page.tsx`: Muestra una tabla con el historial de todas las tasas de "Costo Por Mil" (CPM) y los ingresos generados durante cada período de tasa.
-   `history/page.tsx`: **Feed de Actividad del Sistema**. Un registro cronológico de eventos importantes como nuevos registros de usuarios o solicitudes de pago.
-   `links/page.tsx`: Tabla para gestionar **todos los enlaces** del sistema. Permite a los administradores ver, eliminar y navegar a las estadísticas de cualquier enlace.
-   `links/[linkId]/page.tsx`: Página de estadísticas detalladas para un enlace específico, desde la perspectiva del administrador.
-   `payout-requests/page.tsx`: Tabla para gestionar las solicitudes de pago de los usuarios. Permite a los administradores **aprobar** o **rechazar** solicitudes.
-   `security/page.tsx`: Página para configurar ajustes de seguridad y anti-fraude.
-   `settings/page.tsx`: Página para configurar ajustes globales del sistema.
-   `users/page.tsx`: Tabla para gestionar a **todos los usuarios**. Muestra sus estadísticas y permite realizar acciones como añadir saldo a un usuario manualmente.

##### `src/app/dashboard/` - Panel de Usuario

Panel para usuarios autenticados.

-   `layout.tsx`: Protege las rutas y renderiza la navegación principal del panel de usuario.
-   `page.tsx`: **Mis Enlaces**. Dashboard principal del usuario. Muestra una tabla con todos los enlaces creados por el usuario, con opciones para editar, eliminar, copiar y ver estadísticas.
-   `analytics/page.tsx`: Página de analíticas. Muestra los ingresos totales, clics totales y un gráfico de ganancias mensuales.
-   `create/page.tsx`: Formulario para **crear un nuevo enlace acortado**, incluyendo el editor de reglas de monetización.
-   `links/[linkId]/page.tsx`: Página de estadísticas detalladas para un enlace específico del usuario.
-   `notifications/page.tsx`: Lista de notificaciones del usuario (pagos, hitos, etc.).
-   `payouts/page.tsx`: Gestión de pagos del usuario. Muestra su balance y un historial de solicitudes. Incluye un formulario para solicitar un nuevo pago.
-   `profile/page.tsx`: Permite al usuario actualizar su nombre de usuario.

##### `src/app/link/[shortId]/` - Redirección de Enlaces (Público)

-   `page.tsx`: Componente de servidor que captura el `shortId` de la URL.
-   `ClientComponent.tsx`: **Componente Crítico**. Contiene toda la lógica para procesar una visita. Determina si mostrar la `LinkGate`, y **es responsable de registrar la visita en la base de datos** antes de redirigir al usuario.

---

#### `src/ai/` - Lógica de Inteligencia Artificial

-   `genkit.ts`: Configuración central de Genkit.
-   `dev.ts`: Punto de entrada para el servidor de desarrollo de Genkit.

#### `src/components/` - Componentes de React

-   `admin-nav.tsx` / `dashboard-nav.tsx`: Componentes de navegación lateral.
-   `link-gate.tsx`: **Componente Crítico**. La interfaz que se muestra al visitar un enlace monetizado. Gestiona los temporizadores y el contador final. **Importante**: Los botones de las reglas ahora detectan la plataforma (YouTube, Facebook, etc.) y aplican un color e icono distintivos para mejorar la UX.
-   `rule-editor.tsx`: Editor interactivo para añadir/eliminar reglas de monetización.
-   `user-nav.tsx`: El menú desplegable del avatar de usuario.
-   `ui/`: Todos los componentes base de ShadCN/UI.

#### `src/hooks/` - Hooks de React Personalizados

-   `use-toast.ts`: Hook para mostrar notificaciones.
-   `use-user.ts`: **Hook Fundamental**. Gestiona el estado del usuario autenticado y su perfil de Firestore. **Importante:** Centraliza toda la lógica de cálculo de balance (disponible, pendiente, pagado) para garantizar la consistencia en toda la aplicación.

#### `src/lib/` - Utilidades y Librerías

-   `firebase.ts`: Configuración e inicialización de Firebase.
-   `utils.ts`: Función de utilidad `cn` para clases de Tailwind.

#### `src/types.ts`

-   Define interfaces de TypeScript como `LinkData`.

---

## 4. Funcionalidades Clave y Técnicas

### 4.1. Proceso de Acortamiento de Enlaces

El proceso está diseñado para ser rápido y se gestiona desde el cliente.

1.  **Creación (`src/app/dashboard/create/page.tsx`):**
    *   El usuario rellena el formulario (título, URL destino, reglas).
    *   **Técnica de ID Corto**: Al enviar, se genera un `shortId` simple y aleatorio usando `Math.random().toString(36).substring(2, 8)`. Es suficientemente único para este caso de uso y evita una llamada de red para generarlo.
    *   **Escritura en Firestore**: Se crea un nuevo documento en la colección `links` con todos los datos, incluyendo el `userId` y un `serverTimestamp()`.

### 4.2. Flujo de Visita y Monetización (**El Proceso Más Crítico**)

Este flujo se gestiona **enteramente en el lado del cliente** para simplificar la lógica de permisos y mejorar la fiabilidad, eliminando la necesidad de un endpoint de API de backend.

1.  **Acceso (`src/app/link/[shortId]/page.tsx`):** Un visitante accede a una URL corta.
2.  **Lógica del Cliente (`ClientComponent.tsx`):**
    *   Se extrae el `shortId` y se consulta Firestore para encontrar el enlace.
    *   **Decisión**:
        *   **Sin Reglas**: Se llama directamente a `handleAllStepsCompleted`.
        *   **Con Reglas**: Se muestra el componente `LinkGate`, pasándole los datos del enlace y la función `handleAllStepsCompleted` como un callback que se ejecutará al final.
3.  **Puerta de Monetización (`LinkGate.tsx`):**
    *   El usuario ve las tareas. Al hacer clic, se abre una nueva pestaña y se inicia un temporizador de 10 segundos para esa tarea.
    *   Una vez completadas todas las tareas, se activa el botón "Unlock Link".
    *   Al hacer clic, se inicia un contador final de 5 segundos.
4.  **Registro y Redirección (en `handleAllStepsCompleted` dentro de `ClientComponent.tsx`):**
    *   **Este es el momento del conteo.** Cuando el usuario finalmente hace clic en "Continue", se ejecuta esta función.
    *   **Técnica de Escritura Atómica**: Se utiliza un `writeBatch` de Firestore para realizar varias operaciones como una sola transacción:
        1.  Incrementa el campo `clicks` en el documento del enlace.
        2.  Crea un nuevo documento en la colección `clicks` con detalles de la visita.
        3.  Si el enlace es monetizable, consulta la tasa de CPM activa y actualiza el campo `generatedEarnings` en el documento del enlace.
    *   Una vez que `batch.commit()` se resuelve, y solo entonces, el usuario es redirigido a la URL original usando `window.location.href`. Esto garantiza que la visita se cuente antes de que el usuario abandone la página.

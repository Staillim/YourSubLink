# YourSubLink - Documentación del Proyecto

Bienvenido a YourSubLink, una completa aplicación de acortamiento y monetización de enlaces construida con tecnologías web modernas.

## 1. Tecnologías Principales

-   **Framework**: [Next.js](https://nextjs.org/) (con App Router)
-   **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
-   **UI**: [React](https://react.dev/)
-   **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
-   **Componentes UI**: [ShadCN/UI](https://ui.shadcn.com/)
-   **Backend y Base de Datos**: [Firebase](https://firebase.google.com/) (Firestore, Authentication, Storage)
-   **Inteligencia Artificial**: [Genkit](https://firebase.google.com/docs/genkit)
-   **Validación de Formularios**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

---

## 2. Estructura del Proyecto

A continuación se detalla la estructura del proyecto, explicando el propósito de cada carpeta y archivo relevante.

### 2.1. Directorio Raíz

-   `AGENTS.md`: **Lectura obligatoria.** Documentación sobre la arquitectura de Inteligencia Artificial y las directrices críticas para la colaboración y los cambios en el proyecto.
-   `README.md`: Este archivo, con la documentación principal del proyecto.
-   `apphosting.yaml`: Configuración para el despliegue en Firebase App Hosting. Define parámetros como el número máximo de instancias.
-   `components.json`: Archivo de configuración de ShadCN/UI, que define la ubicación de los componentes, el tema de estilos y los alias de importación.
-   `firebase.json`: Configuración de los servicios de Firebase, como las reglas de seguridad de Firestore y la configuración de Hosting.
-   `next.config.ts`: Archivo de configuración de Next.js. Define el modo de salida (`standalone`), la configuración de TypeScript/ESLint y los dominios remotos para la optimización de imágenes (`next/image`).
-   `package.json`: Define los scripts del proyecto (`dev`, `build`, etc.) y gestiona todas las dependencias de Node.js (producción y desarrollo).
-   `tailwind.config.ts`: Archivo de configuración de Tailwind CSS. Aquí se personaliza el tema (colores, fuentes, etc.) y se extienden las utilidades de CSS.
-   `tsconfig.json`: Configuración del compilador de TypeScript. Define las reglas de compilación, las rutas de importación (`@/*`) y las opciones de chequeo de tipos.

### 2.2. `src/` - Código Fuente Principal

#### `src/app/` - Enrutamiento y Páginas (App Router)

Este directorio contiene todas las rutas y páginas de la aplicación, siguiendo la convención de enrutamiento basada en carpetas de Next.js.

-   `globals.css`: Archivo CSS global. Aquí se definen las variables de tema de ShadCN/UI (colores primarios, de fondo, etc.) y se aplican los estilos base de Tailwind.
-   `layout.tsx`: El layout raíz de la aplicación. Envuelve todas las páginas, define la estructura HTML principal (`<html>`, `<body>`), importa fuentes y renderiza el componente `Toaster` para notificaciones.
-   `page.tsx`: La página de inicio y autenticación. Contiene los formularios de inicio de sesión, registro y restablecimiento de contraseña, así como la lógica para la autenticación con Google.

##### `src/app/admin/` - Panel de Administración

Rutas y vistas accesibles solo para usuarios con el rol de 'admin'.

-   `layout.tsx`: Layout específico para el panel de administración. Protege las rutas, asegurando que solo los administradores puedan acceder. Renderiza la navegación lateral (`AdminNav`) y la cabecera con la campana de notificaciones y el menú de usuario.
-   `page.tsx`: Dashboard principal del administrador. Muestra estadísticas clave como el número total de usuarios, clics, ingresos y los pagos recientes.
-   `cpm-history/page.tsx`: Muestra un historial de todas las tasas de CPM (Costo Por Mil) que se han establecido en el sistema y los ingresos generados durante cada período.
-   `history/page.tsx`: Feed de actividad del sistema. Registra cronológicamente todos los eventos importantes, como registros de usuarios y solicitudes de pago.
-   `links/page.tsx`: Tabla para gestionar todos los enlaces creados en el sistema. Permite a los administradores ver, eliminar y navegar a las estadísticas de cualquier enlace.
-   `links/[linkId]/page.tsx`: Página de estadísticas detalladas para un enlace específico, vista desde la perspectiva del administrador. Muestra gráficos de clics diarios y mensuales.
-   `payout-requests/page.tsx`: Gestiona las solicitudes de pago de los usuarios. Los administradores pueden aprobar o rechazar solicitudes desde esta tabla.
-   `security/page.tsx`: Página para configurar los ajustes de seguridad y anti-fraude.
-   `settings/page.tsx`: Página para configurar los ajustes globales del sistema.
-   `users/page.tsx`: Tabla de gestión de usuarios. Permite a los administradores ver a todos los usuarios, sus estadísticas (enlaces, ganancias) y realizar acciones como añadir saldo manualmente.

##### `src/app/dashboard/` - Panel de Usuario

Rutas y vistas para usuarios autenticados.

-   `layout.tsx`: Layout específico para el panel de usuario. Protege las rutas para que solo usuarios autenticados puedan acceder. Renderiza la navegación lateral (`DashboardNav`) y la cabecera.
-   `page.tsx`: Dashboard principal del usuario. Muestra una tabla con todos los enlaces creados por el usuario, con opciones para editar, eliminar, copiar y ver estadísticas.
-   `analytics/page.tsx`: Página de analíticas para el usuario. Muestra sus ingresos totales, clics totales y un gráfico de ganancias mensuales.
-   `create/page.tsx`: Formulario para crear un nuevo enlace acortado. Incluye campos para el título, la URL de destino y un editor de reglas de monetización.
-   `links/[linkId]/page.tsx`: Página de estadísticas detalladas para un enlace específico del usuario.
-   `notifications/page.tsx`: Muestra una lista de todas las notificaciones del usuario (pagos, hitos, etc.).
-   `payouts/page.tsx`: Página de gestión de pagos del usuario. Muestra su balance disponible y un historial de sus solicitudes de pago. Incluye un formulario para solicitar un nuevo pago.
-   `profile/page.tsx`: Permite al usuario actualizar la información de su perfil, como su nombre de usuario.

##### `src/app/link/[shortId]/` - Redirección de Enlaces

Esta es la ruta pública que gestiona las visitas a los enlaces acortados.

-   `page.tsx`: Componente de servidor que captura el `shortId` de la URL.
-   `ClientComponent.tsx`: **Componente Crítico**. Contiene toda la lógica para procesar una visita. Determina si el enlace tiene reglas, muestra la `LinkGate` (puerta de monetización) si es necesario, y **es responsable de registrar la visita en la base de datos** antes de redirigir al usuario al destino final.

---

#### `src/ai/` - Lógica de Inteligencia Artificial

-   `genkit.ts`: Configuración central de Genkit. Inicializa el framework y los plugins.
-   `dev.ts`: Punto de entrada para el servidor de desarrollo de Genkit.

#### `src/components/` - Componentes de React

Componentes reutilizables que construyen la interfaz de la aplicación.

-   `admin-nav.tsx`: La barra de navegación lateral para el panel de administración.
-   `admin-notification-bell.tsx`: La campana de notificaciones en la cabecera del panel de admin, que muestra alertas en tiempo real.
-   `dashboard-nav.tsx`: La barra de navegación lateral para el panel de usuario.
-   `icons.tsx`: Componentes SVG personalizados, como el logo de la aplicación.
-   `link-gate.tsx`: La interfaz de la puerta de monetización. Muestra al usuario las reglas que debe completar. **Importante**: Los botones de las reglas ahora detectan la plataforma (YouTube, Facebook, etc.) y aplican un color e icono distintivos para mejorar la UX.
-   `notification-bell.tsx`: La campana de notificaciones para el panel de usuario.
-   `rule-editor.tsx`: Un componente interactivo para añadir, editar y eliminar las reglas de monetización de un enlace.
-   `user-nav.tsx`: El menú desplegable del avatar de usuario, que se muestra en la cabecera y contiene el balance y los enlaces al perfil y cierre de sesión.
-   `ui/`: Directorio que contiene todos los componentes base de ShadCN/UI (Botones, Tarjetas, Formularios, etc.), que son los bloques de construcción de la interfaz.

#### `src/hooks/` - Hooks de React Personalizados

-   `use-toast.ts`: Hook para gestionar y mostrar notificaciones (toasts).
-   `use-user.ts`: **Hook Fundamental**. Gestiona el estado del usuario autenticado y su perfil de Firestore. Centraliza toda la lógica de cálculo de balance (disponible, pendiente, pagado) para garantizar la consistencia en toda la aplicación.

#### `src/lib/` - Utilidades y Librerías

-   `firebase.ts`: Archivo central para la configuración e inicialización de Firebase. Exporta las instancias de `auth`, `db` (Firestore) y `storage`, así como funciones de utilidad como `createUserProfile`.
-   `utils.ts`: Contiene la función de utilidad `cn` de ShadCN, que fusiona clases de Tailwind CSS de manera inteligente.

#### `src/types.ts`

Define las interfaces de TypeScript personalizadas utilizadas en la aplicación, como `LinkData`.

---

## 3. Nuevas Implementaciones y Mejoras (Últimas Actualizaciones)

### 3.1. Sistema de Análisis de Seguridad con IA (NUEVO)

Se ha implementado un **agente de seguridad con IA** para detectar actividad fraudulenta en los enlaces:

- **Archivo**: `src/ai/flows/analyzeLinkSecurity.ts`
- **Funcionalidad**: Utiliza Genkit y modelos de IA para analizar patrones de clics sospechosos
- **Detecta**: Clics robotizados, intervalos uniformes, ráfagas de actividad anormales
- **Integración**: Los administradores pueden ejecutar análisis desde el panel de enlaces (`src/app/admin/links/page.tsx`)
- **Acción automática**: Si el riesgo es "alto", suspende automáticamente la monetización del enlace

### 3.2. Sistema de CPM Personalizado (NUEVO)

Implementado un sistema que permite **CPM individual por usuario**:

- **Funcionalidad**: Los administradores pueden asignar una tasa CPM específica a usuarios particulares
- **Prioridad**: CPM personalizado > CPM global
- **Gestión**: Panel de administración de usuarios con diálogo dedicado
- **Notificaciones**: Los usuarios reciben notificaciones cuando se les asigna o remueve un CPM personalizado
- **Implementación**: `src/app/admin/users/page.tsx` y lógica en `src/hooks/use-user.ts`

### 3.3. Sistema de Reglas Globales (NUEVO)

Se añadió la capacidad de crear **reglas que se aplican a todos los enlaces**:

- **Ubicación**: Panel de configuración del administrador (`src/app/admin/settings/page.tsx`)
- **Funcionalidad**: Reglas que se combinan automáticamente con las reglas específicas de cada enlace
- **Estados**: Activo/Inactivo para cada regla global
- **Implementación**: Se consultan y fusionan en `ClientComponent.tsx` durante el proceso de visita

### 3.4. Mejoras en el Sistema de Suspensiones

**Suspensión de usuarios y enlaces mejorada**:

- **Suspensión de usuarios**: Campo `accountStatus` en perfil de usuario
- **Suspensión de enlaces**: Campo `monetizationStatus` en cada enlace
- **Comportamiento**: Enlaces/usuarios suspendidos redirigen sin contar clics ni generar ganancias
- **Integración**: Verificación automática en `ClientComponent.tsx` antes del procesamiento

### 3.5. Optimizaciones en el Conteo de Clics

**Mejoras significativas en la lógica de conteo**:

- **Validación temporal**: Detecta clics completados muy rápido (< 10 segundos) y los rechaza
- **Procesamiento atómico**: Uso de `writeBatch` para garantizar consistencia
- **CPM dinámico**: Soporte para CPM personalizado por usuario con fallback al global
- **Logging mejorado**: Registros más detallados con información de CPM usado y ganancias generadas

---

## 4. Funcionalidades Clave y Técnicas

### 3.1. Proceso de Acortamiento de Enlaces

El acortamiento se gestiona desde el cliente para una experiencia de usuario rápida.

1.  **Creación (`src/app/dashboard/create/page.tsx`):**
    *   El usuario rellena un formulario con el título, la URL de destino y las reglas de monetización.
    *   **Generación del `shortId`**: Al enviar, se genera un ID corto y aleatorio usando `Math.random().toString(36).substring(2, 8)`. Esta técnica es simple y suficientemente única para este caso de uso.
    *   **Escritura en Firestore**: Se crea un nuevo documento en la colección `links` con todos los datos, incluido el `userId` del usuario actual y un `createdAt` con `serverTimestamp()`.

### 3.2. Flujo de Visita y Monetización (**El Proceso Más Crítico**)

Esta funcionalidad se gestiona **enteramente en el lado del cliente** para mayor simplicidad y fiabilidad, habiendo descartado un enfoque de API de backend por su complejidad con los permisos de Firebase.

1.  **Acceso (`src/app/link/[shortId]/page.tsx`):** Un visitante accede a una URL como `https://yoursub.link/xyz123`.
2.  **Lógica del Cliente (`ClientComponent.tsx`):**
    *   El componente extrae el `shortId` ("xyz123") de la URL.
    *   Consulta Firestore para encontrar el documento del enlace correspondiente.
    *   **Decisión**:
        *   **Si no hay reglas de monetización**: Llama directamente a `handleAllStepsCompleted`.
        *   **Si hay reglas**: Muestra el componente `LinkGate`, pasándole los datos del enlace y la función `handleAllStepsCompleted` como un callback.
3.  **Puerta de Monetización (`LinkGate.tsx`):**
    *   El usuario ve una lista de tareas (visitar, seguir, etc.).
    *   Al hacer clic en cada tarea, se abre la URL en una nueva pestaña y un temporizador de 10 segundos se activa para esa tarea.
    *   Una vez que todas las tareas se completan, el botón "Unlock Link" se activa.
    *   Al hacer clic, se inicia un contador de 5 segundos.
    *   Al finalizar el contador, el botón "Continue" se activa.
4.  **Registro y Redirección (en `handleAllStepsCompleted`):**
    *   **Este es el momento crítico**. Cuando el usuario hace clic en "Continue", se ejecuta el callback.
    *   Se utiliza un `writeBatch` de Firestore para realizar varias operaciones de forma atómica:
        1.  Incrementa el campo `clicks` en el documento del enlace.
        2.  Crea un nuevo documento en la colección `clicks` con detalles de la visita (sin IP por ser desde cliente).
        3.  Si el enlace es monetizable, consulta la tasa de CPM activa y actualiza el campo `generatedEarnings` en el documento del enlace.
    *   Una vez que el `batch.commit()` se resuelve, el usuario es redirigido a la URL original usando `window.location.href`.

### 3.3. Gestión de Datos en Tiempo Real y Lógica Financiera

*   **Sincronización de Datos**: La aplicación utiliza `onSnapshot` de Firestore extensivamente para una experiencia de usuario reactiva en todos los paneles.
*   **Cálculo de Balance**: El hook `useUser.ts` es la **única fuente de la verdad** para el balance del usuario. Calcula el balance disponible (`availableBalance`) restando los pagos completados (`paidEarnings`) y los pagos pendientes (`payoutsPending`) de las ganancias generadas totales (que se calculan sumando las ganancias de todos los enlaces del usuario). Esto asegura consistencia en toda la app.
*   **Adición de Balance Manual**: Cuando un administrador añade balance manualmente, se trata como un "pago negativo". En lugar de modificar las ganancias generadas, se decrementa el campo `paidEarnings` del usuario. Esto aumenta correctamente el balance disponible (`Generated - Paid`).

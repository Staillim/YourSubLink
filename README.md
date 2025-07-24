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

-   `AGENTS.md`: Documentación sobre la arquitectura de Inteligencia Artificial del proyecto utilizando Genkit.
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

-   `page.tsx`: Componente de servidor que captura el `shortId` de la URL.
-   `ClientComponent.tsx`: Componente de cliente que contiene toda la lógica para procesar una visita a un enlace. Determina si el enlace tiene reglas, muestra la `LinkGate` (puerta de monetización) si es necesario, y registra la visita en la base de datos antes de redirigir al usuario al destino final.

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
-   `link-gate.tsx`: La interfaz de la puerta de monetización. Muestra al usuario las reglas que debe completar (visitar, seguir, etc.) y el temporizador de espera.
-   `notification-bell.tsx`: La campana de notificaciones para el panel de usuario.
-   `rule-editor.tsx`: Un componente interactivo para añadir, editar y eliminar las reglas de monetización de un enlace.
-   `user-nav.tsx`: El menú desplegable del avatar de usuario, que se muestra en la cabecera y contiene el balance y los enlaces al perfil y cierre de sesión.
-   `ui/`: Directorio que contiene todos los componentes base de ShadCN/UI (Botones, Tarjetas, Formularios, etc.), que son los bloques de construcción de la interfaz.

#### `src/hooks/` - Hooks de React Personalizados

Lógica reutilizable y encapsulada.

-   `use-toast.ts`: Hook para gestionar y mostrar notificaciones (toasts).
-   `use-user.ts`: Hook fundamental que gestiona el estado del usuario autenticado y su perfil de Firestore en toda la aplicación. Proporciona los datos del usuario y su estado de carga.

#### `src/lib/` - Utilidades y Librerías

-   `firebase.ts`: Archivo central para la configuración e inicialización de Firebase. Exporta las instancias de `auth`, `db` (Firestore) y `storage`, así como funciones de utilidad como `createUserProfile`.
-   `utils.ts`: Contiene la función de utilidad `cn` de ShadCN, que fusiona clases de Tailwind CSS de manera inteligente.

#### `src/pages/api/`

Este directorio está vacío intencionadamente, ya que la lógica de conteo de clics se ha movido al frontend (`ClientComponent.tsx`) para simplificar el proceso y evitar problemas de permisos.

#### `src/types.ts`

Define las interfaces de TypeScript personalizadas utilizadas en la aplicación, como `LinkData`.

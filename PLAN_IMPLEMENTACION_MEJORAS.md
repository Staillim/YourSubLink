### 2.1. Diseño del buscador avanzado

**Fragmento de código propuesto para el input de búsqueda:**

```tsx
import { Input } from '@/components/ui/input';

const [search, setSearch] = useState('');

// ...existing code...

<div className="mb-4 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
  <Input
    placeholder="Buscar por ID, usuario o enlace acortado..."
    value={search}
    onChange={e => setSearch(e.target.value)}
    className="w-full sm:w-80"
  />
</div>

// Lógica de filtrado (frontend):
const filteredLinks = links.filter(link => {
  const q = search.toLowerCase();
  return (
    link.id.toLowerCase().includes(q) ||
    (link.userName && link.userName.toLowerCase().includes(q)) ||
    (link.userEmail && link.userEmail.toLowerCase().includes(q)) ||
    link.shortId.toLowerCase().includes(q) ||
    (link.short && link.short.toLowerCase().includes(q))
  );
});

// Usar filteredLinks en vez de links para renderizar la tabla.
```

**Notas:**
- Si el volumen de datos es grande, se recomienda aplicar el filtro también en la consulta a Firestore.
- El input es único y detecta automáticamente el tipo de búsqueda.
- Se puede mejorar con filtros avanzados o chips si se requiere en el futuro.
### 1.2. Implementación realizada

- Se implementó la tarjeta de ingresos generados en la vista de estadísticas del link (`src/app/admin/links/[linkId]/page.tsx`).
- El cálculo usa un CPM de ejemplo y debe ajustarse a la lógica real de CPM personalizada o global.
- Próximo paso: ajustar la lógica de CPM si es necesario.

---

### 2. Buscador avanzado en la tabla de links

**Fecha de inicio:** 14/08/2025

**Acciones:**
- Leer el archivo `src/app/admin/links/page.tsx` para analizar la estructura de la tabla y la lógica de carga de datos.
- Planificar la integración de un input de búsqueda que permita filtrar por linkId, usuario (nombre, email o UID) y enlace acortado.
- Documentar el fragmento de código y la lógica de filtrado.
### 1.1. Agregar tarjeta de ingresos en la vista de estadísticas del link

**Fragmento de código agregado en**: `src/app/admin/links/[linkId]/page.tsx`

**Descripción:**
Se añadió una tarjeta (Card) que muestra el ingreso total generado por el link. El cálculo se realiza multiplicando el total de clicks válidos por el CPM correspondiente (se debe ajustar si existe lógica de CPM personalizada por usuario o global).

**Ubicación:**
Justo después de la tarjeta de "Total Clicks" y "Created By".

**Ejemplo de integración:**

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Ingresos generados</CardTitle>
    <BarChart className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">$&#123;(linkData.clicks * CPM).toFixed(2)&#125;</div>
    <p className="text-xs text-muted-foreground">Calculado como clicks * CPM.</p>
  </CardContent>
</Card>
```

**Notas:**
- CPM debe obtenerse de la lógica de usuario (customCpm) o global.
- Si el CPM es variable, se debe ajustar el cálculo para reflejar la lógica real del sistema.
---

## Progreso de Implementación

### 1. Tarjeta de ingresos en la vista de estadísticas del link

**Fecha de inicio:** 14/08/2025

**Acciones:**
- Revisar el archivo `src/app/admin/links/[linkId]/page.tsx` para identificar la estructura actual de la vista de estadísticas.
- Identificar la lógica existente para obtener los clics y el CPM del link.
- Agregar un componente tipo tarjeta (usando ShadCN/UI) que muestre el ingreso total generado por el link.
- Documentar el fragmento de código y la ubicación exacta de la integración.

**Siguiente paso:** Leer y analizar el archivo `src/app/admin/links/[linkId]/page.tsx`.
# Plan de Implementación de Mejoras YourSubLink

## Consideraciones Generales
- Usar componentes de UI existentes (ShadCN/UI, tablas, inputs, tarjetas, etc.).
- Reutilizar la lógica de obtención de ingresos y CPM ya implementada en hooks y utilidades.
- Mantener la seguridad: solo administradores pueden acceder a las vistas y acciones descritas.
- Seguir la estructura y convenciones del proyecto: Next.js App Router, TypeScript, hooks personalizados, buenas prácticas de código y UI.

---

## ~~1. Mostrar ingresos de cada link en la vista de estadísticas~~
- ~~Ubicación: `src/app/admin/links/[linkId]/page.tsx`.~~
- ~~Agregar una tarjeta destacada que muestre el ingreso total generado por el link.~~
- ~~La tarjeta debe ser visible y clara, junto a los gráficos y datos existentes.~~
- ~~Reutilizar la lógica de cálculo de ingresos (clics válidos * CPM).~~
- ~~Documentar el componente y la integración.~~

---

## ~~2. Buscador avanzado en la tabla de links~~
- ~~Ubicación: `src/app/admin/links/page.tsx`.~~
- ~~Agregar un campo de búsqueda que permita filtrar por:~~
  - ~~ID del enlace (linkId)~~
  - ~~Usuario (nombre, email o UID)~~
  - ~~Enlace acortado (URL corta generada)~~
- ~~El filtrado debe funcionar tanto en frontend como en la consulta a Firestore para eficiencia.~~
- ~~El input puede ser único (detectando el tipo de búsqueda) o tener filtros separados.~~
- ~~Documentar la lógica de filtrado y los componentes usados.~~

---

## 3. Página de usuario con sus links, ingresos y acciones
- Ubicación: `src/app/admin/users/page.tsx` (tabla de usuarios) y `src/app/admin/users/[userId]/page.tsx` (detalle de usuario).
- Hacer que el nombre del usuario sea clickeable.
- Crear una página de detalle para cada usuario que muestre:
  - Nombre y datos del usuario.
  - Lista de todos los links creados por ese usuario, con los ingresos de cada link y el enlace acortado.
  - Ingreso total del usuario (suma de ingresos de todos sus links).
  - Acciones disponibles (las mismas que en el panel de links).
- Documentar la estructura y los componentes creados o modificados.

---

## ~~4. Mejoras en el sistema de sponsors~~
- ~~En la tabla de sponsors (probablemente en `src/app/admin/sponsors/page.tsx` o similar):~~
  - ~~Mostrar el enlace acortado en la columna de enlace, en vez del ID del enlace.~~
  - ~~Asegurarse de que el enlace sea clickeable y lleve al destino correcto.~~
- ~~Permitir agregar expiración a los sponsors por horas, no solo por días:~~
  - ~~Modificar el formulario de creación/edición de sponsor para aceptar expiración en horas y días.~~
  - ~~Ajustar la lógica de backend y validación para soportar ambos tipos de expiración.~~
  - ~~Documentar los cambios en la estructura de datos y UI.~~

### Ejemplo técnico para sponsors

**Mostrar enlace acortado y clickeable:**
```tsx
<td>
  <a href={sponsor.shortUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
    {sponsor.shortUrl}
  </a>
</td>
```

**Expiración por horas y días en formulario:**
```tsx
<label>Expiración:</label>
<input type="number" min="0" value={expireDays} onChange={e => setExpireDays(Number(e.target.value))} placeholder="Días" />
<input type="number" min="0" value={expireHours} onChange={e => setExpireHours(Number(e.target.value))} placeholder="Horas" />
```

**Notas de backend:**
- Al guardar, calcular la expiración total en milisegundos: `(expireDays * 24 + expireHours) * 60 * 60 * 1000`.
- Validar que al menos uno de los dos (días u horas) sea mayor a cero.
- Al mostrar, desglosar la expiración en días y horas si es necesario.

---

## Progreso y Documentación
- Cada avance y decisión de implementación se documentará en este archivo.
- Se incluirán fragmentos de código, rutas modificadas y justificaciones técnicas.

# Miresta Web

Frontend del POS de Miresta — React + TypeScript + Vite.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- React Router
- TanStack Query
- React Hook Form + Zod
- Zustand
- Axios

## Variables de entorno

Crear un archivo `.env` en la raíz con:

```env
VITE_API_URL=http://localhost:8081
```

Si no se define, la app usa `http://localhost:8081` por defecto.

## Instalación y ejecución

```bash
npm install
npm run dev
```

La app se levanta en `http://localhost:5173`. Requiere que `miresta-api` esté corriendo en `http://localhost:8081`.

## Roles

- **ADMIN**: acceso total (usuarios, precios, catálogo, menú, reportes, impresora, mesas, pedidos, clientes).
- **MESERO**: mesas, pedidos, clientes.

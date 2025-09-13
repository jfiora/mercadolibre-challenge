# Documentación MVP - Sistema de Inventario y Reservas

## Diseño de la API

El sistema se compone de dos servicios principales:

-   **Central Inventory Service**: Responsable de gestionar el inventario y las reservas de manera centralizada.
-   **Store Edge Service**: Funciona como un gateway para las tiendas, comunicándose con el servicio central para exponer endpoints seguros y simplificados.

## Endpoints Principales

### Central Inventory Service

-   `GET /health` → Health check del servicio.
-   `GET /inventory` → Listado completo de inventario.
-   `GET /inventory/:sku` → Consultar stock de un SKU específico.
-   `PUT /inventory/:sku` → Actualizar stock de un SKU.
-   `GET /reservations` → Listar reservas.
-   `POST /reservations` → Crear una nueva reserva (con validación de stock).
-   `GET /metrics` → Métricas básicas de inventario y reservas.

### Store Edge Service

-   `GET /health` → Health check, incluyendo disponibilidad del central.
-   `GET /inventory` → Proxy al inventario central.
-   `GET /inventory/:sku` → Proxy a inventario por SKU.
-   `POST /reservations` → Proxy para crear reservas.
-   `GET /reservations` → Proxy para listar reservas.
-   `GET /metrics` → Proxy de métricas.

## Decisiones Clave de Arquitectura

1. **Separación de responsabilidades**

    - Central Inventory maneja la lógica de negocio.
    - Store Edge actúa como fachada para clientes y tiendas.

2. **Prisma ORM + SQLite in-memory**

    - Prisma facilita acceso a datos y migraciones.
    - SQLite permite rapidez para prototipado sin overhead de infra.

3. **Transacciones en reservas**

    - Uso de `prisma.$transaction` para garantizar atomicidad al reservar stock.

4. **Endpoints de métricas**

    - Se exponen métricas en formato Prometheus para monitoreo básico.

5. **Tests incluidos**
    - Unit tests para validar la lógica.
    - Load tests simulando concurrencia de multiples usuarios.

## Consideraciones de Seguridad

Este MVP no incluye autenticación ni autorización, ya que el foco está en la comunicación entre servicios y en el manejo de inventario y reservas.

En un entorno de producción sería recomendable:

-   Implementar **API keys o JWT** para proteger los endpoints.
-   Usar **HTTPS** para la comunicación entre servicios.
-   Agregar **rate limiting** en el Store Edge Service para evitar abusos.
-   Definir políticas de **CORS** según los clientes autorizados.

### Ejemplo opcional de seguridad (API Key mockeada)

```ts
// middleware/apiKeyAuth.ts
import { Request, Response, NextFunction } from 'express';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}
```

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
## Stack Tecnológico

Este stack fue elegido por su rapidez de desarrollo, bajo overhead y portabilidad, optimizando la validación del concepto antes de escalarlo.

### Prototipo (MVP)

- **TypeScript + Express.js**  
  Considero que Node con Express es liviano y suficiente, ademas de battle proof, para el desarrollo de las APIs para el prototipo y evita errores comunes. 
- **Prisma ORM + SQLite (in-memory)**  
  Prisma facilita las consultas y las transacciones de manera declarativa. SQLite permite levantar un entorno rápido y portable sin dependencias externas.  
- **Docker + Docker Compose**  
  Estandariza la ejecución de los servicios, facilita levantar múltiples contenedores (central y edge) y simular un entorno distribuido.  
- **k6**  
  Herramienta de pruebas de carga y concurrencia para validar el comportamiento del sistema bajo estrés.  
- **Jest**  
  Framework de testing unitario, asegura la lógica de negocio y previene regresiones.  

---

### Producción (Evolución esperada)

- **Java + Spring Boot**  
  Marco robusto para servicios distribuidos en entornos productivos. 
- **PostgreSQL**  
  Base de datos relacional confiable, con soporte avanzado para concurrencia, replicación y escalabilidad vertical/horizontal.  
- **Kafka o RabbitMQ**  
  Para manejar eventos de inventario en tiempo real y reducir la latencia entre tiendas y el sistema central.  
- **Kubernetes (K8s)**  
  Orquestación para desplegar, escalar y mantener la resiliencia de los microservicios.  
- **Prometheus + Grafana**  
  Monitoreo y visualización avanzada de métricas de reservas, stock y performance.  
- **Keycloak o Auth0**  
  Para manejar identidad, autenticación y autorización de forma centralizada.  


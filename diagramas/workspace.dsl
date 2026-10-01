workspace "Core Bancario - Módulo de Ahorro Programado" "Sistema para la gestión y ejecución de ahorro programado" {

    model {
        user = person "Cliente Bancario" "Usuario que gestiona sus planes de ahorro y realiza simulaciones."

        coreLegacy = softwareSystem "Core Bancario Legacy" "Sistema bancario central que maneja las cuentas asociadas y saldos primarios. Fuera de alcance: se simula con MongoDB (carpeta bdd/)." "Existente"
        notificationSystem = softwareSystem "Sistema de Notificaciones" "Servicio externo para envío de SMS y correos." "Existente"

        ahorroSystem = softwareSystem "Sistema de Ahorro Programado" "Permite crear, simular, debitar y consultar planes de ahorro." {
            webApp = container "Single Page Application (SPA)" "Interfaz gráfica para el cliente" "Next.js (React)" "Web Browser"
            apiGateway = container "API Gateway" "Punto de entrada único, TLS 1.3, validación de firma y expiración del JWT, Rate Limiting" "Kong Gateway"
            authService = container "Servicio de Autenticación" "Autentica al cliente y emite JWT firmados de corta duración + refresh token" "Spring Boot + JWT (RS256)"
            ahorroService = container "Ahorro Core API" "Planes, simulación pública, aportes y consultas; publica eventos vía tabla outbox" "Spring Boot REST API"
            batchEngine = container "Batch Processor" "Corte diario de débitos, reintentos de negocio y registro de resultados en el ledger. El SP de débitos solo selecciona los del día" "Spring Boot (CronJob + Worker)"
            database = container "PostgreSQL Database" "Planes, calendario de aportes, usuarios, ledger y outbox" "PostgreSQL 15" "Database"
            eventBroker = container "Message Broker" "Publicación/suscripción de eventos (EDA)" "RabbitMQ" "Queue"
            coreAdapter = container "Adaptador Core (Fachada)" "Puerto CoreBancarioPort; traduce REST/eventos a la interfaz del Core; Circuit Breaker, Timeout y Retry con jitter (solo asíncrono)" "Spring Boot + Resilience4j"
        }

        # Contexto
        user -> ahorroSystem "Consulta saldo, simula rendimientos y crea/cancela planes" "HTTPS"
        ahorroSystem -> coreLegacy "Valida cuentas origen y ejecuta débitos (vía adaptador)" "SOAP / REST"
        notificationSystem -> ahorroSystem "Consume eventos de débitos y planes" "AMQP"

        # Contenedores
        user -> webApp "Usa" "HTTPS"
        webApp -> apiGateway "Realiza peticiones REST con JWT" "HTTPS / TLS 1.3"
        apiGateway -> authService "Enruta /auth/login y /auth/refresh" "REST"
        authService -> database "Verifica credenciales (hash bcrypt)" "JDBC"
        apiGateway -> ahorroService "Enruta peticiones autenticadas" "REST"
        ahorroService -> database "Consulta vistas y opera tablas (ACID)" "JDBC"
        ahorroService -> coreAdapter "Valida titularidad/saldo de cuenta origen (timeout 2 s, sin reintentos)" "REST síncrono"
        ahorroService -> eventBroker "Publica 'PlanCreado' / 'PlanCancelado' y 'DebitoSolicitado' (aporte bajo solicitud) vía outbox" "AMQP"
        batchEngine -> database "Selecciona los débitos del día (SP) y registra resultados en el ledger" "JDBC"
        batchEngine -> eventBroker "Publica 'DebitoSolicitado' vía outbox y consume 'DebitoEjecutado' / 'DebitoFallido' de ambos tipos de débito" "AMQP"
        coreAdapter -> eventBroker "Consume 'DebitoSolicitado' y publica 'DebitoEjecutado' / 'DebitoFallido'" "AMQP"
        coreAdapter -> coreLegacy "Invoca la interfaz del Core (Retry → Circuit Breaker → Logging)" "SOAP / REST"
        notificationSystem -> eventBroker "Consume eventos y envía correos/SMS" "AMQP"
    }

    views {
        systemContext ahorroSystem "Contexto" {
            include *
        }

        container ahorroSystem "Contenedores" {
            include *
        }

        styles {
            element "Element" {
                color #ffffff
            }
            element "Person" {
                shape Person
                background #08427b
            }
            element "Software System" {
                background #1168bd
            }
            element "Container" {
                background #438dd5
            }
            element "Existente" {
                background #999999
            }
            element "Web Browser" {
                shape WebBrowser
            }
            element "Database" {
                shape Cylinder
            }
            element "Queue" {
                shape Pipe
            }
        }
    }
}

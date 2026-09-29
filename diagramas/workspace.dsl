workspace "Core Bancario - Módulo de Ahorro Programado" "Sistema para la gestión y ejecución de ahorro programado" {

    model {
        user = person "Cliente Bancario" "Usuario que gestiona sus planes de ahorro y realiza simulaciones."

        coreLegacy = softwareSystem "Core Bancario Legacy" "Sistema bancario central que maneja las cuentas asociadas y saldos primarios." "Existente"
        notificationSystem = softwareSystem "Sistema de Notificaciones" "Servicio externo para envío de SMS y correos." "Existente"

        ahorroSystem = softwareSystem "Sistema de Ahorro Programado" "Permite crear, simular, debitar y consultar planes de ahorro." {
            webApp = container "Single Page Application (SPA)" "Interfaz gráfica para el cliente" "Next.js (React)" "Web Browser"
            apiGateway = container "API Gateway" "Punto de entrada único, TLS 1.3, validación de firma y expiración del JWT, Rate Limiting" "Kong Gateway"
            authService = container "Servicio de Autenticación" "Autentica al cliente y emite JWT firmados de corta duración + refresh token" "Spring Boot + JWT (RS256)"
            ahorroService = container "Ahorro Core API" "CRUD de planes, simulación pública, vista de clientes" "Spring Boot REST API"
            batchEngine = container "Batch Processor" "Débitos automáticos diarios y reintentos; invoca sp_procesar_debitos_ahorro_programado()" "CronJob / Worker"
            database = container "PostgreSQL Database" "Tablas clientes, contactos, cuentas, cabecera, detalle, ledger" "PostgreSQL 15" "Database"
            eventBroker = container "Message Broker" "Publicación/suscripción de eventos (EDA)" "RabbitMQ" "Queue"
            coreAdapter = container "Adaptador Core (Fachada)" "Traduce REST/eventos a la interfaz del Core legacy; aplica Circuit Breaker y Retry" "Spring Boot + Resilience4j"
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
        ahorroService -> coreAdapter "Valida titularidad/saldo de cuenta origen" "REST síncrono"
        ahorroService -> eventBroker "Publica 'PlanCreado' / 'PlanCancelado' y 'DebitoSolicitado' (aporte bajo solicitud)" "AMQP"
        batchEngine -> database "Ejecuta el SP de débitos y registra resultados en el ledger" "JDBC"
        batchEngine -> eventBroker "Publica 'DebitoSolicitado' y consume resultados" "AMQP"
        coreAdapter -> eventBroker "Consume 'DebitoSolicitado' y publica 'DebitoEjecutado' / 'DebitoFallido'" "AMQP"
        coreAdapter -> coreLegacy "Invoca la interfaz legacy (Circuit Breaker + Retry con jitter)" "SOAP / REST"
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

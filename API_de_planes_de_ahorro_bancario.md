### API de planes de ahorro bancario

## 1. Introducción

### 1.1 Contexto del proyecto

El presente proyecto plantea el desarrollo de una API de planes de ahorro como una nueva funcionalidad de un sistema bancario existente. Por lo tanto, no contempla la construcción de un core bancario desde cero, sino la incorporación de un componente especializado que se conectará con las capacidades que ya forman parte del banco.

Esta API estará orientada a la gestión de planes de ahorro y operará dentro del ecosistema tecnológico de la institución. Dentro de este entorno, la planificación del ahorro requiere mecanismos que permitan organizar metas y mantener un seguimiento continuo desde la misma plataforma utilizada por el cliente para administrar sus cuentas.

### 1.2 Propósito del documento

El propósito de este documento es presentar la visión de la API de planes de ahorro bancario y establecer su relación con las necesidades del cliente y los objetivos del banco. También se delimita el contexto en el que será desarrollada, los participantes involucrados y su papel dentro del sistema bancario.

### 1.3 Relación con el ecosistema bancario

La API se integrará con los servicios existentes relacionados con clientes, cuentas y operaciones bancarias. Su responsabilidad se concentrará en el dominio de los planes de ahorro, mientras que los procesos propios del core continuarán bajo la gestión de los componentes correspondientes. Esta separación permitirá utilizar la información y las capacidades disponibles en el banco sin duplicar funciones. La API coordinará las interacciones necesarias con estos servicios y mantendrá límites definidos respecto de los procesos centrales de la institución.

## 2. Visión del producto

### 2.1 Problema identificado

Muchas personas desean ahorrar, pero no siempre establecen un objetivo concreto ni definen una planificación para alcanzarlo. Aunque pueden tener una meta en mente, desconocen cuánto deberían aportar, durante cuánto tiempo y qué monto podrían obtener al finalizar el periodo. Esta falta de claridad dificulta iniciar el ahorro y mantenerlo de forma constante.

También existe una falta de seguimiento durante el proceso. Cuando el dinero permanece en la cuenta principal, sin estar asociado con un plan, resulta difícil identificar cuánto corresponde a la meta y cuánto se encuentra disponible para otros gastos. Al no existir una separación ni un control del progreso, el dinero puede utilizarse antes de alcanzar el objetivo.

Además, mantener el dinero en una cuenta sin incorporarlo a un plan limita la posibilidad de obtener intereses. El cliente conserva sus fondos, pero no cuenta con una proyección que le permita conocer el rendimiento esperado ni comparar distintas alternativas de ahorro según el monto, el plazo y sus gastos mensuales.

Estas dificultades afectan la constancia del ahorro y reducen la posibilidad de alcanzar las metas establecidas. Sin una planificación y un seguimiento adecuados, el cliente no dispone de información suficiente para controlar el avance ni ajustar sus aportes durante el periodo.

### 2.2 Oportunidad para el banco

La incorporación de planes de ahorro representa una oportunidad para ampliar los servicios disponibles en los canales digitales del banco. Al facilitar la creación de objetivos y la programación de aportes, la institución puede mantener una relación más frecuente con sus clientes y conocer mejor sus hábitos y necesidades financieras. Además, los aportes realizados a los planes incrementan los fondos captados por la institución. realizados a los planes también incrementan los fondos captados por la institución. Los aportes realizados incrementan los fondos captados por la institución y fortalecen su capacidad de intermediación financiera.

La permanencia de los planes permite conservar los fondos durante periodos definidos y ofrecer condiciones relacionadas con el cumplimiento y el monto acumulado. Según el monto acumulado y las reglas establecidas por el banco, el ahorro podrá utilizarse como respaldo para acceder a determinados beneficios, como un crédito garantizado mediante el bloqueo de los fondos correspondientes.

La información generada durante la creación y el seguimiento de los planes permitirá identificar puntos de abandono, niveles de cumplimiento y preferencias de los clientes. Estos datos podrán utilizarse para ajustar la experiencia digital y presentar alternativas relacionadas con sus objetivos financieros.

### 2.3 Usuarios objetivo y necesidades

La funcionalidad estará dirigida a clientes que ya utilizan la aplicación bancaria y disponen de una cuenta habilitada para realizar aportes. Dentro de este grupo se consideran personas que desean iniciar su ahorro con montos desde USD 10 mensuales, así como clientes que mantienen uno o varios objetivos financieros de forma simultánea.

Las necesidades identificadas son:

- Definir uno o varios objetivos de ahorro.
- Conocer cuánto se debe aportar para alcanzar cada meta.
- Determinar el tiempo necesario para completar el plan.
- Conocer el monto y los intereses proyectados al finalizar el periodo.
- Iniciar el ahorro con un aporte mensual accesible.
- Mantener separados los fondos destinados a cada objetivo.
- Realizar aportes con regularidad.
- Consultar el avance y los movimientos del plan.
- Recibir información sobre fechas y aportes pendientes.
- Comparar alternativas según el monto de ahorro y los gastos mensuales.
- Mantener la constancia durante el periodo establecido.
- Acceder a mejores condiciones según el plazo y el monto acumulado.

### 2.4 Visión y propuesta del producto

La API de planes de ahorro permitirá incorporar en la aplicación bancaria una funcionalidad para planificar, simular, crear y administrar diferentes objetivos de ahorro. Mediante un proceso guiado, el cliente podrá conocer cuánto necesita aportar, durante cuánto tiempo y qué monto podría obtener al finalizar el periodo.

Una vez creado el plan, la funcionalidad facilitará el seguimiento de los aportes y del progreso alcanzado. También permitirá comparar escenarios, mantener varios objetivos y acceder a condiciones relacionadas con la constancia, el bloqueo del ahorro y el monto acumulado.

La API se integrará con los servicios existentes del banco para utilizar las cuentas del cliente y solicitar las operaciones financieras necesarias. La gestión del plan corresponderá a la nueva funcionalidad, mientras que las transacciones bancarias continuarán bajo el control de los sistemas responsables.

### 2.5 Funcionalidades y alcance

La API administrará las funciones relacionadas directamente con los planes de ahorro:

- Simular el resultado del ahorro en el tiempo, incluidos los intereses proyectados.
- Comparar escenarios a partir del monto de ahorro definido y los gastos mensuales ingresados por el cliente.
- Crear varios planes de ahorro por cliente.
- Registrar el objetivo, monto, condición de interés, plazo y confirmación del plan.
- Permitir la selección de la fecha del débito automático.
- Permitir aportes mensuales desde USD 10, sin un límite propio definido por la funcionalidad.
- Programar débitos automáticos desde una cuenta seleccionada.
- Registrar aportes realizados, pendientes o fallidos.
- Realizar nuevos intentos de cobro de las cuotas pendientes y acumularlas con el aporte del siguiente periodo cuando no hayan sido recaudadas dentro del plazo definido.
- Mostrar el saldo, avance, plazo restante e historial de cada plan.
- Mostrar hitos y medallas, y aplicar las bonificaciones asociadas con la constancia.
- Generar las solicitudes o eventos de notificación sobre débitos, vencimientos y fechas relevantes.
- Administrar la condición lógica de los planes con fondos bloqueados.
- Evaluar el cumplimiento de condiciones para acceder a beneficios.
- Evaluar las condiciones de acceso y coordinar la solicitud de un crédito respaldado por el ahorro acumulado.
- Registrar eventos sobre el avance y abandono del proceso de creación.

La ejecución de las operaciones bancarias continuará a cargo de las capacidades existentes del banco. Entre ellas se encuentran:

- Identificar y autenticar al cliente.
- Consultar las cuentas habilitadas y sus saldos.
- Ejecutar los débitos y registrar los movimientos contables.
- Aplicar el bloqueo efectivo de los fondos.
- Gestionar la aprobación y administración de créditos.
- Enviar notificaciones mediante los canales institucionales.
- Proporcionar la información de los movimientos contables.
- Conservar los registros contables y de auditoría correspondientes.

Esta delimitación permite incorporar la funcionalidad completa de los planes de ahorro sin trasladar a la nueva API las responsabilidades generales del core bancario.

## 3. Objetivos y resultados esperados

### 3.1 Objetivo general

Desarrollar una API integrada al sistema bancario que permita planificar, simular y administrar planes de ahorro, con el fin de facilitar el cumplimiento de los objetivos financieros de los clientes y aumentar la captación y permanencia de fondos en la institución.

### 3.2 Objetivos específicos

- Permitir la planificación y simulación de objetivos de ahorro considerando el monto, el plazo, los aportes, los intereses proyectados y los gastos mensuales del cliente.
- Facilitar la creación y administración de varios planes de ahorro por cliente.
- Automatizar los aportes mediante débitos programados desde una cuenta bancaria.
- Facilitar el seguimiento de los planes mediante el registro de aportes, el historial, la visualización del progreso, los hitos y las bonificaciones asociadas con la constancia.
- Permitir el acceso a condiciones y productos relacionados con el ahorro, como tasas mayores por el bloqueo de fondos y créditos respaldados por el monto acumulado.
- Integrar la nueva funcionalidad con las capacidades existentes del sistema bancario sin duplicar las responsabilidades del core.
- Registrar información sobre el proceso de creación de los planes para identificar los pasos en los que se produce el abandono.

### 3.3 Indicadores de éxito

Los resultados de la funcionalidad podrán evaluarse mediante los siguientes indicadores:

| Indicador                          | Descripción                                                                             |
|----------------------------------------|---------------------------------------------------------------------------------------------|
| Conversión de simulaciones en planes   | Porcentaje de simulaciones que finalizan con la creación de un plan.                        |
| Monto total captado                    | Suma del dinero acumulado en los planes de ahorro.                                          |
| Aporte promedio mensual                | Promedio de los aportes mensuales realizados por los clientes.                              |
| Permanencia de los planes              | Tiempo promedio durante el cual los planes se mantienen activos.                            |
| Cumplimiento de aportes                | Porcentaje de aportes realizados en la fecha programada.                                    |
| Efectividad de cobro                   | Porcentaje de débitos completados, incluidos los recuperados mediante intentos posteriores. |
| Metas completadas                      | Porcentaje de planes que alcanzan el objetivo definido.                                     |
| Abandono por paso                      | Porcentaje de usuarios que abandonan cada etapa de creación del plan.                       |
| Uso del ahorro bloqueado               | Porcentaje de planes que seleccionan la modalidad de bloqueo.                               |
| Contratación de productos relacionados | Porcentaje de clientes que contratan un crédito u otro beneficio asociado con el ahorro.    |

## 4. Cadena de valor de la API

La cadena de valor describe el proceso mediante el cual una intención de ahorro se transforma en un plan activo, con aportes periódicos, seguimiento y acceso a beneficios. En este proceso intervienen el cliente, la aplicación bancaria, la API de planes de ahorro y los servicios existentes del banco.

### 4.1 Participantes de la cadena

| Participante | Participación |
|---|---|
| Cliente ahorrador | Define una meta, compara escenarios, configura el plan y consulta su progreso. |
| Aplicación bancaria | Presenta la funcionalidad y permite al cliente interactuar con sus planes desde la banca web o móvil. |
| Sistema de Planes de Ahorro | Administra la simulación, creación, configuración y seguimiento de los planes. |
| Core bancario | Proporciona la información de las cuentas, ejecuta los débitos y aplica el bloqueo efectivo de los fondos cuando corresponde. |
| Operador del banco | Consulta el estado de los cobros y atiende reclamos relacionados con los aportes. |
| Auditor financiero | Consulta el historial de movimientos para verificar los aportes y el saldo de los planes. |
| Servicio de crédito | Gestiona los créditos respaldados por el ahorro acumulado. |
| Servicio de identidad y acceso | Autentica al cliente y controla el acceso a la funcionalidad. |
| Servicio de notificaciones | Envía avisos relacionados con débitos, fechas, cuotas pendientes, hitos y finalización del plan. |
| Servicio de analítica | Registra el avance del proceso y los puntos en los que los usuarios abandonan la creación del plan. |

### 4.2 Etapas de la cadena

La cadena comienza cuando el cliente establece un objetivo y realiza una simulación. En esta etapa se consideran el monto de ahorro, los gastos mensuales, el plazo y los intereses proyectados. La información obtenida permite comparar escenarios antes de seleccionar una alternativa.

Después de elegir las condiciones, el cliente crea el plan mediante un proceso guiado y configura el aporte mensual y la fecha del débito. A partir de esta configuración, el sistema solicita al core bancario la ejecución de los cobros programados desde la cuenta seleccionada.

Durante la vigencia del plan se registran los aportes realizados, pendientes o fallidos. El cliente puede consultar el historial y visualizar el progreso mediante barras, hitos y medallas. También recibe notificaciones sobre los débitos, las fechas relevantes y la finalización del periodo.

La cadena continúa hasta que se alcanza la meta o se completa el tiempo establecido. Según las condiciones del plan y el monto acumulado, el cliente puede acceder a una tasa mayor mediante el bloqueo del ahorro o utilizar los fondos como respaldo para solicitar un crédito.

La secuencia se resume de la siguiente manera:

Definición de la meta → Simulación y comparación → Creación del plan → Programación de aportes → Seguimiento del progreso → Cumplimiento de la meta → Acceso a beneficios

### 4.3 Resultado de cada etapa

| Etapa                | Resultado para el cliente                                                  | Resultado para el banco                                                               |
|--------------------------|--------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| Definición de la meta    | Establece el monto que desea alcanzar.                                         | Identifica la necesidad financiera del cliente.                                           |
| Simulación y comparación | Conoce el aporte, el plazo y los intereses proyectados antes de crear el plan. | Registra la intención de ahorro y las alternativas consultadas.                           |
| Creación del plan        | Formaliza su objetivo y selecciona las condiciones del ahorro.                 | Convierte la intención en un plan activo e identifica los puntos de abandono del proceso. |
| Programación de aportes  | Automatiza el ahorro desde una cuenta y selecciona la fecha del débito.        | Recibe aportes periódicos y aumenta los fondos captados.                                  |
| Seguimiento del progreso | Consulta los aportes, el historial y el avance de la meta.                     | Obtiene información sobre la constancia, el cumplimiento de los aportes.                  |
| Cumplimiento de la meta  | Alcanza el monto o completa el periodo establecido.                            | Consolida la relación con el cliente y facilita la creación de nuevos planes.             |
| Acceso a beneficios      | Puede obtener una tasa mayor o solicitar un crédito respaldado por el ahorro.  | Amplía la contratación de productos financieros relacionados.                             |

## 5. Modelo de negocio y monetización

La API de planes de ahorro funcionará como una capacidad interna del banco y será utilizada desde la aplicación bancaria. Su monetización no estará basada en el cobro por el uso de la API, sino en los resultados financieros generados por la captación y permanencia de los fondos depositados en los planes.

### Modelo de negocio

El modelo se orienta a clientes del banco que desean organizar uno o varios objetivos de ahorro. La funcionalidad se ofrecerá mediante los canales digitales existentes y se apoyará en el core bancario para consultar cuentas, ejecutar débitos y bloquear fondos.

| Elemento                | Descripción                                                                                                                                    |
|-------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| Segmento de clientes    | Clientes de la aplicación bancaria, especialmente personas que desean iniciar con aportes pequeños o administrar varios objetivos.             |
| Canal                   | Aplicación bancaria web o móvil.                                                                                                               |
| Producto                | Planes de ahorro con simulación, aportes automáticos, seguimiento y acceso a condiciones relacionadas con el monto acumulado                   |
| Actividades principales | Administración de planes, coordinación de aportes, seguimiento e integración con los servicios bancarios.                                      |
| Sistemas participantes  | Core bancario, identidad y acceso, crédito, notificaciones y analítica                                                                         |
| Lógica económica        | Captación y permanencia de fondos que pueden destinarse a la colocación de créditos y a la contratación de productos financieros relacionados. |

### 5.2 Mecanismos de monetización

El principal mecanismo de monetización será indirecto. Los aportes realizados incrementarán los fondos captados por el banco y permitirán disponer de mayores recursos para su actividad de intermediación financiera. Estos recursos podrán destinarse a la colocación de créditos, mediante los cuales se generan ingresos por intereses.

La permanencia del dinero durante el plazo del plan, especialmente en la modalidad de ahorro bloqueado, permitirá mantener los fondos durante periodos definidos. Como mecanismo complementario, el monto acumulado podrá utilizarse como garantía para solicitar un crédito, lo que generará ingresos adicionales mediante los intereses asociados a este producto.

Por lo tanto, la API no genera ingresos por su consumo técnico. Su aporte económico se produce al facilitar la captación, permanencia y utilización de los fondos dentro de la actividad financiera del banco.

### 5.3 Costos principales

Los costos asociados con la funcionalidad corresponden al desarrollo y mantenimiento de la API, su integración con los sistemas existentes, la infraestructura necesaria para su ejecución y el soporte operativo. También se consideran los costos relacionados con seguridad, notificaciones, monitoreo y almacenamiento de la información de los planes. En consecuencia, se adopta un modelo de monetización principalmente indirecto, complementado por los ingresos generados mediante productos financieros relacionados.

## 6. Naturaleza y límites de la API

### 6.1 Clasificación

- API privada;
- API de negocio;
- integrada al ecosistema del banco;
- consumida por canales digitales;
- orientada al dominio de planes de ahorro.

### 6.2 Consumidores

- aplicación móvil;
- banca web;
- sistemas internos autorizados.

### 6.3 Responsabilidades de la API

- simulación;
- gestión de planes;
- programación de aportes;
- progreso e hitos;
- reglas del producto;
- coordinación de integraciones.

### 6.4 Responsabilidades de los sistemas existentes

- autenticación;
- cuentas y saldos;
- ejecución contable del débito;
- bloqueo real de fondos;
- crédito;
- envío de notificaciones.

### 6.5 Cinco dimensiones del diseño

Se explican brevemente:

- interoperabilidad;
- modularidad;
- escalabilidad;
- estandarización;
- seguridad.

Esta parte no debería exceder una página porque la justificación técnica profunda corresponde a RA2.

## 7. Representación ArchiMate

### 7.1 Vista de motivación y negocio

### 7.2 Vista de aplicaciones e integraciones

Pueden realizar una sola vista combinada o dos vistas pequeñas:

1.  Motivación y negocio: objetivos, necesidades, producto y servicio.
2.  Aplicaciones: aplicación bancaria, API, core, crédito, notificaciones y analítica.

ArchiMate funciona aquí como respaldo visual del documento, no como sustituto del modelo de negocio.

## 8. Riesgos, supuestos y restricciones

Una tabla compacta:

| Tipo    | Descripción                                                            |
|-------------|----------------------------------------------------------------------------|
| Supuesto    | El cliente ya dispone de una cuenta bancaria activa                        |
| Supuesto    | El core ofrece interfaces para consultar cuentas y ejecutar débitos        |
| Dependencia | La API depende de servicios bancarios preexistentes                        |
| Riesgo      | Los débitos fallidos pueden afectar la continuidad del plan                |
| Riesgo      | Una simulación incorrecta puede crear expectativas financieras equivocadas |
| Restricción | La API no modifica directamente los datos del core                         |
| Restricción | Las operaciones deben ser seguras, trazables e idempotentes                |

## 9. Conclusiones

La conclusión debe responder brevemente:

- por qué el producto es viable;
- qué problema resuelve;
- cómo beneficia al banco;
- cuál es el modelo de monetización;
- por qué una API resulta adecuada para implementarlo.

## 10. Referencias

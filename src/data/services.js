/* ===== DATA: servicios AWS y banco de preguntas =====
   Cobertura ampliada para la certificación AWS Certified Cloud Practitioner (CLF-C02).
   Servicios agrupados por dominio del examen. Todo el contenido de cara al usuario en español.
*/
export const AWS_SERVICES = [
  /* --- Cómputo --- */
  {id:'ec2', abbr:'EC2', name:'Amazon EC2', color:'#ff9f2e'},
  {id:'lambda', abbr:'λ', name:'AWS Lambda', color:'#ff9f2e'},
  {id:'beanstalk', abbr:'EB', name:'AWS Elastic Beanstalk', color:'#ff9f2e'},
  {id:'ecs', abbr:'ECS', name:'Amazon ECS', color:'#ff9f2e'},
  {id:'eks', abbr:'EKS', name:'Amazon EKS', color:'#ff9f2e'},
  {id:'fargate', abbr:'FGT', name:'AWS Fargate', color:'#ff9f2e'},
  {id:'lightsail', abbr:'LSA', name:'Amazon Lightsail', color:'#ff9f2e'},

  /* --- Almacenamiento --- */
  {id:'s3', abbr:'S3', name:'Amazon S3', color:'#57b46b'},
  {id:'ebs', abbr:'EBS', name:'Amazon EBS', color:'#57b46b'},
  {id:'efs', abbr:'EFS', name:'Amazon EFS', color:'#57b46b'},
  {id:'glacier', abbr:'GLA', name:'Amazon S3 Glacier', color:'#57b46b'},
  {id:'backup', abbr:'BKP', name:'AWS Backup', color:'#57b46b'},

  /* --- Bases de datos --- */
  {id:'rds', abbr:'RDS', name:'Amazon RDS', color:'#4aa3ff'},
  {id:'aurora', abbr:'AUR', name:'Amazon Aurora', color:'#4aa3ff'},
  {id:'dynamodb', abbr:'DDB', name:'Amazon DynamoDB', color:'#4aa3ff'},
  {id:'redshift', abbr:'RS', name:'Amazon Redshift', color:'#4aa3ff'},
  {id:'elasticache', abbr:'EC', name:'Amazon ElastiCache', color:'#4aa3ff'},

  /* --- Redes y entrega de contenido --- */
  {id:'vpc', abbr:'VPC', name:'Amazon VPC', color:'#9b8bff'},
  {id:'route53', abbr:'R53', name:'Amazon Route 53', color:'#9b8bff'},
  {id:'cloudfront', abbr:'CF', name:'Amazon CloudFront', color:'#9b8bff'},
  {id:'elb', abbr:'ELB', name:'Elastic Load Balancing', color:'#9b8bff'},
  {id:'apigateway', abbr:'API', name:'Amazon API Gateway', color:'#9b8bff'},

  /* --- Seguridad, identidad y cumplimiento --- */
  {id:'iam', abbr:'IAM', name:'AWS IAM', color:'#ff6b61'},
  {id:'cognito', abbr:'COG', name:'Amazon Cognito', color:'#ff6b61'},
  {id:'kms', abbr:'KMS', name:'AWS KMS', color:'#ff6b61'},
  {id:'secretsmanager', abbr:'SM', name:'AWS Secrets Manager', color:'#ff6b61'},
  {id:'waf', abbr:'WAF', name:'AWS WAF', color:'#ff6b61'},
  {id:'shield', abbr:'SHD', name:'AWS Shield', color:'#ff6b61'},
  {id:'guardduty', abbr:'GD', name:'Amazon GuardDuty', color:'#ff6b61'},
  {id:'organizations', abbr:'ORG', name:'AWS Organizations', color:'#ff6b61'},

  /* --- Administración y gobernanza --- */
  {id:'cloudwatch', abbr:'CW', name:'Amazon CloudWatch', color:'#2ec4b6'},
  {id:'cloudtrail', abbr:'CT', name:'AWS CloudTrail', color:'#2ec4b6'},
  {id:'config', abbr:'CFG', name:'AWS Config', color:'#2ec4b6'},
  {id:'cloudformation', abbr:'CFN', name:'AWS CloudFormation', color:'#2ec4b6'},
  {id:'systemsmanager', abbr:'SSM', name:'AWS Systems Manager', color:'#2ec4b6'},
  {id:'trustedadvisor', abbr:'TA', name:'AWS Trusted Advisor', color:'#2ec4b6'},
  {id:'controltower', abbr:'CTW', name:'AWS Control Tower', color:'#2ec4b6'},

  /* --- Integración de aplicaciones --- */
  {id:'sns', abbr:'SNS', name:'Amazon SNS', color:'#ff7eb6'},
  {id:'sqs', abbr:'SQS', name:'Amazon SQS', color:'#ff7eb6'},
  {id:'eventbridge', abbr:'EVB', name:'Amazon EventBridge', color:'#ff7eb6'},
  {id:'stepfunctions', abbr:'SFN', name:'AWS Step Functions', color:'#ff7eb6'},

  /* --- Analítica --- */
  {id:'athena', abbr:'ATH', name:'Amazon Athena', color:'#f4c542'},
  {id:'kinesis', abbr:'KIN', name:'Amazon Kinesis', color:'#f4c542'},
  {id:'quicksight', abbr:'QS', name:'Amazon QuickSight', color:'#f4c542'},

  /* --- Inteligencia artificial / ML --- */
  {id:'sagemaker', abbr:'SM+', name:'Amazon SageMaker', color:'#d16bff'},
  {id:'rekognition', abbr:'REK', name:'Amazon Rekognition', color:'#d16bff'},
  {id:'polly', abbr:'POL', name:'Amazon Polly', color:'#d16bff'},

  /* --- Herramientas de desarrollo --- */
  {id:'codecommit', abbr:'CC', name:'AWS CodeCommit', color:'#45c9d6'},
  {id:'codepipeline', abbr:'CP', name:'AWS CodePipeline', color:'#45c9d6'},

  /* --- Migración y transferencia --- */
  {id:'snow', abbr:'SNW', name:'AWS Snow Family', color:'#d98e4a'},
  {id:'dms', abbr:'DMS', name:'AWS DMS', color:'#d98e4a'},

  /* --- Facturación y gestión de costos --- */
  {id:'costexplorer', abbr:'CE', name:'AWS Cost Explorer', color:'#a8d84a'},
  {id:'budgets', abbr:'BGT', name:'AWS Budgets', color:'#a8d84a'},
  {id:'pricingcalculator', abbr:'PC', name:'AWS Pricing Calculator', color:'#a8d84a'},
];

export const QUESTIONS = {
  /* ===== Cómputo ===== */
  ec2: [
    {q:'¿Qué tipo de recurso es Amazon EC2?', o:['Una instancia de servidor virtual','Una base de datos administrada','Un sistema de archivos compartido','Un servicio de mensajería'], c:0},
    {q:'¿Qué significa la sigla EC2?', o:['Elastic Compute Cloud','Elastic Container Cluster','Enhanced Compute Center','External Cloud Connector'], c:0},
    {q:'¿Para qué sirve el "Auto Scaling" en EC2?', o:['Ajustar el número de instancias según la demanda','Cifrar discos automáticamente','Enrutar dominios','Facturar por segundo'], c:0},
    {q:'¿Qué es una AMI en EC2?', o:['Una imagen preconfigurada para lanzar instancias','Un tipo de balanceador de carga','Un protocolo de red','Una base de datos NoSQL'], c:0},
  ],
  lambda: [
    {q:'AWS Lambda es un servicio de:', o:['Cómputo sin servidor (serverless)','Almacenamiento en frío','Red de entrega de contenido','Directorio de usuarios'], c:0},
    {q:'¿Qué suele disparar (trigger) una función Lambda?', o:['Eventos como cambios en S3 o solicitudes API','Solo el reloj del sistema operativo','Únicamente clics de mouse','Cambios manuales del DNS'], c:0},
    {q:'¿Cuál es una ventaja clave de Lambda?', o:['Solo pagas por el tiempo de ejecución usado','Debes administrar servidores manualmente','Requiere licencias anuales','Corre solo en tu computadora local'], c:0},
    {q:'¿Cuál es aproximadamente el tiempo máximo de ejecución de una función Lambda?', o:['15 minutos','24 horas','5 segundos','Ilimitado'], c:0},
  ],
  beanstalk: [
    {q:'¿Qué facilita AWS Elastic Beanstalk?', o:['Desplegar y administrar aplicaciones sin gestionar la infraestructura','Almacenar objetos a gran escala','Detectar amenazas de seguridad','Analizar consultas SQL'], c:0},
    {q:'¿Quién administra los recursos subyacentes (EC2, balanceadores) al usar Elastic Beanstalk?', o:['AWS los aprovisiona automáticamente por ti','El usuario los crea uno a uno manualmente','Nadie, no usa recursos','Un proveedor externo'], c:0},
    {q:'¿Qué modelo de precios tiene Elastic Beanstalk en sí mismo?', o:['Es gratis; solo pagas los recursos que utiliza','Cobra una tarifa mensual fija','Cobra por cada despliegue','Requiere licencia anual'], c:0},
    {q:'¿Qué tipo de aplicaciones puede desplegar Elastic Beanstalk?', o:['Aplicaciones web en lenguajes como Java, Python, Node.js y .NET','Solo scripts de shell','Solo modelos de ML','Solo bases de datos'], c:0},
  ],
  ecs: [
    {q:'¿Para qué se usa Amazon ECS?', o:['Orquestar y ejecutar contenedores','Almacenar archivos estáticos','Gestionar usuarios y permisos','Enviar correos'], c:0},
    {q:'¿Qué tecnología ejecuta ECS?', o:['Contenedores (Docker)','Máquinas físicas dedicadas','Solo funciones serverless','Bases de datos relacionales'], c:0},
    {q:'¿Con qué servicio puede ECS ejecutar contenedores sin administrar servidores?', o:['AWS Fargate','Amazon S3','Amazon Route 53','AWS KMS'], c:0},
    {q:'¿Qué significa la sigla ECS?', o:['Elastic Container Service','Elastic Compute Service','Enterprise Cloud System','Edge Content Server'], c:0},
  ],
  eks: [
    {q:'¿Qué es Amazon EKS?', o:['Un servicio administrado de Kubernetes','Un almacén de objetos','Una CDN global','Un servicio de correo'], c:0},
    {q:'¿Qué estándar de orquestación usa EKS?', o:['Kubernetes','Terraform','Ansible','Jenkins'], c:0},
    {q:'¿Qué ventaja ofrece EKS frente a Kubernetes autoadministrado?', o:['AWS administra el plano de control por ti','Elimina la necesidad de contenedores','Convierte todo en serverless automáticamente','No requiere red'], c:0},
    {q:'¿Qué significa la sigla EKS?', o:['Elastic Kubernetes Service','Elastic Key Store','Enterprise Kubernetes System','Edge Kernel Service'], c:0},
  ],
  fargate: [
    {q:'¿Qué es AWS Fargate?', o:['Un motor sin servidor para ejecutar contenedores','Una base de datos NoSQL','Un firewall de aplicaciones web','Un servicio de DNS'], c:0},
    {q:'¿Qué elimina Fargate al ejecutar contenedores?', o:['La necesidad de aprovisionar y administrar servidores','La necesidad de escribir código','El uso de redes','El cifrado de datos'], c:0},
    {q:'¿Con qué servicios de contenedores funciona Fargate?', o:['Amazon ECS y Amazon EKS','Amazon S3 y Glacier','Route 53 y CloudFront','IAM y KMS'], c:0},
    {q:'¿Qué modelo de pago usa Fargate?', o:['Pagas por los recursos (vCPU y memoria) que usan tus contenedores','Una tarifa mensual fija','Por número de imágenes','Siempre gratis'], c:0},
  ],
  lightsail: [
    {q:'¿A quién está orientado Amazon Lightsail?', o:['A usuarios que quieren servidores virtuales sencillos con precio predecible','A cargas de big data','A entrenamiento de modelos de ML','A auditorías de seguridad'], c:0},
    {q:'¿Qué caracteriza el precio de Lightsail?', o:['Planes mensuales fijos y predecibles','Cobro por milisegundo','Siempre es gratuito','Cobro por consulta'], c:0},
    {q:'¿Qué puede incluir un plan de Lightsail?', o:['Cómputo, almacenamiento y transferencia en un paquete','Solo almacenamiento de objetos','Solo funciones serverless','Solo una base de datos'], c:0},
    {q:'¿Qué tipo de recurso ofrece principalmente Lightsail?', o:['Servidores privados virtuales (VPS) fáciles de usar','Un data warehouse','Una CDN global','Un servicio de colas'], c:0},
  ],

  /* ===== Almacenamiento ===== */
  s3: [
    {q:'¿Para qué se usa Amazon S3 principalmente?', o:['Almacenamiento de objetos','Cómputo serverless','Bases de datos relacionales','Redes privadas virtuales'], c:0},
    {q:'¿Qué significa la sigla S3?', o:['Simple Storage Service','Secure Server System','Scalable Software Solution','Storage Security Suite'], c:0},
    {q:'¿Cómo se organiza el contenido dentro de S3?', o:['En buckets y objetos','En tablas y filas','En VPCs y subredes','En funciones y capas'], c:0},
    {q:'¿Qué clase de almacenamiento de S3 es más económica para datos poco accedidos?', o:['S3 Glacier','S3 Standard','S3 Intelligent-Tiering estándar','S3 Express'], c:0},
  ],
  ebs: [
    {q:'¿Qué es Amazon EBS?', o:['Almacenamiento en bloques para instancias EC2','Almacenamiento de objetos','Una base de datos administrada','Una CDN'], c:0},
    {q:'¿Con qué servicio se asocian típicamente los volúmenes EBS?', o:['Instancias Amazon EC2','Funciones Lambda','Buckets S3','Tablas DynamoDB'], c:0},
    {q:'¿Qué permite hacer un "snapshot" de EBS?', o:['Respaldar el volumen en Amazon S3','Cifrar la red','Escalar instancias','Enrutar dominios'], c:0},
    {q:'¿EBS es almacenamiento efímero o persistente?', o:['Persistente: los datos permanecen aunque se detenga la instancia','Efímero: se borra al apagar','Solo en memoria','Solo temporal por sesión'], c:0},
  ],
  efs: [
    {q:'¿Qué tipo de almacenamiento ofrece Amazon EFS?', o:['Un sistema de archivos compartido y elástico','Almacenamiento en bloques de un solo uso','Almacenamiento de objetos','Una base de datos'], c:0},
    {q:'¿Con qué sistemas es compatible EFS?', o:['Linux (NFS)','Solo Windows','Solo dispositivos móviles','Ninguno, es solo objetos'], c:0},
    {q:'¿Qué ventaja tiene EFS respecto a la capacidad?', o:['Crece y se reduce automáticamente según los archivos','Tiene un tamaño fijo inmutable','Requiere reiniciar para crecer','No admite múltiples instancias'], c:0},
    {q:'¿Qué significa la sigla EFS?', o:['Elastic File System','Elastic Fast Storage','Enterprise File Server','Edge File Service'], c:0},
  ],
  glacier: [
    {q:'¿Para qué está diseñado Amazon S3 Glacier?', o:['Archivado de datos a largo plazo y bajo costo','Cómputo intensivo','Servir sitios web dinámicos','Balanceo de carga'], c:0},
    {q:'¿Qué se sacrifica en Glacier a cambio de menor costo?', o:['La velocidad de recuperación (puede tardar más)','La durabilidad de los datos','La seguridad','La compatibilidad con S3'], c:0},
    {q:'¿Qué tipo de datos conviene almacenar en Glacier?', o:['Datos rara vez accedidos, como respaldos y cumplimiento','Datos de acceso constante y baja latencia','Sesiones activas de usuarios','Cachés temporales'], c:0},
    {q:'¿Glacier forma parte de qué servicio de almacenamiento?', o:['Amazon S3','Amazon EBS','Amazon RDS','Amazon EFS'], c:0},
  ],
  backup: [
    {q:'¿Qué hace AWS Backup?', o:['Centraliza y automatiza los respaldos de varios servicios AWS','Ejecuta contenedores','Entrena modelos de ML','Enruta tráfico DNS'], c:0},
    {q:'¿Qué ventaja aporta AWS Backup?', o:['Gestionar políticas de respaldo desde un solo lugar','Reducir la latencia de red','Cifrar el tráfico web','Escalar instancias EC2'], c:0},
    {q:'¿Qué servicios puede respaldar AWS Backup?', o:['EBS, RDS, DynamoDB, EFS y más','Solo S3','Solo EC2','Solo Lambda'], c:0},
    {q:'¿Qué permite definir AWS Backup para automatizar respaldos?', o:['Planes de respaldo con programación y retención','Reglas de firewall','Grupos de Auto Scaling','Zonas de DNS'], c:0},
  ],

  /* ===== Bases de datos ===== */
  rds: [
    {q:'¿Qué es Amazon RDS?', o:['Un servicio de bases de datos relacionales administradas','Un almacén de objetos','Una CDN','Un servicio de colas'], c:0},
    {q:'¿Cuál de estos motores soporta RDS?', o:['MySQL, PostgreSQL, MariaDB, Oracle, SQL Server','Solo DynamoDB','Solo MongoDB','Solo Redis'], c:0},
    {q:'¿Qué tarea administra RDS por ti?', o:['Parcheo, respaldos y alta disponibilidad de la base de datos','El diseño de tus consultas','El código de tu aplicación','El diseño de tu red doméstica'], c:0},
    {q:'¿RDS es una base de datos relacional o NoSQL?', o:['Relacional (SQL)','NoSQL de documentos','De grafos','De clave-valor en memoria'], c:0},
  ],
  aurora: [
    {q:'¿Qué es Amazon Aurora?', o:['Una base de datos relacional compatible con MySQL y PostgreSQL','Un almacén de objetos','Un servicio de contenedores','Una CDN'], c:0},
    {q:'¿Qué destaca de Aurora frente a bases tradicionales?', o:['Mayor rendimiento y alta disponibilidad administrada','Que no admite SQL','Que solo funciona local','Que es exclusiva para archivos'], c:0},
    {q:'¿Con qué motores es compatible Aurora?', o:['MySQL y PostgreSQL','Oracle y SQL Server','MongoDB y Redis','Cassandra y Neo4j'], c:0},
    {q:'¿Aurora es un servicio administrado?', o:['Sí, AWS gestiona parcheo, respaldos y escalado','No, lo administras tú por completo','Solo funciona en local','Solo administra la red'], c:0},
  ],
  dynamodb: [
    {q:'Amazon DynamoDB es una base de datos:', o:['NoSQL administrada','Relacional SQL','En memoria caché únicamente','De archivos planos'], c:0},
    {q:'¿Qué caracteriza a DynamoDB?', o:['Baja latencia y escalabilidad automática','Requiere servidores propios','Solo almacena imágenes','Es un servicio de correo'], c:0},
    {q:'¿Qué es una "partition key" en DynamoDB?', o:['El atributo que determina cómo se distribuyen los datos','Un índice secundario obligatorio','Una contraseña de acceso','Un backup automático'], c:0},
    {q:'¿Qué modelos de facturación ofrece DynamoDB?', o:['Bajo demanda o capacidad aprovisionada','Solo licencia anual fija','Siempre gratis','Pago por empleado'], c:0},
  ],
  redshift: [
    {q:'¿Para qué se usa Amazon Redshift?', o:['Almacenamiento de datos y análisis (data warehouse)','Ejecutar contenedores','Enviar notificaciones','Servir contenido estático'], c:0},
    {q:'¿Qué tipo de cargas de trabajo optimiza Redshift?', o:['Consultas analíticas sobre grandes volúmenes de datos','Transacciones en tiempo real de baja latencia','Streaming de video','Autenticación de usuarios'], c:0},
    {q:'¿Redshift es un servicio relacional o NoSQL?', o:['Relacional, orientado a análisis (columnar)','NoSQL de documentos','De grafos','De colas'], c:0},
    {q:'¿Qué significa que Redshift sea "columnar"?', o:['Almacena datos por columnas para acelerar el análisis','Que solo tiene una columna','Que no usa SQL','Que guarda imágenes'], c:0},
  ],
  elasticache: [
    {q:'¿Qué proporciona Amazon ElastiCache?', o:['Almacenamiento en memoria (caché) para acelerar aplicaciones','Almacenamiento de objetos','Un data warehouse','Un firewall'], c:0},
    {q:'¿Qué motores soporta ElastiCache?', o:['Redis y Memcached','MySQL y Oracle','MongoDB y Neptune','Kafka y RabbitMQ'], c:0},
    {q:'¿Cuál es el beneficio principal de ElastiCache?', o:['Reducir la latencia leyendo datos frecuentes desde memoria','Archivar datos a largo plazo','Cifrar el tráfico web','Balancear la carga'], c:0},
    {q:'¿ElastiCache es un servicio administrado?', o:['Sí, AWS administra el almacén en memoria por ti','No, lo instalas y mantienes tú','Solo funciona en local','Solo con Windows'], c:0},
  ],

  /* ===== Redes y entrega de contenido ===== */
  vpc: [
    {q:'¿Qué es una Amazon VPC?', o:['Una red virtual privada y aislada dentro de AWS','Un tipo de base de datos','Un servicio de correo electrónico','Una función serverless'], c:0},
    {q:'¿Qué componente conecta una VPC a internet?', o:['Un Internet Gateway','Una Lambda Layer','Un DynamoDB Stream','Un IAM Role'], c:0},
    {q:'¿Qué es una subred (subnet) pública?', o:['Una subred con ruta hacia un Internet Gateway','Una subred sin ningún acceso','Una base de datos compartida','Un grupo de usuarios IAM'], c:0},
    {q:'¿Qué controla un "Security Group" en una VPC?', o:['El tráfico entrante y saliente de las instancias','El precio de las instancias','El idioma de la consola','El nombre del dominio'], c:0},
  ],
  route53: [
    {q:'¿Qué tipo de servicio es Amazon Route 53?', o:['DNS y registro de dominios','Almacenamiento de objetos','Cómputo serverless','Un data warehouse'], c:0},
    {q:'¿Qué puede hacer Route 53 además de resolver DNS?', o:['Enrutar tráfico y comprobar el estado (health checks)','Ejecutar contenedores','Cifrar volúmenes','Enviar correos masivos'], c:0},
    {q:'¿A qué protocolo de internet está asociado Route 53?', o:['DNS (sistema de nombres de dominio)','SMTP','FTP','SSH'], c:0},
    {q:'¿A qué hace referencia el número en "Route 53"?', o:['Al puerto 53, usado por DNS','Al puerto 80 de HTTP','Al puerto 443 de HTTPS','Al puerto 22 de SSH'], c:0},
  ],
  cloudfront: [
    {q:'¿Qué es Amazon CloudFront?', o:['Una red de entrega de contenido (CDN)','Una base de datos','Un servicio de identidad','Una cola de mensajes'], c:0},
    {q:'¿Qué beneficio principal aporta CloudFront?', o:['Entregar contenido con baja latencia usando ubicaciones de borde','Entrenar modelos de ML','Administrar usuarios','Almacenar respaldos'], c:0},
    {q:'¿Desde dónde sirve el contenido CloudFront?', o:['Desde ubicaciones de borde (edge locations) cercanas al usuario','Desde un único servidor central','Desde el dispositivo del usuario','Desde Glacier'], c:0},
    {q:'¿Qué es una "edge location" en CloudFront?', o:['Un punto de presencia que cachea contenido cerca del usuario','Un servidor de base de datos','Una zona de disponibilidad','Un bucket de S3'], c:0},
  ],
  elb: [
    {q:'¿Qué hace Elastic Load Balancing (ELB)?', o:['Distribuye el tráfico entrante entre varios destinos','Almacena objetos','Cifra bases de datos','Registra dominios'], c:0},
    {q:'¿Qué beneficio aporta ELB a una aplicación?', o:['Alta disponibilidad y tolerancia a fallos','Menor costo de almacenamiento','Mayor tamaño de disco','Acceso a internet gratuito'], c:0},
    {q:'¿Entre qué recursos suele repartir la carga ELB?', o:['Varias instancias EC2 o contenedores','Buckets S3','Tablas DynamoDB','Roles IAM'], c:0},
    {q:'¿Qué tipos de balanceadores ofrece ELB?', o:['Application, Network y Gateway Load Balancer','Solo uno genérico','Solo para bases de datos','Solo para DNS'], c:0},
  ],
  apigateway: [
    {q:'¿Para qué sirve Amazon API Gateway?', o:['Crear, publicar y administrar APIs','Almacenar objetos','Ejecutar consultas analíticas','Registrar dominios'], c:0},
    {q:'¿Con qué servicio serverless se integra comúnmente API Gateway?', o:['AWS Lambda','Amazon Glacier','AWS Shield','Amazon EFS'], c:0},
    {q:'¿Qué tipo de APIs puede administrar API Gateway?', o:['REST, HTTP y WebSocket','Solo SOAP','Solo FTP','Solo SMTP'], c:0},
    {q:'¿Qué beneficio ofrece API Gateway además de exponer APIs?', o:['Control de acceso, límites de tasa y almacenamiento en caché','Entrenar modelos de ML','Archivar datos en frío','Balancear discos'], c:0},
  ],

  /* ===== Seguridad, identidad y cumplimiento ===== */
  iam: [
    {q:'AWS IAM se usa para:', o:['Gestionar usuarios, roles y permisos','Almacenar archivos','Ejecutar código serverless','Enviar correos masivos'], c:0},
    {q:'¿Qué es una "policy" en IAM?', o:['Un documento que define permisos','Un servidor virtual','Una base de datos','Un balanceador de carga'], c:0},
    {q:'¿Qué principio de seguridad recomienda aplicar IAM?', o:['Otorgar el mínimo privilegio necesario','Dar acceso total a todos los usuarios','Compartir una sola contraseña para todos','Deshabilitar el cifrado'], c:0},
    {q:'¿Qué permite hacer un "IAM Role"?', o:['Otorgar permisos temporales sin credenciales fijas','Almacenar datos en la nube','Enviar notificaciones push','Escalar instancias EC2 automáticamente'], c:0},
  ],
  cognito: [
    {q:'¿Para qué se usa Amazon Cognito?', o:['Gestionar la autenticación y el registro de usuarios de aplicaciones','Almacenar objetos','Balancear carga','Analizar logs'], c:0},
    {q:'¿Qué agrupa a los usuarios de una aplicación en Cognito?', o:['Los "user pools"','Los buckets','Las subredes','Las colas'], c:0},
    {q:'¿Qué estándares de identidad admite Cognito?', o:['Inicio de sesión social y federado (OAuth, SAML)','Solo contraseñas locales','Solo claves físicas','Ninguno'], c:0},
    {q:'¿Qué significa MFA, que Cognito puede exigir?', o:['Autenticación multifactor','Máxima frecuencia de acceso','Modo de fallo automático','Marco de facturación anual'], c:0},
  ],
  kms: [
    {q:'¿Qué gestiona AWS KMS?', o:['La creación y control de claves de cifrado','El balanceo de carga','El registro de dominios','La orquestación de contenedores'], c:0},
    {q:'¿Qué significa KMS?', o:['Key Management Service','Kubernetes Managed Service','Kinesis Message System','Key Metric Store'], c:0},
    {q:'¿Para qué se usan las claves de KMS?', o:['Cifrar datos en servicios como S3, EBS y RDS','Enrutar tráfico de red','Escalar instancias','Enviar correos'], c:0},
    {q:'¿Qué facilita la integración de KMS con otros servicios?', o:['Cifrar datos en reposo de forma transparente','Balancear tráfico','Registrar dominios','Ejecutar contenedores'], c:0},
  ],
  secretsmanager: [
    {q:'¿Qué almacena AWS Secrets Manager?', o:['Credenciales y secretos como contraseñas y claves de API','Objetos grandes de video','Métricas de rendimiento','Tablas relacionales'], c:0},
    {q:'¿Qué función clave ofrece Secrets Manager?', o:['Rotación automática de secretos','Balanceo de carga','Entrega de contenido','Análisis de datos'], c:0},
    {q:'¿Por qué usar Secrets Manager en lugar de credenciales en el código?', o:['Evita exponer secretos y facilita su rotación segura','Es más lento','Reduce la durabilidad','Elimina el cifrado'], c:0},
    {q:'¿Qué tipo de secretos suele guardar Secrets Manager?', o:['Contraseñas de bases de datos y claves de API','Archivos de video','Métricas de CPU','Imágenes de contenedores'], c:0},
  ],
  waf: [
    {q:'¿Contra qué protege AWS WAF?', o:['Ataques web comunes como inyección SQL y XSS','Fallos de hardware','Pérdida de energía','Errores de facturación'], c:0},
    {q:'¿Qué significa WAF?', o:['Web Application Firewall','Wide Area Fabric','Web Access Filter','Workload Automation Framework'], c:0},
    {q:'¿Con qué servicios se integra WAF?', o:['CloudFront, API Gateway y Application Load Balancer','Glacier y EBS','Route 53 y KMS','Athena y Glue'], c:0},
    {q:'¿Con qué se crean las protecciones en AWS WAF?', o:['Reglas (rules) y listas de control de acceso web (web ACL)','Grupos de Auto Scaling','Zonas de DNS','Planes de respaldo'], c:0},
  ],
  shield: [
    {q:'¿Contra qué protege AWS Shield?', o:['Ataques de denegación de servicio distribuido (DDoS)','Inyección SQL','Errores de código','Fallos de disco'], c:0},
    {q:'¿Qué niveles ofrece AWS Shield?', o:['Standard (gratuito) y Advanced (de pago)','Solo un nivel de pago','Solo gratuito','Tres niveles empresariales'], c:0},
    {q:'¿AWS Shield Standard tiene costo adicional?', o:['No, está incluido sin costo para todos los clientes','Sí, tarifa mensual fija','Sí, por solicitud','Solo con soporte Enterprise'], c:0},
    {q:'¿Qué protección adicional ofrece Shield Advanced?', o:['Mitigación avanzada de DDoS y soporte especializado','Almacenamiento gratis','Cómputo ilimitado','Registro de dominios'], c:0},
  ],
  guardduty: [
    {q:'¿Qué hace Amazon GuardDuty?', o:['Detecta amenazas y actividad maliciosa de forma continua','Balancea la carga','Cifra volúmenes','Registra dominios'], c:0},
    {q:'¿En qué se basa GuardDuty para detectar amenazas?', o:['Analiza logs y actividad de la cuenta con inteligencia de amenazas','Escanea el hardware físico','Revisa el código fuente','Comprueba la facturación'], c:0},
    {q:'¿GuardDuty requiere instalar agentes?', o:['No, analiza fuentes de datos existentes sin agentes','Sí, uno por instancia','Sí, en cada bucket','Solo en Windows'], c:0},
    {q:'¿Qué produce GuardDuty cuando detecta algo sospechoso?', o:['Hallazgos (findings) de seguridad','Facturas','Instancias nuevas','Copias de seguridad'], c:0},
  ],
  organizations: [
    {q:'¿Qué permite AWS Organizations?', o:['Administrar de forma central varias cuentas de AWS','Ejecutar contenedores','Almacenar objetos','Entrenar modelos de ML'], c:0},
    {q:'¿Qué son las SCP (Service Control Policies) en Organizations?', o:['Políticas que limitan los permisos máximos de las cuentas','Reglas de red','Claves de cifrado','Planes de respaldo'], c:0},
    {q:'¿Qué beneficio de facturación ofrece Organizations?', o:['Facturación consolidada para varias cuentas','Elimina todos los costos','Cobra por usuario','Da servidores gratis'], c:0},
    {q:'¿Cómo se agrupan las cuentas en AWS Organizations?', o:['En unidades organizativas (OU)','En buckets','En subredes','En colas'], c:0},
  ],

  /* ===== Administración y gobernanza ===== */
  cloudwatch: [
    {q:'¿Qué hace Amazon CloudWatch?', o:['Monitorea métricas, logs y eventos de tus recursos','Almacena objetos','Registra dominios','Orquesta contenedores'], c:0},
    {q:'¿Qué puedes crear en CloudWatch para reaccionar a umbrales?', o:['Alarmas','Buckets','Subredes','Roles'], c:0},
    {q:'¿Qué tipo de datos recopila CloudWatch Logs?', o:['Registros (logs) de aplicaciones y servicios','Objetos binarios grandes','Claves de cifrado','Tablas SQL'], c:0},
    {q:'¿Cuál es la diferencia principal entre CloudWatch y CloudTrail?', o:['CloudWatch monitorea rendimiento; CloudTrail audita acciones de la API','Son idénticos','CloudWatch registra dominios','CloudTrail almacena objetos'], c:0},
  ],
  cloudtrail: [
    {q:'¿Qué registra AWS CloudTrail?', o:['Las llamadas a la API y la actividad de la cuenta','El rendimiento de la CPU','El tráfico de red en tiempo real','Los costos por hora'], c:0},
    {q:'¿Para qué es útil CloudTrail?', o:['Auditoría, gobernanza y cumplimiento','Entrega de contenido','Cifrado de discos','Balanceo de carga'], c:0},
    {q:'¿Qué diferencia a CloudTrail de CloudWatch?', o:['CloudTrail audita "quién hizo qué"; CloudWatch monitorea rendimiento','Son idénticos','CloudTrail almacena objetos','CloudWatch registra dominios'], c:0},
    {q:'¿Dónde puede entregar CloudTrail sus registros para almacenarlos?', o:['En un bucket de Amazon S3','En una instancia EC2 apagada','En un edge location','En un Security Group'], c:0},
  ],
  config: [
    {q:'¿Qué hace AWS Config?', o:['Evalúa y registra la configuración de tus recursos a lo largo del tiempo','Ejecuta funciones serverless','Envía notificaciones','Almacena archivos'], c:0},
    {q:'¿Para qué sirven las reglas de AWS Config?', o:['Comprobar que los recursos cumplen configuraciones deseadas','Balancear tráfico','Cifrar la red','Escalar instancias'], c:0},
    {q:'¿Qué ayuda a responder AWS Config?', o:['¿Cómo cambió la configuración de mis recursos?','¿Cuánto tráfico web recibo?','¿Qué usuario inició sesión?','¿Cuánto cuesta EC2?'], c:0},
    {q:'¿Qué registra AWS Config sobre un recurso?', o:['El historial de sus configuraciones y cambios','Su tráfico de red en vivo','Su costo por hora','Su código fuente'], c:0},
  ],
  cloudformation: [
    {q:'¿Qué permite AWS CloudFormation?', o:['Definir y aprovisionar infraestructura como código','Enviar correos','Analizar imágenes','Almacenar caché'], c:0},
    {q:'¿En qué formato se escriben las plantillas de CloudFormation?', o:['JSON o YAML','Solo binario','Solo CSV','Solo HTML'], c:0},
    {q:'¿Qué beneficio aporta la infraestructura como código?', o:['Recursos repetibles, versionables y consistentes','Mayor latencia','Menos seguridad','Costos ocultos'], c:0},
    {q:'¿Qué es un "stack" en CloudFormation?', o:['Un conjunto de recursos creados a partir de una plantilla','Una cola de mensajes','Un bucket cifrado','Un grupo de usuarios'], c:0},
  ],
  systemsmanager: [
    {q:'¿Para qué sirve AWS Systems Manager?', o:['Administrar operativamente recursos como instancias EC2 a escala','Almacenar objetos','Registrar dominios','Entrenar modelos de ML'], c:0},
    {q:'¿Qué permite hacer Systems Manager en las instancias?', o:['Ejecutar comandos, parchear y gestionar configuración','Cifrar la CDN','Crear buckets','Registrar dominios'], c:0},
    {q:'¿Qué componente de Systems Manager guarda datos de configuración y secretos?', o:['Parameter Store','Internet Gateway','Edge Location','Read Replica'], c:0},
    {q:'¿Qué significa gestionar recursos "a escala" en Systems Manager?', o:['Aplicar acciones a muchas instancias de forma centralizada','Crear una sola instancia','Registrar un dominio','Cifrar un único archivo'], c:0},
  ],
  trustedadvisor: [
    {q:'¿Qué ofrece AWS Trusted Advisor?', o:['Recomendaciones sobre costos, seguridad, rendimiento y límites','Almacenamiento de objetos','Ejecución de contenedores','Registro de dominios'], c:0},
    {q:'¿En qué categorías da recomendaciones Trusted Advisor?', o:['Costo, seguridad, tolerancia a fallos, rendimiento y límites de servicio','Solo costo','Solo seguridad','Solo rendimiento'], c:0},
    {q:'¿Trusted Advisor ayuda a optimizar la cuenta según qué marco?', o:['Buenas prácticas de AWS','El código de la aplicación','El diseño gráfico','La red doméstica'], c:0},
    {q:'¿De qué depende el número de comprobaciones de Trusted Advisor?', o:['Del plan de soporte de AWS contratado','Del color de la consola','De la región únicamente','Del navegador'], c:0},
  ],
  controltower: [
    {q:'¿Qué facilita AWS Control Tower?', o:['Configurar y gobernar un entorno multicuenta seguro','Ejecutar consultas SQL','Servir contenido estático','Cifrar volúmenes individuales'], c:0},
    {q:'¿Qué crea Control Tower para aplicar buenas prácticas?', o:['Una "landing zone" con barreras de protección (guardrails)','Un único bucket','Una función Lambda','Una tabla DynamoDB'], c:0},
    {q:'¿Sobre qué servicio se apoya Control Tower para gestionar cuentas?', o:['AWS Organizations','Amazon S3','Amazon EC2','Amazon Route 53'], c:0},
    {q:'¿Qué son los "guardrails" en Control Tower?', o:['Reglas de gobernanza que aplican políticas de seguridad y cumplimiento','Balanceadores de carga','Zonas de DNS','Tablas de base de datos'], c:0},
  ],

  /* ===== Integración de aplicaciones ===== */
  sns: [
    {q:'¿Qué modelo de mensajería usa Amazon SNS?', o:['Publicación/suscripción (pub/sub)','Solo punto a punto','Solo lotes diarios','Solo síncrono'], c:0},
    {q:'¿A qué puede enviar notificaciones SNS?', o:['Correo, SMS, colas SQS y funciones Lambda','Solo a un correo fijo','Solo a impresoras','Solo a bases de datos'], c:0},
    {q:'¿Qué significa SNS?', o:['Simple Notification Service','Secure Network System','Server Naming Service','Storage Node Service'], c:0},
    {q:'¿Cómo se llaman los canales a los que se publica en SNS?', o:['Temas (topics)','Buckets','Colas FIFO únicamente','Subredes'], c:0},
  ],
  sqs: [
    {q:'¿Qué es Amazon SQS?', o:['Un servicio de colas de mensajes administrado','Una CDN','Una base de datos relacional','Un firewall'], c:0},
    {q:'¿Qué beneficio aporta SQS a las arquitecturas?', o:['Desacoplar componentes para que funcionen de forma independiente','Aumentar el acoplamiento','Reducir la seguridad','Eliminar el almacenamiento'], c:0},
    {q:'¿Qué significa SQS?', o:['Simple Queue Service','Secure Query System','Scalable Quota Service','Server Quality Standard'], c:0},
    {q:'¿Qué tipos de colas ofrece SQS?', o:['Estándar y FIFO','Solo FIFO','Solo temporales','Solo cifradas'], c:0},
  ],
  eventbridge: [
    {q:'¿Qué es Amazon EventBridge?', o:['Un bus de eventos sin servidor para conectar aplicaciones','Un almacén de objetos','Una base de datos','Una CDN'], c:0},
    {q:'¿Qué facilita EventBridge?', o:['Enrutar eventos entre servicios AWS y aplicaciones SaaS','Cifrar discos','Balancear carga','Registrar dominios'], c:0},
    {q:'¿Con qué reglas trabaja EventBridge?', o:['Reglas que hacen coincidir eventos y los envían a destinos','Reglas de firewall de red','Políticas de respaldo','Grupos de seguridad'], c:0},
    {q:'¿EventBridge requiere administrar servidores?', o:['No, es un servicio sin servidor (serverless)','Sí, un clúster dedicado','Sí, uno por regla','Sí, en local'], c:0},
  ],
  stepfunctions: [
    {q:'¿Para qué sirve AWS Step Functions?', o:['Orquestar flujos de trabajo coordinando varios servicios','Almacenar objetos','Servir contenido','Registrar dominios'], c:0},
    {q:'¿Cómo se representan los flujos en Step Functions?', o:['Como máquinas de estados','Como buckets','Como subredes','Como tablas'], c:0},
    {q:'¿Con qué servicio se integra frecuentemente Step Functions?', o:['AWS Lambda','Amazon Glacier','AWS Shield','Amazon EFS'], c:0},
    {q:'¿Qué ventaja aporta Step Functions al coordinar servicios?', o:['Gestiona el estado, los reintentos y los errores del flujo','Almacena objetos grandes','Cifra la red','Registra dominios'], c:0},
  ],

  /* ===== Analítica ===== */
  athena: [
    {q:'¿Qué permite hacer Amazon Athena?', o:['Consultar datos en S3 usando SQL estándar','Ejecutar contenedores','Enviar correos','Cifrar volúmenes'], c:0},
    {q:'¿Qué modelo de precios tiene Athena?', o:['Pagas por los datos escaneados en cada consulta','Tarifa mensual fija','Por usuario','Siempre gratis'], c:0},
    {q:'¿Athena requiere administrar servidores?', o:['No, es un servicio sin servidor (serverless)','Sí, uno por consulta','Sí, un clúster dedicado','Sí, en tu equipo local'], c:0},
    {q:'¿Sobre qué fuente de datos consulta Athena habitualmente?', o:['Datos almacenados en Amazon S3','Tablas solo en memoria','Volúmenes EBS','Colas SQS'], c:0},
  ],
  kinesis: [
    {q:'¿Para qué se usa Amazon Kinesis?', o:['Recopilar y procesar datos de streaming en tiempo real','Archivar datos a largo plazo','Balancear carga','Registrar dominios'], c:0},
    {q:'¿Qué tipo de datos maneja Kinesis?', o:['Flujos continuos como logs, métricas y clics','Solo respaldos','Solo imágenes estáticas','Solo tablas relacionales'], c:0},
    {q:'¿Qué ventaja clave ofrece Kinesis?', o:['Procesar datos casi en tiempo real a gran escala','Almacenamiento en frío barato','Cifrado de claves','Balanceo de carga'], c:0},
    {q:'¿Qué caso de uso es típico de Kinesis?', o:['Análisis de logs y telemetría en tiempo real','Archivado a largo plazo','Registro de dominios','Balanceo de carga'], c:0},
  ],
  quicksight: [
    {q:'¿Qué es Amazon QuickSight?', o:['Un servicio de inteligencia de negocios (BI) y paneles','Una base de datos','Una CDN','Un firewall'], c:0},
    {q:'¿Qué permite crear QuickSight?', o:['Visualizaciones y paneles interactivos a partir de tus datos','Instancias EC2','Buckets S3','Roles IAM'], c:0},
    {q:'¿Qué modelo de precios ofrece QuickSight?', o:['Pago por sesión o por usuario','Solo licencia perpetua','Siempre gratis','Por gigabyte almacenado únicamente'], c:0},
    {q:'¿QuickSight requiere administrar servidores?', o:['No, es un servicio de BI administrado y sin servidor','Sí, un clúster propio','Sí, uno por panel','Sí, en local'], c:0},
  ],

  /* ===== Inteligencia artificial / ML ===== */
  sagemaker: [
    {q:'¿Para qué sirve Amazon SageMaker?', o:['Crear, entrenar e implementar modelos de machine learning','Almacenar objetos','Registrar dominios','Balancear carga'], c:0},
    {q:'¿A quién está dirigido SageMaker?', o:['Desarrolladores y científicos de datos','Solo administradores de red','Solo diseñadores gráficos','Solo contadores'], c:0},
    {q:'¿Qué abarca SageMaker en el ciclo de ML?', o:['Desde la preparación de datos hasta el despliegue del modelo','Solo la facturación','Solo el almacenamiento','Solo la red'], c:0},
    {q:'¿SageMaker es un servicio administrado?', o:['Sí, administra la infraestructura de entrenamiento e inferencia','No, montas tú los servidores','Solo funciona en local','Solo en móviles'], c:0},
  ],
  rekognition: [
    {q:'¿Qué hace Amazon Rekognition?', o:['Analiza imágenes y videos (detección de objetos, rostros, texto)','Ejecuta consultas SQL','Envía notificaciones','Registra dominios'], c:0},
    {q:'¿Qué tecnología aplica Rekognition?', o:['Visión por computadora basada en aprendizaje profundo','Balanceo de carga','Cifrado de claves','Enrutamiento DNS'], c:0},
    {q:'¿Un caso de uso típico de Rekognition es?', o:['Moderación de contenido y análisis facial','Respaldo de bases de datos','Orquestación de contenedores','Registro de dominios'], c:0},
    {q:'¿Rekognition requiere experiencia previa en machine learning?', o:['No, ofrece análisis mediante una API sencilla','Sí, debes entrenar todo desde cero','Sí, requiere hardware especializado propio','Solo funciona en local'], c:0},
  ],
  polly: [
    {q:'¿Qué hace Amazon Polly?', o:['Convierte texto en voz realista (text-to-speech)','Convierte voz en texto','Analiza imágenes','Traduce documentos'], c:0},
    {q:'¿Qué genera Polly como salida?', o:['Audio hablado a partir de texto','Tablas SQL','Objetos cifrados','Paneles de BI'], c:0},
    {q:'¿Un caso de uso de Polly es?', o:['Crear narraciones y asistentes de voz','Balancear carga de red','Detectar amenazas','Respaldar volúmenes'], c:0},
    {q:'¿Qué tecnología usa Polly para sonar natural?', o:['Aprendizaje profundo (voces neuronales)','Grabaciones humanas manuales','Balanceo de carga','Cifrado de claves'], c:0},
  ],

  /* ===== Herramientas de desarrollo ===== */
  codecommit: [
    {q:'¿Qué es AWS CodeCommit?', o:['Un servicio de repositorios Git administrados y privados','Un almacén de objetos','Una base de datos','Una CDN'], c:0},
    {q:'¿Con qué sistema de control de versiones es compatible CodeCommit?', o:['Git','Subversion únicamente','Mercurial únicamente','Ninguno'], c:0},
    {q:'¿Qué ventaja ofrece CodeCommit?', o:['Alojar código de forma segura sin administrar servidores propios','Entrenar modelos de ML','Servir contenido de video','Registrar dominios'], c:0},
    {q:'¿Dónde se alojan los repositorios de CodeCommit?', o:['En AWS, de forma administrada y escalable','En tu equipo local únicamente','En Glacier','En una VPC sin salida'], c:0},
  ],
  codepipeline: [
    {q:'¿Para qué sirve AWS CodePipeline?', o:['Automatizar procesos de integración y entrega continua (CI/CD)','Almacenar objetos','Detectar amenazas','Registrar dominios'], c:0},
    {q:'¿Qué automatiza una canalización (pipeline) de CodePipeline?', o:['Las fases de build, prueba y despliegue del software','El diseño gráfico','La facturación','La configuración de red doméstica'], c:0},
    {q:'¿Con qué servicios se integra CodePipeline?', o:['CodeCommit, CodeBuild y CodeDeploy, entre otros','Solo con S3','Solo con Route 53','Solo con KMS'], c:0},
    {q:'¿Qué representa cada "etapa" (stage) en CodePipeline?', o:['Una fase del flujo, como build o despliegue','Un bucket','Una subred','Un usuario IAM'], c:0},
  ],

  /* ===== Migración y transferencia ===== */
  snow: [
    {q:'¿Para qué sirve AWS Snow Family?', o:['Transferir grandes volúmenes de datos físicamente a AWS','Ejecutar contenedores','Enviar correos','Balancear carga'], c:0},
    {q:'¿Cuándo conviene usar dispositivos Snow?', o:['Cuando el traslado por red sería demasiado lento o costoso','Cuando hay muy pocos datos','Para consultas SQL','Para registrar dominios'], c:0},
    {q:'¿Qué son los dispositivos de Snow Family?', o:['Dispositivos físicos robustos para migración y edge computing','Máquinas virtuales','Bases de datos NoSQL','Balanceadores de carga'], c:0},
    {q:'¿Qué caso de uso adicional tienen algunos dispositivos Snow?', o:['Cómputo y procesamiento en el borde (edge)','Registrar dominios','Balancear carga web','Servir una CDN'], c:0},
  ],
  dms: [
    {q:'¿Qué hace AWS DMS (Database Migration Service)?', o:['Migra bases de datos a AWS con mínima interrupción','Almacena objetos','Analiza imágenes','Registra dominios'], c:0},
    {q:'¿Qué tipo de migraciones soporta DMS?', o:['Homogéneas y heterogéneas (entre distintos motores)','Solo del mismo motor','Solo de archivos de texto','Solo de imágenes'], c:0},
    {q:'¿Qué ventaja ofrece DMS durante la migración?', o:['La base de datos de origen puede seguir operativa','Requiere apagar todo el sistema','Elimina los datos de origen siempre','No admite bases relacionales'], c:0},
    {q:'¿Qué significa la sigla DMS?', o:['Database Migration Service','Data Monitoring System','Dynamic Memory Store','Distributed Message Service'], c:0},
  ],

  /* ===== Facturación y gestión de costos ===== */
  costexplorer: [
    {q:'¿Qué permite AWS Cost Explorer?', o:['Visualizar y analizar tus costos y uso a lo largo del tiempo','Ejecutar contenedores','Cifrar volúmenes','Registrar dominios'], c:0},
    {q:'¿Qué ayuda a identificar Cost Explorer?', o:['Tendencias de gasto y oportunidades de ahorro','Amenazas de seguridad','Errores de código','Latencia de red'], c:0},
    {q:'¿Cost Explorer puede hacer previsiones (forecast) de costos?', o:['Sí, estima el gasto futuro según el histórico','No, solo muestra el pasado','Solo con soporte Enterprise','Solo para EC2'], c:0},
    {q:'¿En qué formato presenta Cost Explorer la información?', o:['Gráficos y reportes de costos y uso','Solo texto plano','Solo alarmas','Solo correos'], c:0},
  ],
  budgets: [
    {q:'¿Para qué sirve AWS Budgets?', o:['Definir presupuestos y recibir alertas cuando se superan','Almacenar objetos','Balancear carga','Analizar imágenes'], c:0},
    {q:'¿Qué puede monitorear AWS Budgets?', o:['Costos y uso frente a un límite definido','El tráfico web','La salud del hardware','El código fuente'], c:0},
    {q:'¿Qué hace Budgets al alcanzar un umbral?', o:['Envía una notificación de alerta','Apaga la cuenta','Borra los recursos','Cifra los datos'], c:0},
    {q:'¿Qué tipos de presupuesto se pueden crear en AWS Budgets?', o:['De costo, de uso y de cobertura de reservas','Solo de usuarios','Solo de red','Solo de almacenamiento'], c:0},
  ],
  pricingcalculator: [
    {q:'¿Qué permite AWS Pricing Calculator?', o:['Estimar el costo de una solución antes de implementarla','Cifrar datos','Ejecutar consultas SQL','Detectar amenazas'], c:0},
    {q:'¿Cuándo es más útil Pricing Calculator?', o:['Al planificar y presupuestar arquitecturas','Al detectar intrusiones','Al balancear carga','Al registrar dominios'], c:0},
    {q:'¿Pricing Calculator refleja costos reales ya facturados?', o:['No, genera estimaciones previas al uso','Sí, es la factura final','Solo para EC2','Solo con soporte'], c:0},
    {q:'¿AWS Pricing Calculator tiene costo?', o:['No, es una herramienta gratuita','Sí, tarifa mensual','Sí, por estimación','Solo con soporte Enterprise'], c:0},
  ],
};

export const BOSS_NAMES = [
  'Centinela de Cómputo',
  'Custodio de Datos',
  'Arquitecto de Redes',
  'Guardián de la Seguridad',
  'Vigía de la Observabilidad',
  'Heraldo de la Integración',
  'Oráculo de la Analítica',
  'Sabio del Aprendizaje',
  'Forjador del Despliegue',
  'Nómada de la Migración',
  'Tesorero de los Costos',
  'Señor de la Nube',
];

export function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
export function pickQuestion(serviceId, avoidText){
  const pool = QUESTIONS[serviceId];
  let pick = pool[Math.floor(Math.random()*pool.length)];
  if(pool.length>1 && avoidText){
    let tries=0;
    while(pick.q===avoidText && tries<8){ pick = pool[Math.floor(Math.random()*pool.length)]; tries++; }
  }
  // build shuffled options with tracked correct index
  const optionIdx = [0,1,2,3];
  const order = shuffle(optionIdx);
  const options = order.map(i=>pick.o[i]);
  const correct = order.indexOf(pick.c);
  return {text:pick.q, options, correct};
}

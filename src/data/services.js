/* ===== DATA: servicios AWS y banco de preguntas ===== */
export const AWS_SERVICES = [
  {id:'ec2', abbr:'EC2', name:'Amazon EC2', color:'#ff9f2e'},
  {id:'s3', abbr:'S3', name:'Amazon S3', color:'#57b46b'},
  {id:'lambda', abbr:'λ', name:'AWS Lambda', color:'#b287ff'},
  {id:'dynamodb', abbr:'DDB', name:'Amazon DynamoDB', color:'#4aa3ff'},
  {id:'vpc', abbr:'VPC', name:'Amazon VPC', color:'#9b8bff'},
  {id:'iam', abbr:'IAM', name:'AWS IAM', color:'#ff6b61'},
];

export const QUESTIONS = {
  ec2: [
    {q:'¿Qué tipo de recurso es Amazon EC2?', o:['Una instancia de servidor virtual','Una base de datos administrada','Un sistema de archivos compartido','Un servicio de mensajería'], c:0},
    {q:'¿Qué significa la sigla EC2?', o:['Elastic Compute Cloud','Elastic Container Cluster','Enhanced Compute Center','External Cloud Connector'], c:0},
    {q:'¿Para qué sirve el "Auto Scaling" en EC2?', o:['Ajustar el número de instancias según la demanda','Cifrar discos automáticamente','Enrutar dominios','Facturar por segundo'], c:0},
    {q:'¿Qué es una AMI en EC2?', o:['Una imagen preconfigurada para lanzar instancias','Un tipo de balanceador de carga','Un protocolo de red','Una base de datos NoSQL'], c:0},
  ],
  s3: [
    {q:'¿Para qué se usa Amazon S3 principalmente?', o:['Almacenamiento de objetos','Cómputo serverless','Bases de datos relacionales','Redes privadas virtuales'], c:0},
    {q:'¿Qué significa la sigla S3?', o:['Simple Storage Service','Secure Server System','Scalable Software Solution','Storage Security Suite'], c:0},
    {q:'¿Cómo se organiza el contenido dentro de S3?', o:['En buckets y objetos','En tablas y filas','En VPCs y subredes','En funciones y capas'], c:0},
    {q:'¿Qué clase de almacenamiento de S3 es más económica para datos poco accedidos?', o:['S3 Glacier','S3 Standard','S3 Intelligent-Tiering estándar','S3 Express'], c:0},
  ],
  lambda: [
    {q:'AWS Lambda es un servicio de:', o:['Cómputo sin servidor (serverless)','Almacenamiento en frío','Red de entrega de contenido','Directorio de usuarios'], c:0},
    {q:'¿Qué suele disparar (trigger) una función Lambda?', o:['Eventos como cambios en S3 o solicitudes API','Solo el reloj del sistema operativo','Únicamente clics de mouse','Cambios manuales del DNS'], c:0},
    {q:'¿Cuál es una ventaja clave de Lambda?', o:['Solo pagas por el tiempo de ejecución usado','Debes administrar servidores manualmente','Requiere licencias anuales','Corre solo en tu computadora local'], c:0},
    {q:'¿Cuál es aproximadamente el tiempo máximo de ejecución de una función Lambda?', o:['15 minutos','24 horas','5 segundos','Ilimitado'], c:0},
  ],
  dynamodb: [
    {q:'Amazon DynamoDB es una base de datos:', o:['NoSQL administrada','Relacional SQL','En memoria caché únicamente','De archivos planos'], c:0},
    {q:'¿Qué caracteriza a DynamoDB?', o:['Baja latencia y escalabilidad automática','Requiere servidores propios','Solo almacena imágenes','Es un servicio de correo'], c:0},
    {q:'¿Qué es una "partition key" en DynamoDB?', o:['El atributo que determina cómo se distribuyen los datos','Un índice secundario obligatorio','Una contraseña de acceso','Un backup automático'], c:0},
    {q:'¿Qué modelos de facturación ofrece DynamoDB?', o:['Bajo demanda o capacidad aprovisionada','Solo licencia anual fija','Siempre gratis','Pago por empleado'], c:0},
  ],
  vpc: [
    {q:'¿Qué es una Amazon VPC?', o:['Una red virtual privada y aislada dentro de AWS','Un tipo de base de datos','Un servicio de correo electrónico','Una función serverless'], c:0},
    {q:'¿Qué componente conecta una VPC a internet?', o:['Un Internet Gateway','Una Lambda Layer','Un DynamoDB Stream','Un IAM Role'], c:0},
    {q:'¿Qué es una subred (subnet) pública?', o:['Una subred con ruta hacia un Internet Gateway','Una subred sin ningún acceso','Una base de datos compartida','Un grupo de usuarios IAM'], c:0},
    {q:'¿Qué controla un "Security Group" en una VPC?', o:['El tráfico entrante y saliente de las instancias','El precio de las instancias','El idioma de la consola','El nombre del dominio'], c:0},
  ],
  iam: [
    {q:'AWS IAM se usa para:', o:['Gestionar usuarios, roles y permisos','Almacenar archivos','Ejecutar código serverless','Enviar correos masivos'], c:0},
    {q:'¿Qué es una "policy" en IAM?', o:['Un documento que define permisos','Un servidor virtual','Una base de datos','Un balanceador de carga'], c:0},
    {q:'¿Qué principio de seguridad recomienda aplicar IAM?', o:['Otorgar el mínimo privilegio necesario','Dar acceso total a todos los usuarios','Compartir una sola contraseña para todos','Deshabilitar el cifrado'], c:0},
    {q:'¿Qué permite hacer un "IAM Role"?', o:['Otorgar permisos temporales sin credenciales fijas','Almacenar datos en la nube','Enviar notificaciones push','Escalar instancias EC2 automáticamente'], c:0},
  ],
};

export const BOSS_NAMES = ['Centinela de Cómputo','Custodio de Datos','Arquitecto de Redes','Señor de la Nube'];

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

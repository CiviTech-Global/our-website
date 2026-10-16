import type { HelpArticleText } from '../../types';

const freelance: Record<string, HelpArticleText> = {
  projects: {
    title: 'Proyectos freelance',
    summary: 'Proyectos a precio fijo y por horas de clientes verificados: encuentre uno, envíe una propuesta y lleve el trabajo adelante.',
    intro:
      'Aquí los clientes publican proyectos y los freelancers les envían propuestas. Cada proyecto se revisa antes de publicarse y puede ser a precio fijo o por horas. Cualquiera puede ver los proyectos, pero para publicar uno o enviar una propuesta debe iniciar sesión y completar la verificación de identidad. El pago no pasa por el sitio; cliente y freelancer lo acuerdan directamente.',
    steps: [
      ['Encuentre un proyecto', 'Busque en títulos, descripciones o habilidades; ordene y filtre por categoría, tipo de precio, nivel de experiencia o menos propuestas.'],
      ['Lea el proyecto', 'Vea el presupuesto, la duración, las habilidades y el historial del cliente (verificado, tasa de contratación y valoración).'],
      ['Envíe una propuesta', 'Indique su precio o tarifa por hora, el plazo y un plan por hitos, y responda a las preguntas del cliente.'],
      ['Lleve el trabajo adelante', 'Si le contratan, la colaboración se abre en Mis colaboraciones; la conversación y los hitos siguen en su panel.'],
    ],
    points: [
      ['Precio fijo o por horas', 'En los proyectos por horas registra sus horas y el cliente las aprueba.'],
      ['Pagos por hitos', 'Divida el trabajo en hitos con importe y plazo; su suma debe igualar su propuesta.'],
      ['NDA', 'Algunos proyectos exigen firmar un acuerdo de confidencialidad antes de leer la descripción y los adjuntos.'],
      ['Visibilidad del proyecto', 'Un proyecto puede ser visible para todos, solo para miembros o solo para freelancers invitados.'],
    ],
    tips: [
      ['Cree una alerta de proyectos', 'Cree una alerta para su búsqueda y no se pierda los proyectos nuevos que encajen.'],
    ],
    faqs: [
      ['¿El sitio guarda el dinero o gestiona el pago?', 'No. El pago no pasa por el sitio; cliente y freelancer acuerdan el importe y el medio directamente. El plan por hitos ayuda a que el acuerdo quede claro.'],
      ['¿Por qué se exige verificación?', 'Para publicar un proyecto, enviar una propuesta o firmar un NDA. Ambas partes saben que tratan con una persona real.'],
      ['¿Cuándo se publicará mi proyecto?', 'Tras enviarlo a revisión, normalmente en pocas horas.'],
      ['¿Cuántas propuestas puedo enviar?', 'Una por proyecto; puede retirarla antes de que el cliente decida.'],
    ],
    related: {
      'project-detail': 'La página de cada proyecto y el formulario de propuesta.',
      'client-projects': 'Para clientes: publicar y gestionar proyectos.',
      'my-proposals': 'Para freelancers: propuestas, invitaciones y colaboraciones.',
      freelancers: 'Freelancers a los que puede invitar a su proyecto.',
    },
  },

  'project-detail': {
    title: 'La página de un proyecto',
    summary: 'Los detalles de un proyecto, el historial del cliente y el formulario de propuesta.',
    intro:
      'Cada página de proyecto muestra la descripción, el presupuesto o rango de tarifa por hora, la duración, el nivel de experiencia buscado, las habilidades y el historial del cliente. Si el proyecto exige un NDA, la descripción completa y los adjuntos se abren al firmarlo. Si el cliente le ha invitado, aparece la etiqueta Invitado.',
    steps: [
      ['Lea y decida', 'Mire el presupuesto, la duración y las preguntas del cliente antes de escribir una propuesta.'],
      ['Firme el NDA si hace falta', 'Escriba su nombre como firma para abrir la descripción y los archivos.'],
      ['Redacte su propuesta', 'Su precio o tarifa por hora, un plan por hitos, el plazo y las respuestas a las preguntas.'],
      ['Espere la respuesta', 'Vea el estado de la propuesta en Mis propuestas; los mensajes del cliente llegan a Mensajes.'],
    ],
    tips: [
      ['Una propuesta para este proyecto', 'Trate el problema de este proyecto y responda con precisión a las preguntas del cliente; las propuestas genéricas se eligen menos.'],
    ],
    faqs: [
      ['¿A qué me compromete firmar el NDA?', 'A mantener en confidencialidad la descripción del proyecto, los adjuntos y todo lo que el cliente le cuente sobre él.'],
      ['¿Puedo rechazar una invitación?', 'Sí, con Rechazar invitación. Se informa al cliente.'],
      ['¿Qué pasa si se cierra el proyecto?', 'Un proyecto cerrado no admite propuestas nuevas; las anteriores siguen en su lista.'],
    ],
    related: {
      projects: 'Volver a todos los proyectos.',
      'my-proposals': 'Las propuestas que ha enviado.',
      verification: 'Necesaria antes de enviar una propuesta.',
      messages: 'Hablar con el cliente.',
    },
  },

  'freelance-services': {
    title: 'Servicios freelance',
    summary: 'Trabajo listo a precio fijo: elija un paquete y haga el pedido.',
    intro:
      'Los servicios freelance funcionan al revés que los proyectos: un freelancer ofrece lo que hace con precio y plazo fijos, y usted hace el pedido. Cada servicio puede tener hasta tres paquetes: Básico, Estándar y Premium. Cada servicio se revisa antes de publicarse.',
    steps: [
      ['Encuentre un servicio', 'Busque y ordene por categoría, precio o valoración.'],
      ['Elija un paquete', 'Compare qué incluye cada paquete y cuánto tarda la entrega.'],
      ['Haga el pedido', 'Con la sesión iniciada y verificado, envíe el pedido describiendo lo que necesita.'],
      ['Espere al vendedor', 'El vendedor acepta o rechaza el pedido; siga su estado en Pedidos de su panel.'],
    ],
    faqs: [
      ['¿Cómo se paga?', 'No a través del sitio; una vez aceptado el pedido, comprador y vendedor lo acuerdan directamente.'],
      ['¿En qué se diferencia un servicio de un proyecto?', 'En un proyecto usted describe el trabajo y recibe propuestas; en un servicio, el freelancer ofrece un trabajo listo a precio fijo.'],
      ['¿Cómo ofrezco mi propio servicio?', 'Créelo en Mis servicios de su panel y envíelo a revisión.'],
    ],
    related: {
      'my-services': 'Para vendedores: crear servicios y gestionar pedidos.',
      freelancers: 'Los perfiles de los vendedores.',
      projects: 'Si lo que necesita no existe ya hecho y hay que describirlo, publique un proyecto.',
    },
  },

  freelancers: {
    title: 'Freelancers y perfiles',
    summary: 'Encuentre freelancers por habilidad, idioma y disponibilidad, lea sus perfiles e invítelos.',
    intro:
      'El directorio de freelancers muestra los perfiles públicos de los miembros con nombre de usuario que indican habilidades en su perfil u ofrecen un servicio activo y aprobado: habilidades, idiomas, país, disponibilidad, valoraciones y muestras de trabajo. Los datos de contacto nunca aparecen en el directorio.',
    steps: [
      ['Busque', 'Filtre por habilidad, categoría, idioma, país, disponibilidad o verificación, y ordene por valoración.'],
      ['Lea un perfil', 'Insignia de verificación, valoraciones, muestras de trabajo y servicios que ofrece.'],
      ['Invite', 'Los clientes pueden invitar a un freelancer por su nombre de usuario a enviar una propuesta para su proyecto.'],
    ],
    faqs: [
      ['¿Cómo aparezco en este directorio?', 'Elija un nombre de usuario y añada sus habilidades en su panel, u ofrezca un servicio que se apruebe. Las muestras de trabajo hacen más probable una invitación.'],
      ['¿Qué significa la insignia de verificación?', 'Que nuestro equipo ha verificado la identidad de este miembro.'],
      ['¿De dónde salen las valoraciones?', 'De las personas que valoraron a este miembro al terminar una colaboración.'],
    ],
    related: {
      profile: 'Crear y editar su propio perfil público.',
      'freelance-services': 'Los servicios que ofrecen los freelancers.',
      projects: 'Proyectos a los que puede enviar propuestas.',
    },
  },
};

export default freelance;

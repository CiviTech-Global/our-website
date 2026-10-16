import type { HelpArticleText } from '../../types';

const company: Record<string, HelpArticleText> = {
  home: {
    title: 'Inicio',
    summary: 'El punto de partida del sitio: quién es Rayan Tamaddon Jahan Gostar, qué construimos y adónde puede ir desde aquí.',
    heading: 'Empiece aquí',
    intro:
      'Rayan Tamaddon Jahan Gostar es una empresa de ingeniería de software que crea software a medida, aplicaciones web y móviles, plataformas empresariales y soluciones de análisis de datos. Además de presentar la empresa, este sitio reúne varios servicios: solicitudes de proyectos de software, solicitudes de seguros en línea, consultoría con expertos, ofertas de empleo, proyectos freelance y un mercado de libros. Cada uno tiene su guía, y todas están reunidas en el centro de ayuda.',
    steps: [
      ['Diga qué busca', 'Para encargar software, vaya a Servicios o directamente a Iniciar un proyecto; para seguros, a Seguros; para trabajo o un proyecto, al Mercado.'],
      ['Abra la guía de cada página', 'En cada página, el botón Guía de la barra superior (o la tecla ?) abre al lado la explicación de esa página.'],
      ['Envíe una solicitud y guarde el código', 'Cada solicitud tiene un código de seguimiento; con él, Seguimiento de solicitud muestra en qué punto está.'],
      ['Con una cuenta, todo está en su panel', 'Con la sesión iniciada, sus códigos de seguimiento, mensajes y actividad en el mercado quedan juntos en su panel.'],
    ],
    points: [
      ['Desarrollo de software', 'De la idea a la puesta en producción y el mantenimiento, con estimación de costes y propuesta técnica gratuitas y sin compromiso.'],
      ['Servicios complementarios', 'Solicitudes en línea para muchos tipos de seguro, con un formulario por producto, y consultoría técnica y profesional con expertos.'],
      ['Mercado', 'Ofertas de empleo y proyectos freelance, cada uno revisado antes de publicarse, y un mercado de libros entre miembros.'],
      ['Seis idiomas', 'El sitio está en persa, inglés, turco, alemán, francés y español; cambie de idioma desde la barra superior.'],
    ],
    faqs: [
      ['¿Qué hace exactamente Rayan Tamaddon Jahan Gostar?', 'Diseño y desarrollo de software a medida, aplicaciones web y móviles, plataformas empresariales y de tecnología cívica, y análisis y visualización de datos. Gran parte de nuestro trabajo es de código abierto.'],
      ['¿Qué relación hay entre CiviTech Global y Rayan Tamaddon Jahan Gostar?', 'CiviTech Global es la marca internacional de Rayan Tamaddon Jahan Gostar: una sola empresa, un solo equipo.'],
      ['¿Necesito registrarme para usar el sitio?', 'No para solicitar un proyecto, un seguro o una consulta, enviar un CV o contactarnos. Necesita una cuenta para publicar un anuncio, ofertar en un proyecto o vender un libro.'],
      ['¿Cómo sé en qué punto está mi solicitud?', 'Con el código de seguimiento que recibió al enviarla, en Seguimiento de solicitud. Si tenía la sesión iniciada, el código también se guarda en Mis solicitudes.'],
      ['¿Tiene el sitio un sello de confianza?', 'Sí. El sello de confianza de comercio electrónico ENAMAD aparece al pie de cada página.'],
    ],
    related: {
      services: 'La lista completa de servicios de desarrollo y cómo se desarrolla un proyecto.',
      'start-project': 'El camino más corto a una propuesta técnica y una estimación gratuitas.',
      about: 'La misión, la visión y los valores detrás de nuestro trabajo.',
      'help-centre': 'Todas las guías en un solo lugar, con buscador.',
    },
  },

  services: {
    title: 'Servicios de diseño y desarrollo de software',
    summary: 'Qué construimos, las etapas de cada proyecto y nuestros servicios complementarios de un vistazo.',
    intro:
      'Esta página presenta nuestros cuatro servicios principales: desarrollo inteligente de software a medida, desarrollo de aplicaciones web y móviles, plataformas empresariales y de tecnología cívica, y análisis y visualización de datos. Todo proyecto, sea cual sea su tamaño, pasa por cuatro etapas: idea y consultoría, análisis y diseño, desarrollo y pruebas, y puesta en producción y soporte. Los servicios de seguros figuran en la misma página como servicio complementario.',
    steps: [
      ['Encuentre el servicio adecuado', 'Lea las tarjetas; si su necesidad abarca varios, no hay problema: lo describe todo en la solicitud de proyecto.'],
      ['Vea las etapas', 'La sección «Cómo se desarrolla un proyecto» muestra qué ocurre desde su solicitud hasta la entrega y el soporte.'],
      ['Envíe una solicitud de proyecto', 'El botón Iniciar un proyecto abre el formulario; la propuesta técnica y la estimación son gratuitas.'],
    ],
    points: [
      ['Una propuesta escrita antes de cualquier compromiso', 'Ve el alcance, los entregables, los supuestos, las exclusiones, el calendario y el rango de precios antes de empezar.'],
      ['Desarrollo por etapas', 'El software se construye en iteraciones cortas y visibles para que vea el avance y opine en cada paso.'],
      ['Código abierto, sin dependencias', 'Construido sobre estándares abiertos y tecnología de código abierto, para que su software siga siendo libre de ampliar.'],
      ['A su lado tras la entrega', 'Mantenimiento, actualizaciones y soporte técnico después del lanzamiento.'],
    ],
    faqs: [
      ['¿Aceptan proyectos pequeños?', 'Sí. El tamaño no es nuestro criterio; si algo queda fuera de nuestra especialidad, lo decimos con honestidad desde el principio.'],
      ['¿Cómo conozco el coste?', 'Tras su solicitud recibe una propuesta escrita con un rango de precios. Revisarla y redactar la propuesta no cuesta nada.'],
      ['¿Cuánto tarda?', 'Depende del alcance. El calendario detallado forma parte de la propuesta escrita, y lo ve antes de empezar.'],
      ['¿Pueden rehacer o mantener un software que ya tengo?', 'Sí. «Rehacer o modernizar un software existente» y «Mantenimiento y soporte» son tipos de proyecto del formulario.'],
      ['¿Puedo hablar con alguien antes de enviar una solicitud?', 'Sí. Pida una conversación técnica en la página Asesoría; una consulta no le compromete a nada.'],
    ],
    related: {
      'start-project': 'El formulario: el siguiente paso tras elegir un servicio.',
      portfolio: 'Ejemplos de lo que hemos construido y la tecnología utilizada.',
      consult: 'Si aún no sabe qué necesita, hablémoslo primero.',
      insurance: 'Nuestro servicio complementario: solicitudes de seguros en línea.',
    },
  },

  'start-project': {
    title: 'Solicitud de proyecto de software',
    summary: 'Describa lo que necesita y reciba una propuesta técnica, un calendario y un rango de precios, gratis y sin compromiso.',
    intro:
      'Este formulario convierte su solicitud en una propuesta formal. Cuanto más claramente describa la necesidad, los objetivos, las limitaciones y el presupuesto, más precisa será la propuesta. Tras enviarla recibe un código de seguimiento; nuestros especialistas revisan la solicitud, preguntan lo que no esté claro y, por último, envían una propuesta escrita que usted lee con el mismo código y acepta o rechaza.',
    steps: [
      ['Preséntese', 'Nombre, correo y teléfono son obligatorios. Correo y teléfono juntos son su identidad; indique los mismos en solicitudes posteriores.'],
      ['Describa el proyecto', 'Elija el título, el tipo de proyecto, el modelo de colaboración y las plataformas, y explique con sus palabras qué no funciona hoy y qué espera.'],
      ['Indique plazos y presupuesto', 'Dé un rango de presupuesto, no una cifra exacta. Si no tiene un presupuesto definido, elija esa opción.'],
      ['Adjunte documentos', 'Hasta 8 archivos (10 MB cada uno, 25 MB en total). Si necesita un acuerdo de confidencialidad antes de la revisión, marque la opción NDA.'],
      ['Guarde el código de seguimiento', 'Copie el código tras enviar. Con él lee la propuesta en Seguimiento de solicitud.'],
    ],
    points: [
      ['Una propuesta formal y gratuita', 'Alcance, entregables, supuestos, lo que no se incluye, calendario y rango de precios.'],
      ['Sin compromiso hasta aceptarla', 'Hasta que acepte la propuesta no se compromete a nada; si la rechaza, ahí termina todo.'],
      ['Confidencialidad', 'Lo que envía se queda con nosotros, y si lo necesita se firma un NDA antes de la revisión.'],
    ],
    tips: [
      ['No deje vacío «Fuera del alcance»', 'Saber desde el principio lo que no quiere hace la propuesta más precisa y el precio más realista.'],
      ['¿Por qué un rango de presupuesto?', 'En esta fase, una estimación de software tiene una precisión aproximada de −25 % a +75 %; un rango es más realista que una cifra para ambas partes.'],
      ['Inicie sesión para no perder el código', 'Si inicia sesión antes de enviar, el código se guarda automáticamente en Mis solicitudes.'],
    ],
    faqs: [
      ['¿La revisión y la propuesta son gratuitas?', 'Sí. Ambas son gratuitas.'],
      ['¿Cuándo estará lista la propuesta?', 'Depende de la complejidad. Consulte el estado cuando quiera con su código; si tenemos preguntas, las hacemos antes de redactar la propuesta.'],
      ['¿Qué pasa si rechazo la propuesta?', 'Nada; la rechaza y ya está. Lo que envió se queda con nosotros y no llega a nadie más.'],
      ['He perdido mi código de seguimiento.', 'Si tenía la sesión iniciada, está en Mis solicitudes. Si no, escriba desde Contacto con el mismo correo y teléfono.'],
      ['No sé qué tipo de proyecto elegir.', 'Elija el más parecido, u Otros, y explíquelo en la descripción; lo corregimos durante la revisión.'],
    ],
    related: {
      services: 'Si aún no sabe qué servicio le conviene.',
      track: 'Donde lee la propuesta con su código y la acepta o rechaza.',
      'my-requests': 'Para miembros: todos sus códigos en una lista.',
      consult: 'Una conversación técnica antes de enviar, sin compromiso.',
    },
  },

  about: {
    title: 'Acerca de',
    summary: 'Quién es Rayan Tamaddon Jahan Gostar: misión, visión, valores y lo que hacemos.',
    intro:
      'Esta página presenta la empresa: nuestra misión es ayudar a la civilización a sacar cada día más partido de la tecnología, creando software a medida y de código abierto para personas, empresas y organizaciones. Nuestra visión es una civilización plenamente inteligente, y en el camino queremos ser un hogar para la ingeniería de código abierto y para la próxima generación de ingenieros.',
    points: [
      ['Misión y visión', 'Por qué hacemos esto y adónde queremos llegar.'],
      ['Valores', 'Innovación, transparencia, comunidad y excelencia, y lo que significan en el día a día.'],
      ['Conózcanos', 'Enlaces al equipo, los proyectos, los clientes, los socios y el blog.'],
    ],
    faqs: [
      ['¿Qué es CiviTech Global?', 'La marca internacional de Rayan Tamaddon Jahan Gostar.'],
      ['¿Por qué código abierto?', 'El código es transparente y auditable, no depende de ningún proveedor, una amplia comunidad pone a prueba su seguridad y cuesta menos mantenerlo.'],
      ['¿Cómo puedo trabajar con ustedes?', 'Para un proyecto, Iniciar un proyecto; para un empleo, Enviar tu CV; para unas prácticas, Voluntariado y prácticas.'],
    ],
    related: {
      team: 'Las personas que hacen el trabajo y cómo trabajan.',
      portfolio: 'Lo que hemos construido hasta ahora.',
      customers: 'Las organizaciones cuyo software hemos construido.',
      join: 'Si quiere formar parte de este equipo.',
    },
  },

  team: {
    title: 'Nuestro equipo',
    summary: 'Los ingenieros, diseñadores y colaboradores que construyen esta plataforma y los proyectos de nuestros clientes.',
    heading: 'Cómo trabaja nuestro equipo',
    intro:
      'Detrás de cada proyecto hay un grupo de ingenieros de software que revisan el trabajo de los demás, dejan las decisiones por escrito y responden por el trabajo desde el primer mensaje hasta la entrega. Rayan Tamaddon Jahan Gostar se basa en el código abierto, en la colaboración con una comunidad mundial de ingenieros y en una puerta abierta para quienes empiezan. Esto es lo que significa en el día a día.',
    points: [
      ['Código revisado y probado', 'Cada cambio lo lee otro ingeniero y queda cubierto por pruebas antes de publicarse. El objetivo es un código que funcione durante años, no solo el día de la entrega.'],
      ['Decisiones por escrito', 'El alcance, los supuestos, lo que no está incluido, el calendario y el rango de precio figuran en una propuesta escrita. Lo que no está escrito no está acordado.'],
      ['Accesible desde el primer día', 'Lo que construimos funciona con teclado y lector de pantalla, y se abre en un teléfono económico. Es una decisión, no una función secundaria.'],
      ['Código abierto, puerta abierta', 'Parte de nuestro trabajo se hace en proyectos de código abierto junto a una comunidad mundial, y el programa de voluntariado y prácticas da a quienes empiezan la posibilidad de trabajar en proyectos reales.'],
    ],
    faqTitle: 'Preguntas frecuentes sobre el equipo',
    faqs: [
      ['¿Cómo puedo unirme al equipo?', 'Envíe su CV desde la página «Enviar tu CV». Lo leemos y le contactamos en cuanto se abra un puesto acorde con su experiencia.'],
      ['Estoy empezando. ¿Hay sitio para mí?', 'Sí. El programa «Voluntariado y prácticas» existe precisamente para eso: proyectos reales, junto a ingenieros con experiencia.'],
      ['¿Qué relación hay entre CiviTech Global y Rayan Tamaddon Jahan Gostar?', 'CiviTech Global es la marca internacional de Rayan Tamaddon Jahan Gostar: una sola empresa, un solo equipo.'],
      ['¿Cómo inicio un proyecto con este equipo?', 'Envíe su solicitud desde la página «Iniciar un proyecto». Recibe un código de seguimiento y se prepara para usted una propuesta escrita, gratuita y sin compromiso.'],
    ],
    related: {
      join: 'Enviar su CV para un empleo.',
      volunteer: 'El camino para quienes empiezan: voluntariado y prácticas en proyectos reales.',
      experts: 'Expertos que ofrecen consultas técnicas y de carrera.',
      'start-project': 'Iniciar un proyecto con este equipo.',
    },
  },

  portfolio: {
    title: 'Nuestros proyectos',
    summary: 'Proyectos en curso y entregados: las plataformas, aplicaciones y sistemas que hemos construido.',
    intro:
      'Esta página muestra ejemplos de nuestro trabajo. De cada proyecto ve una breve descripción, su estado (en curso o entregado), la tecnología usada y, si las hay, capturas y un enlace. Si un proyecto se hizo para un cliente concreto, también aparece.',
    steps: [
      ['Recorra la lista', 'Filtre los proyectos por estado (en curso o entregado) o por tecnología.'],
      ['Abra las capturas', 'La galería de cada proyecto muestra su aspecto y funcionamiento.'],
      ['¿Quiere algo parecido?', 'Mencione el proyecto en su solicitud para que entendamos exactamente lo que busca.'],
    ],
    faqs: [
      ['¿Están aquí todos sus proyectos?', 'No todos. Algunos son confidenciales y solo se publican con permiso del cliente.'],
      ['¿Puedo ver el código?', 'En los proyectos de código abierto, sí; si se ha publicado un enlace al repositorio, figura en el proyecto.'],
      ['Quiero algo como uno de estos.', 'Describa su necesidad en Iniciar un proyecto y mencione ese proyecto.'],
    ],
    related: {
      services: 'Los servicios de los que salieron estos proyectos.',
      customers: 'Las organizaciones para las que construimos este software.',
      'start-project': 'Iniciar su propio proyecto.',
    },
  },

  customers: {
    title: 'Club de clientes',
    summary: 'Las organizaciones cuyo software hemos construido y lo que dicen de trabajar con nosotros.',
    heading: 'Qué significa ser nuestro cliente',
    intro:
      'El club de clientes reúne a las organizaciones y empresas cuyo software hemos construido. Más importante que la lista es la experiencia que vive cada cliente, desde el primer mensaje hasta el software entregado: lo mismo que prometemos a todos, en proyectos pequeños y grandes.',
    points: [
      ['Una propuesta escrita, gratuita', 'Revisar su solicitud y redactar la propuesta no cuesta nada. Recoge el alcance, los entregables, los supuestos, lo que no está incluido, un calendario y un rango de precio.'],
      ['Un código de seguimiento, siempre disponible', 'Al enviar una solicitud recibe un código de seguimiento. A cualquier hora, incluidas las tres de la madrugada, muestra en qué punto está su trabajo y le permite aceptar o rechazar la propuesta.'],
      ['El precio antes del trabajo', 'Ve un rango de precio antes de que empiece nada. Si una parte del trabajo no vale lo que cuesta, lo decimos pronto.'],
      ['Respuestas claras', 'Si algo queda fuera de lo que hacemos bien, lo decimos con franqueza. El tamaño no es nuestro criterio: también aceptamos proyectos pequeños.'],
    ],
    faqTitle: 'Preguntas frecuentes de los clientes',
    faqs: [
      ['¿Tengo que pagar por un presupuesto?', 'No. Revisar su solicitud y redactar la propuesta es gratuito.'],
      ['¿Qué pasa si rechazo la propuesta?', 'Nada. La rechaza y ya está. Lo que nos envió se queda con nosotros y no llega a nadie más.'],
      ['He perdido mi código de seguimiento.', 'Contáctenos desde el teléfono o la dirección de correo que usó al enviar la solicitud y se lo daremos de nuevo.'],
      ['¿Las colaboraciones terminadas siguen en esta lista?', 'Sí. Los antiguos clientes permanecen en una sección propia: «construimos esto para ellos» sigue siendo cierto.'],
    ],
    related: {
      portfolio: 'Los proyectos construidos para estos clientes.',
      'start-project': 'Hágase cliente: envíe una solicitud de proyecto.',
      partners: 'Las organizaciones junto a las que trabajamos.',
    },
  },

  partners: {
    title: 'Nuestros socios',
    summary: 'Los socios tecnológicos, académicos, de la comunidad y estratégicos junto a los que construimos software.',
    heading: 'Trabajar con nosotros',
    intro:
      'Nuestros socios son las organizaciones junto a las que construimos software, desde empresas tecnológicas hasta universidades y comunidades de código abierto. Cada colaboración tiene su propia forma, pero la base es la misma: transparencia sobre el trabajo, las decisiones y sus límites, y una calidad en la que se puede confiar.',
    points: [
      ['Socios tecnológicos', 'Empresas cuya tecnología, infraestructura o herramientas usamos junto a nuestro propio trabajo, o que nos eligen para construir parte de su producto.'],
      ['Socios académicos', 'Universidades y centros de formación con los que colaboramos para formar a la próxima generación de ingenieros, con una puerta abierta a proyectos reales para estudiantes.'],
      ['Socios de la comunidad', 'Comunidades y proyectos de código abierto en los que participamos, que hacen posible construir con otros en lugar de en aislamiento.'],
      ['Socios estratégicos y revendedores', 'Organizaciones que representan o revenden nuestras soluciones en su mercado, o que recorren con nosotros un camino más largo.'],
    ],
    faqTitle: 'Preguntas frecuentes sobre colaboración',
    faqs: [
      ['¿Cómo propongo una colaboración?', 'Envíe un mensaje desde la página «Contacto» contando qué colaboración tiene en mente. Recibe un código de seguimiento y lee nuestra respuesta con él en la misma página.'],
      ['¿Qué buscan en un socio?', 'Los valores con los que trabajamos nosotros mismos: transparencia, una calidad que nunca se sacrifica por la velocidad y construir junto a otros.'],
      ['¿Cuándo aparece un socio en esta página?', 'Cuando la colaboración está en marcha. Las colaboraciones terminadas permanecen en una sección propia.'],
    ],
    related: {
      customers: 'Las organizaciones para las que hemos construido software.',
      contact: 'Envíe aquí su propuesta de colaboración.',
      volunteer: 'Para universidades: la vía de prácticas para estudiantes.',
    },
  },

  contact: {
    title: 'Contacto',
    summary: 'Envíe un mensaje, reciba un código de seguimiento y lea la respuesta con él en esta página, sin correo.',
    heading: 'Cómo se sigue su mensaje',
    intro:
      'Para escribirnos no necesita una cuenta ni esperar un correo. Envía un mensaje, recibe un código de seguimiento y lee la respuesta con ese código en esta misma página.',
    points: [
      ['Un código de seguimiento en lugar de correo', 'Su dirección de correo solo identifica su mensaje; no se envía ninguna respuesta a ella. Lee nuestra respuesta en esta página, con su código de seguimiento.'],
      ['El código se muestra una sola vez', 'Anote o copie el código en cuanto envíe su mensaje: es la única forma de volver a él.'],
      ['Un estado claro', 'Cada mensaje está «Esperando respuesta», «Respondido» o «Cerrado». Introduzca su código y verá el estado y la respuesta juntos.'],
      ['La página adecuada para cada cosa', 'Para un proyecto de software use «Iniciar un proyecto», y para hablar con un experto, «Solicitar una consulta». Las solicitudes de seguros se siguen con su propio código en «Seguimiento de solicitud».'],
    ],
    tips: [
      ['Copie el código ahora', 'El código de seguimiento del mensaje se muestra una sola vez y no se envía ningún correo; sin él no podrá leer la respuesta.'],
    ],
    faqTitle: 'Preguntas frecuentes sobre el contacto',
    faqs: [
      ['¿Me enviarán la respuesta por correo?', 'No. La respuesta está en esta página y se lee con su código de seguimiento; por eso es importante guardarlo.'],
      ['¿Cuánto tarda una respuesta?', 'Revisamos los mensajes en poco tiempo. Hasta que respondamos, el mensaje aparece como «Esperando respuesta».'],
      ['He perdido mi código de seguimiento.', 'Envíe un mensaje nuevo que mencione el anterior; leerá la respuesta con el código del mensaje nuevo.'],
      ['¿Qué página uso para iniciar un proyecto?', '«Iniciar un proyecto». Allí su solicitud se convierte en una propuesta escrita con el alcance, un calendario y un rango de precio.'],
    ],
    related: {
      'start-project': 'Para un proyecto de software, su propio formulario obtiene una mejor respuesta.',
      consult: 'Para hablar con un experto, solicite una consulta.',
      track: 'Seguimiento de solicitudes de proyecto, seguro, CV y consulta.',
    },
  },

  join: {
    title: 'Enviar su CV',
    summary: 'Envíenos su CV y le contactaremos en cuanto se abra un puesto acorde con su experiencia.',
    heading: 'Del CV a la conversación',
    intro:
      'Este formulario es para quienes quieren trabajar en Rayan Tamaddon Jahan Gostar: ingenieros de software, diseñadores o responsables de producto, con o sin experiencia. Leemos su CV y le contactamos cuando se abre un puesto adecuado. Puede ver el estado de su CV en cualquier momento con un código de seguimiento.',
    steps: [
      ['Introduzca sus datos', 'Nombre, correo y teléfono son obligatorios; correo y teléfono juntos le identifican en seguimientos posteriores.'],
      ['Adjunte su CV', 'PDF, Word (docx) o LaTeX (tex), hasta 10 MB. Una nota breve es opcional.'],
      ['Guarde el código de seguimiento', 'Tras enviarlo recibe un código; úselo en Seguimiento de solicitud para ver el estado de su CV.'],
    ],
    tips: [
      ['Límite de envíos', 'Cada persona puede enviar un CV como máximo dos veces al día (con una hora de diferencia) y solo en dos días, así que envíe su versión final.'],
    ],
    faqs: [
      ['Estoy empezando; ¿envío un CV?', 'Sí. Si aún no tiene experiencia laboral, el programa Voluntariado y prácticas también está pensado para usted.'],
      ['¿Responden a todos los CV?', 'Lo leemos, y usted ve su estado con su código de seguimiento. Le contactamos cuando se abre un puesto adecuado.'],
      ['¿Puedo actualizar mi CV?', 'Envíe la nueva versión, dentro del límite de dos veces al día en dos días.'],
      ['¿Puedo postularme a una oferta concreta?', 'Sí; para los anuncios de Empleos, postúlese directamente desde la página del anuncio.'],
    ],
    related: {
      volunteer: 'Si busca prácticas o voluntariado.',
      jobs: 'Puestos abiertos, nuestros y de otras empresas.',
      team: 'Conozca el equipo al que se uniría.',
      track: 'El estado de su CV con el código de seguimiento.',
    },
  },

  volunteer: {
    title: 'Voluntariado y prácticas',
    summary: 'Trabaje en proyectos reales como voluntario o en prácticas y crezca junto a ingenieros con experiencia.',
    intro:
      'Este programa es para estudiantes y recién titulados, para quienes se reorientan hacia el software y para desarrolladores que quieren contribuir a proyectos de código abierto y cívicos. Tiene dos formas: el voluntariado, en el que dedica su tiempo libre a los proyectos sin un compromiso horario estricto, y las prácticas, un periodo definido con plan de aprendizaje, mentor y evaluación final.',
    steps: [
      ['Elija el tipo de colaboración', 'Voluntario o en prácticas; cada uno tiene su descripción en el formulario.'],
      ['Diga qué y cuándo', 'Su área (front-end, back-end, móvil, datos, diseño, etc.), horas por semana, fecha de inicio y modalidad (presencial, híbrida o remota).'],
      ['Describa estudios y habilidades', 'Universidad, carrera, habilidades y un enlace a GitHub o portafolio; cuanto más completo, más fácil encontrar el proyecto adecuado.'],
      ['Envíe y guarde el código', 'Siga su solicitud con el código de seguimiento.'],
    ],
    points: [
      ['Proyectos reales', 'Trabajo en software que de verdad se usa, no en ejercicios inventados.'],
      ['Revisión y mentoría', 'Revisión de código y orientación de ingenieros con experiencia.'],
      ['Un certificado', 'Certificado y carta de recomendación para quienes completen la colaboración.'],
    ],
    faqs: [
      ['¿El voluntariado es remunerado?', 'El voluntariado no es remunerado y es flexible en horario. Si busca empleo, use Enviar tu CV.'],
      ['¿Puedo postularme sin experiencia?', 'Sí; para eso existe el programa. Indique las habilidades que tenga, aunque sean pocas.'],
      ['¿Es posible el trabajo remoto?', 'Sí. Elija presencial, híbrida o remota como modalidad en el formulario.'],
      ['¿Qué diferencia hay entre prácticas y voluntariado?', 'Las prácticas son un periodo definido con plan de aprendizaje, mentor y evaluación final; el voluntariado es flexible, sin compromiso horario estricto.'],
    ],
    related: {
      join: 'Si busca empleo.',
      team: 'Los ingenieros con los que trabajaría.',
      experts: 'Para orientación profesional con expertos.',
    },
  },

  blog: {
    title: 'Blog',
    summary: 'Guías prácticas sobre seguros y software: precios, consejos de compra y comparativas.',
    intro:
      'En el blog publicamos artículos que ayudan a tomar una decisión real: el precio del seguro de responsabilidad civil y a todo riesgo, consejos para contratar un seguro o cómo definir un proyecto de software. La mayoría de los artículos están en persa y algunos tienen versión en inglés; un artículo que no existe en su idioma no aparece en la lista de ese idioma.',
    steps: [
      ['Encuentre un artículo', 'Recorra la lista; cada artículo tiene un resumen, una fecha de publicación y un tiempo de lectura estimado.'],
      ['Lea y actúe', 'Cada artículo termina con un enlace a la solicitud de seguro en línea, para empezar allí si está listo.'],
    ],
    faqs: [
      ['¿Con qué frecuencia publican?', 'Cuando tenemos algo nuevo que decir; preferimos la calidad a la cantidad.'],
      ['¿Los precios de los artículos son definitivos?', 'No. Son los de la fecha de publicación y pueden cambiar; el precio final lo recibe al hacer la solicitud.'],
      ['¿Por qué un artículo no está en otro idioma?', 'Cada artículo se publica solo en los idiomas en que se escribió; no publicamos traducciones automáticas.'],
    ],
    related: {
      insurance: 'Tras leer un artículo de seguros, solicite ese seguro.',
      services: 'Los servicios de software a los que se refieren los artículos técnicos.',
      'help-centre': 'Guías de uso de cada sección del sitio.',
    },
  },

  track: {
    title: 'Seguimiento de solicitud',
    summary: 'Con su código de seguimiento, vea el estado de una solicitud de proyecto, seguro, CV o consulta.',
    intro:
      'Cada solicitud que hace en este sitio tiene un código de seguimiento de diez caracteres. Esta página muestra con él el estado de la solicitud, sea del tipo que sea: una solicitud de proyecto de software (y nuestra propuesta, que acepta o rechaza aquí mismo), una solicitud de seguro (y la hora de llamada acordada), un CV o una solicitud de consulta (que puede cancelar si lo necesita). Los mensajes del formulario de contacto se siguen aparte, en la página Contacto.',
    steps: [
      ['Introduzca el código', 'Escríbalo tal como lo recibió; las letras pasan a mayúsculas automáticamente.'],
      ['Vea el estado', 'Se muestran el tipo de solicitud, la fecha de envío, la última actualización y el estado actual.'],
      ['Si ha llegado una propuesta, decida', 'En una solicitud de proyecto, abra la propuesta escrita y acéptela o rechácela.'],
    ],
    points: [
      ['Una página para todo', 'Proyectos, seguros, CV y consultas se siguen con el mismo formulario.'],
      ['Un enlace para compartir', 'El código queda en la dirección de la página: puede guardar el enlace o enviarlo a la persona asegurada.'],
    ],
    tips: [
      ['Todo en un solo lugar', 'Si tiene cuenta, añada sus códigos en Mis solicitudes para no escribirlos cada vez.'],
    ],
    faqs: [
      ['¿Dónde está mi código de seguimiento?', 'Se muestra justo después de enviar la solicitud. Si tenía la sesión iniciada, también se guarda en Mis solicitudes.'],
      ['Dice que no hay ninguna solicitud con este código.', 'Revise el código; no confunda el cero con la letra O ni el uno con la I. Si sigue fallando, escriba desde Contacto.'],
      ['¿Sigo aquí un mensaje del formulario de contacto?', 'No; los mensajes de contacto se siguen en la propia página Contacto, con su propio código.'],
      ['¿Qué ven otros con mi código?', 'Quien tenga el código ve el estado; guárdelo como una contraseña y compártalo solo con quien lo necesite.'],
    ],
    related: {
      'start-project': 'Enviar una solicitud de proyecto de software.',
      insurance: 'Enviar una solicitud de seguro.',
      join: 'Enviar su CV.',
      'my-requests': 'Para miembros: todos los códigos en una lista.',
    },
  },

  'help-centre': {
    title: 'Centro de ayuda',
    summary: 'Todas las guías del sitio en un solo lugar, agrupadas y con buscador.',
    intro:
      'Para cada sección del sitio, el centro de ayuda explica qué hace, cómo usarla, con qué otras secciones funciona y las respuestas a las preguntas frecuentes. Las mismas guías están en cada página con el botón Guía o la tecla ?. Las guías del área de miembros puede leerlas cualquiera, para saber qué ofrece una cuenta antes de crearla.',
    steps: [
      ['Busque', 'Escriba, por ejemplo, «código de seguimiento», «verificación» o «propuesta».'],
      ['O recorra una colección', 'Las guías están agrupadas por las secciones del sitio.'],
      ['De la guía a la sección', 'Cada guía tiene un botón Ir a esta sección y enlaces a las secciones relacionadas.'],
    ],
    faqs: [
      ['No he encontrado la respuesta a mi pregunta.', 'Pregúntenos desde la página Contacto; las preguntas frecuentes se añaden a las guías.'],
      ['La guía no está en mi idioma.', 'Las guías de las páginas públicas están en los seis idiomas del sitio; las del área de miembros y de administración, por ahora en persa e inglés.'],
    ],
    related: {
      home: 'Volver al inicio.',
      contact: 'Si la respuesta a su pregunta no estaba en las guías.',
      dashboard: 'La guía del área de miembros.',
    },
  },
};

export default company;

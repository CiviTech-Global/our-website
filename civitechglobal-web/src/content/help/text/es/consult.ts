import type { HelpArticleText } from '../../types';

const consult: Record<string, HelpArticleText> = {
  consult: {
    title: 'Solicitar una consulta',
    summary: 'Pida orientación técnica o profesional; díganos cuándo está disponible y le llamamos.',
    intro:
      'Su trayectoria profesional, un problema técnico o una revisión de código, empezar en el software o preparar entrevistas y su CV: díganos de qué quiere hablar y cuándo está disponible. Le llamamos y fijamos la hora. La sesión puede ser en línea, por teléfono o en persona, y no le compromete a nada.',
    steps: [
      ['Elija un tema', 'Trayectoria profesional, un problema técnico, empezar, entrevistas y CV, u otro tema.'],
      ['Cómo y para qué', 'En línea, por teléfono o en persona, y qué espera obtener de la sesión.'],
      ['Elija un experto o déjelo en nuestras manos', 'Si tiene a alguien del club de expertos en mente, elíjalo; si no, «quien mejor encaje».'],
      ['Indique cuándo está disponible', 'Elija varias franjas (un día y mañana, tarde o noche). Basta con una hora aproximada.'],
      ['Guarde el código de seguimiento', 'Llamamos al número indicado; siga el estado con el código y cancele la solicitud si lo necesita.'],
    ],
    points: [
      ['Un estado claro', 'Recibida, Fijando la hora, Hora confirmada, Realizada; todo con el código de seguimiento.'],
      ['Cancelación sencilla', 'Si cambian sus planes, cancele la solicitud desde la página de seguimiento.'],
    ],
    tips: [
      ['Concrete el objetivo', 'Cuanto más concreta sea su expectativa, más útil será la conversación; por ejemplo, «quiero saber por dónde empezar para pasar al back-end».'],
    ],
    faqs: [
      ['¿Una consulta me compromete a algo?', 'No. No crea ninguna obligación de iniciar un proyecto ni de trabajar juntos.'],
      ['¿Cuándo llamarán?', 'En una de las franjas indicadas, para confirmar la hora. La hora confirmada también aparece en la página de seguimiento.'],
      ['¿Necesito un correo electrónico?', 'No; basta con un teléfono. El correo es opcional.'],
      ['¿Puedo cancelar la solicitud?', 'Sí, con el código de seguimiento en la página Seguimiento de solicitud.'],
    ],
    related: {
      experts: 'Expertos a los que puede pedir por su nombre.',
      'start-project': 'Si tras la consulta está listo para iniciar un proyecto.',
      'my-requests': 'Para miembros: el código de la consulta en su lista de solicitudes.',
    },
  },

  experts: {
    title: 'Club de expertos',
    summary: 'Ingenieros y especialistas que ofrecen orientación técnica y profesional, con sus áreas, idiomas y años de experiencia.',
    heading: 'Cómo funciona el club de expertos',
    intro:
      'El club de expertos es un grupo de ingenieros y especialistas que ofrecen consultas técnicas y de carrera: las personas a las que acudimos nosotros mismos y a las que usted puede pedir por su nombre. Cada perfil indica si esa persona acepta consultas.',
    points: [
      ['Consulta técnica', 'Para decisiones como elegir una tecnología o diseñar una arquitectura, o para revisar un sistema que ya tiene y que no funciona como debería.'],
      ['Consulta de carrera', 'Para ingenieros que empiezan o cambian de rumbo, de la mano de personas que han recorrido ese camino.'],
      ['Elegir por nombre', 'La página de cada experto muestra sus especialidades, idiomas y años de experiencia. Si acepta consultas, puede solicitarla directamente desde esa página.'],
      ['Concertar una consulta', 'Envíe una solicitud desde la página «Solicitar una consulta» e indique algunos horarios que le vengan bien, y le llamamos. Una consulta no le compromete a nada.'],
    ],
    faqTitle: 'Preguntas frecuentes sobre las consultas',
    faqs: [
      ['¿Cómo reservo una consulta?', 'Desde la página «Solicitar una consulta» o con el botón de consulta en la página de un experto. Indica algunos horarios y le llamamos.'],
      ['¿Puedo elegir al experto?', 'Sí. A los expertos marcados con «Acepta consultas» puede pedirlos por su nombre.'],
      ['¿Una consulta me compromete a un proyecto?', 'No. Una consulta no le compromete a nada.'],
      ['¿Cómo me uno al club de expertos?', 'Escríbanos desde la página «Contacto» contando su experiencia y especialidades. Nuestro equipo añade y mantiene al día los perfiles del club.'],
    ],
    related: {
      consult: 'El formulario de solicitud de consulta.',
      team: 'El equipo de ingeniería de Rayan Tamaddon Jahan Gostar.',
      freelancers: 'Si en lugar de una consulta busca a alguien que haga el trabajo.',
    },
  },
};

export default consult;

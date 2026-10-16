import type { HelpArticleText } from '../../types';

const jobs: Record<string, HelpArticleText> = {
  jobs: {
    title: 'Empleos',
    summary: 'Ofertas de empleadores verificados en todo Irán y en remoto, con búsqueda, filtros y alertas.',
    intro:
      'Esta sección reúne ofertas de empleo de Rayan Tamaddon Jahan Gostar y de otras empresas. Solo pueden publicar los empleadores cuya identidad ha verificado nuestro equipo, y cada anuncio se revisa antes de publicarse. Para quienes buscan empleo todo es gratis: buscar, guardar anuncios, alertas y postularse.',
    steps: [
      ['Busque y filtre', 'Busque por puesto, habilidad o empresa, y filtre por categoría, provincia, país, remoto o salario mínimo.'],
      ['Abra un anuncio', 'Cada anuncio muestra los requisitos, el salario y los beneficios, las habilidades y los datos de la empresa.'],
      ['Guárdelo o cree una alerta', 'Guarde los anuncios interesantes; «Recibir alertas de esta búsqueda» le avisa de los nuevos.'],
      ['Postúlese', 'Inicie sesión y complete la verificación de identidad para enviar su CV; la candidatura llega directamente al empleador.'],
    ],
    points: [
      ['Empleadores verificados', 'La identidad de cada empleador está comprobada, y cada anuncio se lee antes de publicarse.'],
      ['Páginas por provincia y categoría', 'Las ofertas de una provincia, un país o una categoría tienen su propia dirección, que puede guardar.'],
      ['Teletrabajo internacional', 'Puestos remotos abiertos a candidatos de todos los países o de uno concreto.'],
      ['Sugerencias según su actividad', 'Con la sesión iniciada, ve anuncios afines a sus candidaturas y anuncios guardados.'],
    ],
    tips: [
      ['Cree una alerta', 'En lugar de mirar cada día, guarde su búsqueda con «Recibir alertas de esta búsqueda»; cada anuncio nuevo que encaje le avisa una vez.'],
    ],
    faqs: [
      ['¿Postularse tiene coste?', 'No. Buscar, guardar anuncios, las alertas y postularse son gratis para quienes buscan empleo.'],
      ['¿Quién puede publicar aquí?', 'Solo los empleadores cuya identidad ha verificado nuestro equipo, y cada anuncio se revisa antes de publicarse.'],
      ['¿Cómo publico una oferta?', 'Inicie sesión, complete la verificación de identidad, cree un anuncio en Mis anuncios de su panel y envíelo a revisión.'],
      ['¿Por qué debo verificar mi identidad para postularme?', 'Para que el empleador sepa que trata con una persona real; es la misma razón por la que se verifica a los empleadores.'],
      ['¿En qué se diferencia de «Enviar tu CV»?', '«Enviar tu CV» es para trabajar en Rayan Tamaddon Jahan Gostar; esta sección es para ofertas concretas, nuestras o de otras empresas.'],
    ],
    related: {
      'job-detail': 'La página de cada anuncio y el formulario de candidatura.',
      companies: 'Las empresas que contratan.',
      'my-applications': 'Para candidatos: candidaturas, anuncios guardados y alertas.',
      'my-jobs': 'Para empleadores: publicar y gestionar ofertas.',
    },
  },

  'job-detail': {
    title: 'Un anuncio de empleo',
    summary: 'Los detalles de un puesto, cuánto encaja usted y el formulario de candidatura.',
    intro:
      'Cada anuncio muestra la descripción del puesto, los requisitos, el salario y los beneficios, las habilidades necesarias y los datos de la empresa. Si ha añadido sus habilidades al perfil, también indica cuántas de las requeridas tiene. Su candidatura llega directamente al empleador y le informamos en cada etapa.',
    steps: [
      ['Lea el anuncio', 'Revise los requisitos, el salario y el tipo de puesto; si el empleador suele responder, se muestra su tasa de respuesta.'],
      ['Vea cuánto encaja', 'La sección «¿Cuánto encajas?» muestra las habilidades que tiene y las que vale la pena aprender.'],
      ['Inicie sesión y verifíquese', 'El formulario de candidatura se abre con la sesión iniciada y la identidad verificada.'],
      ['Envíe su CV', 'Envíe la candidatura y siga su estado en Mis candidaturas.'],
    ],
    tips: [
      ['Añada sus habilidades al perfil', 'Sin habilidades en el perfil no se puede calcular cuánto encaja con un anuncio.'],
    ],
    faqs: [
      ['¿Cómo sé si el empleador ha visto mi CV?', 'Cuando el empleador abre su candidatura, pasa a «Vista por el empleador», y le avisamos en cada cambio de etapa.'],
      ['¿Puedo retirar mi candidatura?', 'Sí, desde Mis candidaturas. Mientras el anuncio esté abierto puede volver a postularse.'],
      ['¿Puedo postularme dos veces al mismo anuncio?', 'No; si ya se postuló, la fecha aparece en el anuncio.'],
      ['No veo el salario.', 'Algunos empleadores no lo indican; entonces el anuncio dice «Negociable».'],
    ],
    related: {
      jobs: 'Volver a todos los anuncios.',
      companies: 'La página de la empresa detrás del anuncio.',
      'my-applications': 'Seguir las candidaturas enviadas.',
      verification: 'La verificación de identidad necesaria antes de postularse.',
    },
  },

  companies: {
    title: 'Empresas',
    summary: 'Los empleadores verificados, la página de cada empresa y sus puestos abiertos.',
    intro:
      'Cada empleador verificado puede tener una página de empresa: presentación, tamaño de la organización, imágenes y todos sus puestos abiertos. Aquí busca empresas y pasa de la página de cada una a sus anuncios.',
    steps: [
      ['Encuentre la empresa', 'Busque por nombre o recorra por tamaño de organización.'],
      ['Lea la página', 'Vea la presentación de la empresa y sus puestos abiertos.'],
      ['¿Es usted empleador?', 'Una vez verificado, cree la página de su empresa desde su panel; cada oferta que publique enlaza con ella.'],
    ],
    faqs: [
      ['¿Cómo creo una página de empresa?', 'Vaya a Página de la empresa en su panel. Antes, su identidad debe estar verificada.'],
      ['¿Por qué se ha ocultado una página de empresa?', 'Si una página incumple las normas del sitio, nuestro equipo la oculta; su titular puede preguntar el motivo al soporte.'],
    ],
    related: {
      jobs: 'Todas las ofertas.',
      'my-jobs': 'Para empleadores: anuncios y página de la empresa.',
    },
  },
};

export default jobs;

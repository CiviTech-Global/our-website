import type { HelpArticleText } from '../../types';

const insurance: Record<string, HelpArticleText> = {
  insurance: {
    title: 'Seguros',
    summary: 'Todos los tipos de seguro que gestionamos: encuentre el que necesita y solicítelo en línea.',
    heading: 'De elegir la póliza a la llamada del especialista',
    intro:
      'Las solicitudes de seguros en línea son uno de nuestros servicios complementarios, porque la seguridad financiera, la protección y la tranquilidad de nuestros colaboradores y clientes nos importan. Esta página reúne todos los seguros cuyas solicitudes recibimos: desde la responsabilidad civil y el todo riesgo para coches y motos hasta salud complementaria, vida, accidentes, responsabilidad, transporte de mercancías, todo riesgo de construcción y seguro de móvil. Cada uno tiene su formulario y, tras su solicitud, un especialista le llama para ofrecerle la mejor opción según su necesidad y presupuesto.',
    steps: [
      ['Encuentre el seguro', 'Recorra la lista o busque por nombre. Las pólizas para empresas llevan la etiqueta Empresas.'],
      ['Lea su página', 'Cada página indica las coberturas, las exclusiones, los documentos necesarios y lo que influye en la prima.'],
      ['Rellene el formulario', 'Introduzca los datos de la póliza y sus datos de contacto, y confirme su móvil con un código de seis cifras.'],
      ['Guarde el código de seguimiento', 'Tras la solicitud, guarde el código; con él ve el estado y la hora de llamada acordada.'],
    ],
    points: [
      ['Contratación en línea', 'En las pólizas con la etiqueta Contratación en línea, da todo lo necesario en el formulario.'],
      ['Tarificado por un especialista', 'Las pólizas con la etiqueta Tarificado por un especialista se tarifican por teléfono; usted da lo básico y el especialista le llama.'],
      ['Sin precios en el sitio', 'La prima depende de sus datos; el especialista le da las opciones y el precio tras revisarlos.'],
    ],
    faqs: [
      ['¿Puedo comprar y pagar el seguro aquí?', 'No. Aquí envía la solicitud; nuestro especialista le llama, revisa las opciones y gestiona la emisión de la póliza.'],
      ['¿Por qué no veo precios en el sitio?', 'La prima depende de factores como el vehículo, su historial y las coberturas elegidas. Esos factores figuran en la página de cada póliza, y el especialista da el precio exacto.'],
      ['¿Por qué debo confirmar mi número?', 'Es la vía por la que le llama el especialista; confirmarlo evita errores de escritura.'],
      ['¿Necesito cuenta para solicitar un seguro?', 'No. Pero si tiene la sesión iniciada, el código se guarda en Mis solicitudes.'],
      ['El seguro que busco no está en la lista.', 'Pregunte desde la página Contacto; le propondremos la opción más cercana.'],
    ],
    related: {
      'insurance-product': 'La página y el formulario de cada póliza.',
      track: 'Seguir una solicitud de seguro con su código.',
      'my-requests': 'Para miembros: todas las solicitudes en una lista.',
      blog: 'Guías de precios y consejos para contratar seguros.',
    },
  },

  'insurance-product': {
    title: 'La página y el formulario de una póliza',
    summary: 'Una póliza en detalle con su formulario: coberturas, exclusiones, documentos, factores de precio y solicitud.',
    intro:
      'Cada póliza tiene su propia página. «De un vistazo» la resume; después vienen las coberturas y coberturas opcionales, lo que no está cubierto, los documentos necesarios, lo que influye en la prima y qué hacer en caso de siniestro. El formulario de solicitud está en la misma página y sus campos son propios de esa póliza.',
    steps: [
      ['Datos de la póliza', 'Rellene los campos propios de esta póliza; son necesarios para un precio exacto.'],
      ['Datos de contacto', 'Indique su nombre y cómo localizarle; le llamamos para gestionar y enviar la póliza.'],
      ['Confirme su número', 'Confirme su móvil con el código de seis cifras; sin él no puede enviarse la solicitud.'],
      ['Envíe y guarde el código', 'Envíe la solicitud y guarde el código de seguimiento.'],
    ],
    tips: [
      ['Lea las exclusiones antes de solicitar', 'La lista «No cubierto» importa tanto como las coberturas y evita sorpresas en un siniestro.'],
      ['Tenga los documentos a mano', 'Prepare los documentos necesarios antes de que llame el especialista: la póliza se emitirá antes.'],
    ],
    faqs: [
      ['¿Qué pasa tras la solicitud?', 'Un especialista le llama lo antes posible para revisar las opciones; la hora acordada aparece en la página de seguimiento.'],
      ['¿Qué significa «Tarificado por un especialista»?', 'Esta póliza la tarifica un especialista; usted da lo básico para que le llame bien informado.'],
      ['No me ha llegado el código de confirmación.', 'Espere un momento y pulse Reenviar, o revise el número y corríjalo con Cambiar número.'],
      ['¿Dónde se muestran mis datos?', 'La página de seguimiento solo muestra el estado de la solicitud, no sus datos personales.'],
    ],
    related: {
      insurance: 'Volver a la lista de seguros.',
      track: 'Seguir la solicitud con su código.',
      'my-requests': 'Para miembros: sus códigos en una lista.',
    },
  },
};

export default insurance;

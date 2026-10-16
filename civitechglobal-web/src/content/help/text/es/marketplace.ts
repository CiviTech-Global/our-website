import type { HelpArticleText } from '../../types';

const marketplace: Record<string, HelpArticleText> = {
  marketplace: {
    title: 'Mercado local',
    summary: 'Encuentre en el mapa tiendas, productos y servicios cerca de usted y contacte directamente con la tienda.',
    intro:
      'El mercado local muestra en un mapa las tiendas y negocios a su alrededor: sus productos, servicios, imágenes y vías de contacto. Por ahora es un escaparate, no una tienda en línea; la compra, la reserva y los acuerdos se hacen directamente con la tienda.',
    steps: [
      ['Fije su punto', 'Permita el acceso a su ubicación o haga clic en el mapa para centrar la búsqueda en ese punto.'],
      ['Busque', 'Busque el nombre de una tienda, un oficio, o el producto o servicio que quiere; ajuste el radio de búsqueda y elija «Más cercano» para ordenar.'],
      ['Abra una tienda o un producto', 'Vea la presentación, las imágenes, los productos y servicios, y la ubicación en el mapa.'],
      ['Póngase en contacto', 'Para comprar o reservar, use los datos de contacto de esa tienda.'],
    ],
    tips: [
      ['¿Ubicación no disponible?', 'Los navegadores solo comparten la ubicación en una conexión segura, y quizá no lo haya permitido; en ese caso elija un punto en el mapa.'],
    ],
    faqs: [
      ['¿Puedo comprar y pagar aquí?', 'Todavía no. La cesta y el pago en línea no están activados; contacte con la tienda.'],
      ['¿Se revisan las tiendas?', 'Sí. Cada propietario ha verificado su identidad y cada tienda se revisa antes de aparecer.'],
      ['Mi tienda no está aquí.', 'Dé de alta su tienda en cuatro pasos desde la página Registra tu tienda.'],
    ],
    related: {
      'marketplace-join': 'Dar de alta su propia tienda.',
      'my-shops': 'Para vendedores: gestionar su tienda y sus productos.',
    },
  },

  'marketplace-join': {
    title: 'Registrar su tienda',
    summary: 'Registre su tienda en cuatro pasos para que los clientes cercanos la encuentren en el mapa.',
    intro:
      'Cualquier negocio que ofrezca productos o servicios a clientes cercanos puede registrar su tienda. Como una tienda es una identidad comercial y los compradores deben saber quién está detrás, se exige la verificación de identidad y la tienda se revisa antes de aparecer. Una vez aprobada, usted publica y edita sus productos y servicios.',
    steps: [
      ['Cree una cuenta', 'Regístrese o inicie sesión.'],
      ['Verifique su identidad', 'Confirme su identidad en su panel.'],
      ['Cree la tienda', 'Indique el nombre, la presentación, el oficio, el logotipo, una imagen, los datos de contacto y la ubicación, y envíela a revisión.'],
      ['Añada productos y servicios', 'Una vez aprobada la tienda, publique, edite y retire sus productos y servicios.'],
    ],
    tips: [
      ['Sitúese en el mapa', 'Sin ubicación, su tienda no aparece en las búsquedas «cerca de mí».'],
    ],
    faqs: [
      ['¿Cuánto tarda la revisión?', 'Depende de la cola de revisión. Si el revisor pide cambios, se le avisa en su panel y la reenvía tras corregir.'],
      ['¿También se revisan los productos?', 'Una vez aprobada la tienda, los productos se publican al momento, pero el equipo puede devolver cualquier producto para corregirlo.'],
    ],
    related: {
      marketplace: 'El mercado visto por un comprador.',
      'my-shops': 'Gestionar su tienda una vez registrada.',
      verification: 'Paso dos: la verificación de identidad.',
    },
  },
};

export default marketplace;

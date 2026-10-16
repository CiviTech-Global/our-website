import type { HelpArticleText } from '../../types';

const books: Record<string, HelpArticleText> = {
  books: {
    title: 'Mercado de libros',
    summary: 'Libros nuevos y de segunda mano de lectores y librerías: todos los ejemplares de un libro en una página.',
    intro:
      'En el mercado de libros cada libro tiene una página, y todos los ejemplares a la venta aparecen juntos en ella, el más barato primero. Cada ejemplar pertenece a un vendedor; ve su estado (de Nuevo a Aceptable), fotos, precio, gastos de envío y forma de entrega. La compra empieza con una solicitud de compra; no se paga nada a través del sitio, comprador y vendedor acuerdan pago y entrega directamente.',
    steps: [
      ['Encuentre el libro', 'Busque o recorra las estanterías; filtre por estado, precio, envío gratuito o por debajo del precio de portada.'],
      ['Elija un ejemplar', 'En la página del libro, compare los ejemplares por estado, fotos, precio y forma de entrega.'],
      ['Envíe una solicitud de compra', 'Elija la forma de entrega y, si quiere, proponga un precio; debe tener la sesión iniciada y estar verificado.'],
      ['Acuerde la entrega', 'Cuando el vendedor acepte, acuerden pago y entrega en la conversación de esa solicitud.'],
    ],
    points: [
      ['Estado graduado', 'Cada ejemplar tiene uno de cinco grados —Nuevo, Como nuevo, Muy bueno, Bueno o Aceptable— con fotos.'],
      ['Vender libros', 'Ponga su ejemplar a la venta desde su panel con fotos, estado y precio; se revisa antes de publicarse.'],
      ['Valoraciones mutuas', 'Tras una venta, comprador y vendedor se valoran mutuamente.'],
    ],
    tips: [
      ['Proponer un precio', 'Si el precio de un ejemplar es negociable, puede proponer el suyo; deje el campo vacío para aceptar el precio del vendedor.'],
    ],
    faqs: [
      ['¿Pago al sitio?', 'No. No se paga nada a través del sitio; cuando aceptan su solicitud, acuerda el pago y la entrega directamente con el vendedor.'],
      ['¿Por qué debo verificar mi identidad para comprar?', 'Para que el vendedor sepa que trata con una persona real; la misma norma rige para los vendedores.'],
      ['¿Cómo vendo un libro?', 'En Mis libros en venta de su panel, ponga su ejemplar a la venta con fotos, estado y precio, y envíelo a revisión.'],
      ['El vendedor ha rechazado mi solicitud.', 'Puede pedir otro ejemplar del mismo libro a otro vendedor.'],
    ],
    related: {
      'my-books': 'Vender libros y seguir sus compras desde el panel.',
      messages: 'Hablar con el comprador o el vendedor.',
      verification: 'Necesaria para comprar y vender.',
    },
  },
};

export default books;

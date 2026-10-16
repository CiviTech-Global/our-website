import type { HelpLibraryText } from '../../types';
import company from './company';
import insurance from './insurance';
import consult from './consult';
import jobs from './jobs';
import freelance from './freelance';
import books from './books';
import marketplace from './marketplace';
import account from './account';

const es: HelpLibraryText = {
  collections: {
    company: { title: 'La empresa y sus servicios de software', description: 'Conozca Rayan Tamaddon Jahan Gostar: desarrollo de software, solicitudes de proyecto, contacto y colaboración.' },
    insurance: { title: 'Seguros', description: 'Solicitudes de seguro en línea, un formulario por producto y seguimiento con código.' },
    consult: { title: 'Consultoría y expertos', description: 'Solicite consultoría técnica o profesional y conozca el club de expertos.' },
    jobs: { title: 'Empleo', description: 'Busque empleo y postúlese, consulte las páginas de empresas y publique una oferta.' },
    freelance: { title: 'Proyectos freelance', description: 'Publique un proyecto, envíe propuestas, servicios listos y el directorio de freelancers.' },
    books: { title: 'Mercado de libros', description: 'Compra y venta de libros nuevos y de segunda mano entre miembros.' },
    marketplace: { title: 'Mercado local', description: 'Tiendas y productos locales en el mapa, y alta de su tienda.' },
    account: { title: 'Su cuenta', description: 'Registro, inicio de sesión, restablecer la contraseña y confirmar el correo.' },
  },
  articles: {
    ...company,
    ...insurance,
    ...consult,
    ...jobs,
    ...freelance,
    ...books,
    ...marketplace,
    ...account,
  },
};

export default es;

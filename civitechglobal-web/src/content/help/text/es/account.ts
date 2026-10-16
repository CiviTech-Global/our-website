import type { HelpArticleText } from '../../types';

const account: Record<string, HelpArticleText> = {
  login: {
    title: 'Iniciar sesión',
    summary: 'Inicie sesión con su correo y contraseña; si el inicio en dos pasos está activo, también se pide el código de su aplicación de autenticación.',
    intro:
      'Al iniciar sesión accede a su panel: perfil, verificación de identidad, códigos de seguimiento, mensajes y su actividad en el mercado. Si ha activado el inicio de sesión en dos pasos, tras la contraseña se pide el código de seis cifras de su aplicación de autenticación (o uno de sus códigos de recuperación).',
    steps: [
      ['Correo y contraseña', 'Use el correo con el que se registró.'],
      ['Código en dos pasos, si está activo', 'Introduzca el código de seis cifras de su aplicación o un código de recuperación.'],
      ['Siga donde estaba', 'Si llegó a iniciar sesión desde una página como un anuncio, vuelve a ella después.'],
    ],
    faqs: [
      ['He olvidado mi contraseña.', 'Use «¿Ha olvidado su contraseña?». Si no se puede enviar correo, la página le dirige al formulario de contacto.'],
      ['No tengo acceso a mi aplicación de autenticación.', 'Introduzca uno de los códigos de recuperación que guardó al activarlo. Cada código sirve una sola vez.'],
      ['¿Cómo cierro sesión en todos los dispositivos?', 'En la sección de seguridad de su perfil, elija «Cerrar sesión en todas partes».'],
    ],
    related: {
      register: '¿Aún no tiene cuenta?',
      'password-reset': 'Restablecer su contraseña.',
      dashboard: 'Lo que le espera tras iniciar sesión.',
    },
  },

  register: {
    title: 'Registrarse',
    summary: 'Cree una cuenta para publicar anuncios y proyectos, enviar propuestas, vender libros y reunir sus códigos de seguimiento.',
    intro:
      'No necesita cuenta para solicitar un proyecto, un seguro o una consulta, enviar un CV o contactarnos. La cuenta sirve para lo que implica su identidad: publicar una oferta o un proyecto, enviar propuestas, postularse, comprar y vender libros y registrar una tienda. Además, sus códigos de seguimiento quedan juntos en Mis solicitudes.',
    steps: [
      ['Lo básico', 'Introduzca nombre, apellidos, correo y una contraseña.'],
      ['A su panel', 'Tras registrarse, su sesión queda iniciada de inmediato.'],
      ['Complete la verificación', 'Para la actividad en el mercado, confirme su identidad desde su panel.'],
    ],
    faqs: [
      ['¿Registrarse tiene coste?', 'No.'],
      ['¿Por qué también debo verificar mi identidad tras registrarme?', 'El registro crea una cuenta; la verificación confirma que detrás hay una persona real. Es necesaria para comprar y vender, contratar y los proyectos.'],
      ['¿Qué reglas tiene la contraseña?', 'Se indican bajo el campo de contraseña; elija una larga y única.'],
    ],
    related: {
      login: 'Si ya tiene cuenta.',
      'verify-email': 'Confirmar su correo.',
      verification: 'La verificación de identidad tras el registro.',
    },
  },

  'password-reset': {
    title: 'Restablecer la contraseña',
    summary: '¿Ha olvidado su contraseña? Pida un enlace para restablecerla y elija una nueva.',
    intro:
      'En la página de restablecimiento introduce el correo de su cuenta y recibe un enlace; al abrirlo, elige una contraseña nueva. Si en ese momento el sitio no puede enviar correos, la página lo dice claramente y le dirige al formulario de contacto para recibir ayuda.',
    steps: [
      ['Introduzca su correo', 'El de su registro.'],
      ['Abra el enlace', 'El enlace le lleva a la página para elegir una contraseña nueva.'],
      ['Elija una contraseña nueva', 'Escríbala dos veces e inicie sesión con ella.'],
    ],
    faqs: [
      ['No me ha llegado el enlace.', 'Revise la carpeta de spam. Si la página indicó que por ahora no se puede enviar correo, escriba desde Contacto.'],
      ['El enlace no funciona.', 'Puede haber caducado; pida un nuevo restablecimiento.'],
    ],
    related: {
      login: 'Volver a iniciar sesión.',
      profile: 'Cambiar la contraseña con la sesión iniciada.',
    },
  },

  'verify-email': {
    title: 'Confirmar su correo',
    summary: 'Abra el enlace de confirmación para confirmar la dirección de correo de su cuenta.',
    intro:
      'Esta página se abre desde el enlace enviado para confirmar su dirección de correo. Al abrirse, se comprueba el enlace y se muestra el resultado. Confirmar el correo es distinto de verificar la identidad: lo primero prueba que la dirección es suya; lo segundo, quién es usted.',
    faqs: [
      ['El enlace ha caducado.', 'Inicie sesión y pida un enlace nuevo desde su panel, o pida ayuda desde Contacto.'],
      ['¿Confirmar el correo equivale a verificar la identidad?', 'No. Su identidad la verifica aparte, desde su panel.'],
    ],
    related: {
      register: 'Crear una cuenta.',
      login: 'Iniciar sesión.',
      verification: 'La verificación de identidad para el mercado.',
    },
  },
};

export default account;

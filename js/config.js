// ============================================================
//  CONFIGURACIÓN DE LA APP  (acá podés editar textos y fechas)
// ============================================================

const CONFIG = {
  SUPABASE_URL: 'https://sswyltqxarvkvpcpbqrf.supabase.co',
  SUPABASE_KEY: 'sb_publishable_6pqP08gApFgrWTmW-s8h0Q_JCdrEU0C',
  LOGIN_EMAIL: 'mili@nosotros.com',

  ONESIGNAL_APP_ID: '5ff32a07-7980-4692-aa0f-c48f17853f8f',

  // Su cumple
  NOMBRE: 'Miñe',
  CUMPLE: new Date('2026-11-21T00:00:00'),
  CUMPLE_TEXTO: '21 de noviembre',

  // Desde cuándo contamos "días juntos"
  INICIO: new Date('2023-04-28T00:00:00'),

  // Historia (sin fechas exactas, sin spoiler del 21/11)
  HISTORIA: [
    {
      titulo: 'El inicio',
      texto: 'Nos encontramos sin buscarnos, en una primavera que no prometía nada y terminó dándolo todo.',
      icono: '🌱',
    },
    {
      titulo: 'La primera pausa',
      texto: 'La vida nos separó un rato. Pero ni el tiempo ni la distancia pudieron apagar lo que sentíamos.',
      icono: '🌧️',
    },
    {
      titulo: 'Volvimos',
      texto: 'Nos volvimos a elegir. Porque cuando es de verdad, siempre se vuelve.',
      icono: '💫',
    },
    {
      titulo: 'Nuestra historia',
      texto: 'Vinieron años de fotos, risas, viajes, cumpleaños y mil recuerdos. Mes a mes fuimos construyendo lo que hoy somos.',
      icono: '❤️',
    },
    {
      titulo: 'Septiembre',
      texto: 'En septiembre la historia se volvió a frenar, y otra vez aprendimos que sin el otro nada es igual.',
      icono: '🥀',
    },
    {
      titulo: 'Octubre',
      texto: 'En octubre volvimos a encontrarnos. Y entendimos que esto no es casualidad: es que no sabemos estar separados.',
      icono: '🌅',
    },
  ],

  // Canciones (IDs de Spotify)
  CANCIONES: {
    marcaron: {
      titulo: 'Las que nos marcaron',
      descripcion: 'La banda sonora de nuestra historia',
      tracks: [
        { nombre: 'Vuélvete a Mí', id: '5xI8LCCevbolyhQoT9AT0b' },
        { nombre: 'Amor Mio', id: '7DOqLMSxTh1s3WPTyqJ2pw' },
        { nombre: 'Te Quiero Dijiste', id: '1xjGMWxSfbo7Eyjeb3mzNs' },
      ],
    },
    dedicadas: {
      titulo: 'Las que te dedico',
      descripcion: 'Lo que no te digo con palabras, te lo digo con estas canciones',
      tracks: [
        { nombre: 'Something About You', id: '3oNQ6NkihVzQkV5qhk2Pbe' },
        { nombre: 'My Kind of Woman', id: '38tfi9dtBQQ5Wyt7EL0G3z' },
        { nombre: 'Ando Ganas (Llora Llora)', id: '3JE8qYm4luylvVnhVuUfvC' },
      ],
    },
  },

  // Banco de preguntas de quiz (se eligen 2 al azar por día)
  BANK_QUIZ: [
    '¿Dónde fue nuestra primera cita?',
    '¿Qué fue lo primero que pensaste de mí?',
    '¿Cuál es tu recuerdo favorito conmigo?',
    '¿Qué canción te recuerda a nosotros?',
    '¿En qué momento te diste cuenta de que me querías?',
    '¿Qué es lo que más te gusta de mí?',
    '¿Cuál fue el día más feliz que pasamos juntos?',
    '¿Qué plan soñás hacer conmigo?',
    '¿Qué cosa mía te saca una sonrisa?',
    '¿Cuál fue nuestro mejor beso?',
    '¿Qué lugar te gustaría visitar conmigo?',
    '¿Qué te gustaría que hiciéramos más seguido?',
  ],

  // Banco de mensajes para la notificación diaria
  BANK_MENSAJES: [
    'Hoy también te elijo a vos.',
    'Pensé en vos apenas me desperté.',
    'Gracias por existir.',
    'Sos mi lugar favorito en el mundo.',
    'Te extraño aunque estés cerca.',
    'Sos lo mejor que me pasó.',
    'Hoy me acordé de tu sonrisa.',
    'No veo la hora de verte.',
    'Sos mi calma y mi locura.',
    'Cada día te quiero un poquito más.',
    'Gracias por quedarte.',
    'Sos mi "para siempre".',
    'Hoy te mando un abrazo gigante.',
    'Mi día mejora solo con saber de vos.',
    'Sos la razón de mi sonrisa de hoy.',
    'Te elijo, hoy y siempre.',
  ],

  // La propuesta (el cofre)
  PROPUESTA: {
    pregunta: '¿Querés volver a ser mi novia?',
    carta: 'Miñe… pasaron años desde aquella primavera en la que nos encontramos sin buscarnos. Tuvimos capítulos, pausas, vueltas… y sin embargo, acá estamos: de nuevo juntos, como siempre tenía que ser.\n\nPorque te elijo. Te elegí el primer día, te elijo hoy y te voy a elegir todos los días.\n\nHoy, en tu cumple, te quiero pedir algo muy importante…',
    si: 'SÍ ❤️',
    no: 'No',
    final: 'Oficialmente… nuestros ❤',
    cancionCelebracion: '3JE8qYm4luylvVnhVuUfvC',
  },
};

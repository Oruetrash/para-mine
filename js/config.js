// ============================================================
//  CONFIGURACIÓN DE LA APP  (acá podés editar textos y fechas)
// ============================================================

const CONFIG = {
  SUPABASE_URL: 'https://sswyltqxarvkvpcpbqrf.supabase.co',
  SUPABASE_KEY: 'sb_publishable_6pqP08gApFgrWTmW-s8h0Q_JCdrEU0C',
  LOGIN_EMAIL: 'mili@nosotros.com',

  // Su cumple
  NOMBRE: 'Miñe',
  CUMPLE: new Date('2026-11-21T00:00:00'),
  CUMPLE_TEXTO: '21 de noviembre',

  // Días de la historia (para la línea de tiempo)
  HISTORIA: [
    {
      fecha: 'Abril · Mayo 2023',
      titulo: 'Donde todo empezó',
      texto: 'Entre fines de abril y principios de mayo de 2023, sin avisar, nos encontramos. Y desde ese día, mi mundo empezó a girar alrededor de vos.',
      icono: '🌱',
    },
    {
      fecha: 'Octubre 2023',
      titulo: 'La primera pausa',
      texto: 'A principios de octubre, la vida nos separó un rato. Pero ni el tiempo ni la distancia pudieron apagar lo que sentíamos.',
      icono: '🌧️',
    },
    {
      fecha: 'Diciembre 2023',
      titulo: 'Volvimos',
      texto: 'A mediados de diciembre, nos volvimos a elegir. Porque cuando es de verdad, siempre se vuelve.',
      icono: '💫',
    },
    {
      fecha: '2024 · 2025 · 2026',
      titulo: 'Nuestra historia larga',
      texto: 'Vinieron años de fotos, risas, viajes, cumpleaños y mil recuerdos. Mes a mes fuimos construyendo lo que hoy somos.',
      icono: '❤️',
    },
    {
      fecha: '17 de septiembre de 2026',
      titulo: 'Otra pausa',
      texto: 'En septiembre la historia se volvió a frenar. Y otra vez aprendimos que sin el otro, nada es igual.',
      icono: '🥀',
    },
    {
      fecha: '18 de octubre de 2026',
      titulo: 'Nos reencontramos',
      texto: 'Hoy, de nuevo juntos, entendimos que esto no es casualidad: es que simplemente no sabemos estar separados.',
      icono: '🌅',
    },
    {
      fecha: '21 de noviembre de 2026',
      titulo: 'El comienzo',
      texto: 'Hoy, en tu cumple, se abre una puerta nueva. La más importante de todas…',
      icono: '🔐',
      especial: true,
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

  // La propuesta (el cofre)
  PROPUESTA: {
    pregunta: '¿Querés volver a ser mi novia?',
    carta: 'Miñe… han pasado tres años desde aquella primavera en la que nos encontramos sin buscarnos. Tuvimos capítulos, pausas, vueltas… y sin embargo, acá estamos: de nuevo juntos, como siempre tenía que ser.\n\nPorque te elijo. Te elegí en 2023, te elijo hoy y te voy a elegir todos los días.\n\nHoy, en tu cumple, te quiero pedir algo muy importante…',
    si: 'SÍ 💖',
    no: 'No',
    final: '21 · 11 · 2026 — oficialmente nuestros ❤',
    cancionCelebracion: '3JE8qYm4luylvVnhVuUfvC', // Ando Ganas
  },
};

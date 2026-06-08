// Anniversary calculation since 06/12/2024
const START_DATE = new Date('2024-12-06T00:00:00');

function getRelationshipStats() {
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - START_DATE.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let years = today.getFullYear() - START_DATE.getFullYear();
  let months = today.getMonth() - START_DATE.getMonth();
  let days = today.getDate() - START_DATE.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  // Next anniversary calculation
  const nextAnniversary = new Date(today.getFullYear(), START_DATE.getMonth(), START_DATE.getDate());
  if (today > nextAnniversary) {
    nextAnniversary.setFullYear(today.getFullYear() + 1);
  }
  const diffAnniv = nextAnniversary.getTime() - today.getTime();
  const nextInDays = Math.ceil(diffAnniv / (1000 * 60 * 60 * 24));

  return {
    days: diffDays,
    years,
    months,
    restDays: days,
    nextIn: nextInDays,
  };
}

const stats = getRelationshipStats();

export const COUPLE = {
  greeting: 'Bom dia',
  name: 'Luysa',
  a: 'L',
  b: 'L',
  nameA: 'Luysa',
  nameB: 'Leonardo',
  days: stats.days,
  years: stats.years,
  months: stats.months,
  restDays: stats.restDays,
  nextLabel: 'Aniversário de namoro',
  nextIn: stats.nextIn,
};

export const FEED = [
  {
    id: 'm1', cat: 'restaurant', tag: '5 estrelas', title: 'Maní', date: '01 Jun', by: 'Rafael',
    loc: 'Jardins, São Paulo',
    desc: 'Menu degustação incrível. O risoto de beterraba foi o prato da noite.',
    stars: 5, fav: true,
    reactions: [{ e: '❤️', n: 1, mine: true }, { e: '😍', n: 1, mine: false }],
    spotify: { track: 'La Vie en Rose', artist: 'Édith Piaf' },
    comments: [{ who: 'Luysa', text: 'Melhor jantar do ano 🥹' }, { who: 'Leonardo', text: 'Voltamos no aniversário!' }],
  },
  {
    id: 'm2', cat: 'movie', tag: 'assistido', title: 'Ennio', date: '28 Mai', by: 'Luysa', loc: null,
    desc: 'Documentário lindo sobre Morricone. Choramos juntos no final.',
    stars: 4, fav: false,
    reactions: [{ e: '😭', n: 2, mine: false }],
    spotify: { track: 'The Ecstasy of Gold', artist: 'Ennio Morricone' },
    comments: [{ who: 'Leonardo', text: 'Trilha sonora perfeita.' }],
  },
  {
    id: 'm3', cat: 'place', tag: 'viagem', title: "Arraial d'Ajuda", date: '14 Jul', by: 'Luysa',
    loc: 'Bahia',
    desc: 'Pousada perfeita, praia dos Coqueiros, pôr do sol inesquecível.',
    stars: 0, fav: true,
    reactions: [{ e: '🔥', n: 1, mine: true }, { e: '😍', n: 2, mine: false }],
    spotify: null,
    comments: [{ who: 'Leonardo', text: 'Quero voltar já 🌅' }],
  },
  {
    id: 'm4', cat: 'special', tag: '3 anos', title: '3 anos juntos', date: '14 Fev', by: 'Leonardo',
    loc: 'Casa',
    desc: 'Jantar surpresa e a noite mais especial do nosso relacionamento.',
    stars: 0, fav: true,
    reactions: [{ e: '❤️', n: 2, mine: true }, { e: '🥹', n: 1, mine: false }],
    spotify: { track: 'Tu', artist: 'Caetano Veloso' },
    comments: [],
  },
];

export const NOTES = [
  {
    id: 'n1', who: 'b', name: 'Leonardo', imp: true, time: '10:47 hoje',
    text: 'Já pensei onde vamos jantar no aniversário. Fica na espera pra descobrir onde!',
    loved: false,
  },
  {
    id: 'n2', who: 'a', name: 'Luysa', imp: false, time: 'Ontem 22:15',
    text: 'Não esquece de pegar o vinho que escolhemos na semana passada.',
    loved: true,
  },
  {
    id: 'n3', who: 'b', name: 'Leonardo', imp: true, time: '05 Jun',
    text: 'Te amo mais do que palavras conseguem dizer. Esses dias contigo foram os melhores da minha vida.',
    loved: true,
  },
  {
    id: 'n4', who: 'a', name: 'Luysa', imp: false, time: '03 Jun',
    text: 'Pesquisei hotéis em Gramado. Achei um incrível com lareira no quarto.',
    loved: false,
  },
];

export const MOVIES = [
  { id: 'f1', name: 'Oppenheimer', type: 'Filme', done: false, stars: 0, note: '' },
  { id: 'f2', name: 'Pobres Criaturas', type: 'Filme', done: false, stars: 0, note: '' },
  { id: 'f3', name: 'The Bear', type: 'Série', done: false, stars: 0, note: '' },
  { id: 'f4', name: 'Ennio', type: 'Filme', done: true, stars: 4, date: '28 Mai', note: 'Choramos no final.' },
  { id: 'f5', name: 'Past Lives', type: 'Filme', done: true, stars: 5, date: '12 Mai', note: 'Perfeito do início ao fim.' },
  { id: 'f6', name: 'Beef', type: 'Série', done: true, stars: 4, date: '02 Mai', note: 'Maratonamos num fim de semana.' },
];

export const TRIP = {
  dest: 'Gramado', dates: '10 – 15 Jul 2026',
  budget: 'R$ 3.500', spent: 'R$ 1.190', pct: 34,
  desc: 'Cinco dias na serra: vinícola, fondue, e a lareira que a Luysa achou.',
  check: [
    { id: 't1', label: 'Reservar hotel', ok: true },
    { id: 't2', label: 'Comprar passagens', ok: true },
    { id: 't3', label: 'Seguro viagem', ok: false },
    { id: 't4', label: 'Fazer as malas', ok: false },
  ],
  pack: [
    { id: 'p1', label: 'Casacos de frio', ok: true },
    { id: 'p2', label: 'Câmera', ok: true },
    { id: 'p3', label: 'Carregadores', ok: false },
    { id: 'p4', label: 'Remédios', ok: false },
    { id: 'p5', label: 'Documentos', ok: false },
  ],
};

export const STATS = { memories: 24, movies: 18, restaurants: 7, trips: 3, favRest: 'Maní', favMovie: 'Past Lives' };

export const NOTIFS = [
  { id: 'nt1', icon: 'cake', title: 'Faltam 18 dias', text: 'para o aniversário de namoro de vocês 💕', time: 'hoje' },
  { id: 'nt2', icon: 'movie', title: 'Vocês assistiram 5 filmes este mês!', text: 'Que tal registrar o próximo no diário?', time: 'hoje' },
  { id: 'nt3', icon: 'restaurant', title: 'Faz 1 mês sem restaurante novo', text: 'Já foram a 3 italianos — que tal um tailandês?', time: 'ontem' },
];

export const ACTIVITIES = [
  { title: 'Cozinhar uma receita nova juntos', cat: 'Em casa', diff: 'Fácil', time: '90 min' },
  { title: 'Piquenique no parque', cat: 'Date', diff: 'Fácil', time: '2h' },
  { title: 'Maratona de filme do diretor favorito', cat: 'Relax', diff: 'Fácil', time: '3h' },
  { title: 'Trilha de fim de tarde', cat: 'Aventura', diff: 'Médio', time: '3h' },
  { title: 'Aula de dança em casa pelo YouTube', cat: 'Em casa', diff: 'Fácil', time: '45 min' },
  { title: 'Visitar um museu novo', cat: 'Cultura', diff: 'Médio', time: '2h' },
  { title: 'Café da manhã na cama', cat: 'Relax', diff: 'Fácil', time: '1h' },
];

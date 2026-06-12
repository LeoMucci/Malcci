// Seed único: importa os lugares da história do casal (sistema antigo de mapa)
// para a tabela `memories` do Supabase. Idempotente — pula títulos já cadastrados.
//
// Uso: node scripts/seed-memories.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function loadEnv() {
  const content = readFileSync(join(root, '.env'), 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

const env = loadEnv();
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY não encontrados no .env');
  process.exit(1);
}

const supabase = createClient(url, key);

// created_by: 2 = Leonardo ("eu")
const AUTHOR_ID = 2;

/** Converte 'YYYY-MM-DD' em timestamp ao meio-dia de Brasília. */
const at = date => `${date}T12:00:00-03:00`;

/** Junta relato + citação. */
const story = (text, quote) => (quote ? `${text}\n\n“${quote}”` : text);

const MEMORIES = [
  {
    title: 'Estação Ana Rosa - A primeira vez que nos vimos',
    type: 'special',
    created_at: at('2024-10-29'),
    location: 'Estação Ana Rosa, São Paulo',
    latitude: -23.581389,
    longitude: -46.638647,
    photo_url: 'https://i.ytimg.com/vi/ipC_yCTnhss/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLD0a_IWVbYbrLiYFPQ-GxcQSMMJdQ',
    description: story('Momo encontrar você pela primeira vez foi como um instante fora do tempo. Eu lembro como tudo ao meu redor parecia ficar mais devagar, como se o mundo inteiro tivesse se moldado apenas para aquele momento. Você se destacando na multidão (COMO É LINDA MEU DEUS), meu coração super acelerado (quase desmaiandokkkkk)'),
  },
  {
    title: 'Nosso primeiro beijinhoo e primeiro encontro',
    type: 'special',
    created_at: at('2024-10-29'),
    location: 'Tok&Stok, Shopping Santa Cruz, São Paulo',
    latitude: -23.597984,
    longitude: -46.636741,
    photo_url: 'https://casadefirulas.com.br/wp-content/uploads/2017/04/tokstok10-660x373.jpg',
    description: story('Nosso primeiro beijinho eu nunca vou esquecer, na Tok&Stok do Shopping Santa Cruz, que também foi nosso primeiro encontro no cinema para assistir Sorria 2, e foi quando dei oii para meus amigões hehe', 'Eu me derreti e continuo me derretendo com seus beijinhos'),
  },
  {
    title: 'Museu do Ipiranga',
    type: 'place',
    created_at: at('2024-11-03'),
    location: 'Museu do Ipiranga, São Paulo',
    latitude: -23.585608,
    longitude: -46.609678,
    photo_url: 'https://ogimg.infoglobo.com.br/in/24625648-ce3-8ab/FT1086A/40066545985_302bd35ac8_k.jpg',
    description: story('Nosso segundo encontro, comemos um hamburguinho muiiiito gostoso e você ficou com o meu puique era mais gostoso, depois fomos para o museu e foi muiiiito legal, aaah e foi quando eu te dei frozinha pela primeira vez'),
  },
  {
    title: 'Primeiro Eu Te Amo',
    type: 'special',
    created_at: at('2024-11-16'),
    location: 'Saúde, São Paulo',
    latitude: -23.6098,
    longitude: -46.6263,
    photo_url: null,
    description: story('Eu fico todo bobinho só de lembrar desse dia, eu te peguei de uma prova, fomos comer, e depois quando te deixei em casa, você disse que me amava', 'Um dos dias mais felizes da minha vida'),
  },
  {
    title: 'Super piquenique',
    type: 'place',
    created_at: at('2024-11-21'),
    location: 'Parque da Independência, São Paulo',
    latitude: -23.584604,
    longitude: -46.609749,
    photo_url: null,
    description: story('Foi nosso super hiper mega piquenique muiiiiito gostoso, esse dia foi maravilhoso mo, e depois fomos no rodízio hehe'),
  },
  {
    title: 'Museu da Imigração',
    type: 'place',
    created_at: at('2024-11-25'),
    location: 'Museu da Imigração, São Paulo',
    latitude: -23.5492,
    longitude: -46.6131,
    photo_url: 'https://universoludico.com.br/wp-content/uploads/2020/07/Museu-da-Imigracao-1.jpg',
    description: story('Foi tão gostoso esse dia meu amooor, tiramos fotinhos juntinhos, procuramos nossos nomes no paredão de nomes, e tava acontecendo aquele festival italiano, e eu te dei suvete na boquinha'),
  },
  {
    title: 'O dia que você disse que queria namorar comigo',
    type: 'special',
    created_at: at('2024-12-07'),
    location: 'Fatec São Caetano do Sul',
    latitude: -23.62306,
    longitude: -46.55111,
    photo_url: 'https://atreus-prd.qconcursos.com/articles/images/45cae9f6-1a91-41ae-9d03-189e742b2b10/Fatec%20de%20S%C3%A3o%20Caetano%20do%20Sul%20-%20SP.jpg',
    description: story('Aiaiaia esse dia mo, também foi um dos dias mais felizes da minha vida, o dia do meu TCC, eu tava tão nervoso, mas é incrível como só com sua presença você consegue me acalmar, e foi dentro do carro antes do meu TCC que você confirmou que queria namorar comigo, eu fiquei todo bobo', 'EU TE AMO MUIIIIITOOO'),
  },
  {
    title: 'CineSala',
    type: 'place',
    created_at: at('2024-12-16'),
    location: 'CineSala, Pinheiros, São Paulo',
    latitude: -23.5665,
    longitude: -46.6915,
    photo_url: 'https://applications-media.feverup.com/image/upload/f_auto/fever2/plan/photo/40f7d952-361b-11ee-b8a9-6ee161c930b9.jpg',
    description: story('Cineminha juntinhos e agarradinhos no sofazão do CineSala e depois fomos comer um mexicano muiiito gostoso'),
  },
  {
    title: 'Ano novo na vovó',
    type: 'special',
    created_at: at('2025-01-01'),
    location: 'Casa da vovó',
    latitude: -23.6319159,
    longitude: -46.4902149,
    photo_url: null,
    description: story('Passamos o ano novo juntinhos na casa da vovó, foi tão gostosooo, te beijar nos fogos foi incrível mooo', 'O melhor ano novo da minha vida'),
  },
  {
    title: 'Guarujaa',
    type: 'place',
    created_at: at('2025-01-03'),
    location: 'Guarujá, SP',
    latitude: -23.9931,
    longitude: -46.2564,
    photo_url: null,
    description: story('Fomos para o Guarujá juntinhos e pegamos bastante trânsito, mas foi muito divertido ficar lá com você amor, tirando a parte do vírus bobão'),
  },
  {
    title: 'Aliança e cinema',
    type: 'special',
    created_at: at('2025-01-12'),
    location: 'Saúde, São Paulo',
    latitude: -23.6142428391239,
    longitude: -46.62343885890175,
    photo_url: null,
    description: story('Era para eu te dar a aliança dia 06 no Guarujá, mas não deu certo, então nesse dia eu te entreguei a aliança e fomos assistir meu filme favorito, brigadu momo'),
  },
  {
    title: 'StandUp',
    type: 'place',
    created_at: at('2025-01-31'),
    location: 'Barra Funda, São Paulo',
    latitude: -23.5275,
    longitude: -46.688,
    photo_url: null,
    description: story('Fomos no StandUp do Rafael e foi muito divertidoooo, demos muitas risadas. Eu amo a sua risada amor'),
  },
  {
    title: 'Marmitinhas',
    type: 'special',
    created_at: at('2025-02-02'),
    location: 'Em casa',
    latitude: -23.667645061563434,
    longitude: -46.47447254588378,
    photo_url: null,
    description: story('A gente fez marmitinhas para mim juntinhoooos e foi muito gostoso e divertido'),
  },
  {
    title: 'Paulista',
    type: 'place',
    created_at: at('2025-02-10'),
    location: 'Avenida Paulista, São Paulo',
    latitude: -23.5568,
    longitude: -46.6538,
    photo_url: null,
    description: story('Fomos na Paulista junto com a Julia e com o Léo e foi muito legal, você inventando várias mentiras askdkasdkas'),
  },
  {
    title: 'Busão para Guarujá',
    type: 'place',
    created_at: at('2025-02-16'),
    location: 'Terminal Jabaquara, São Paulo',
    latitude: -23.64556,
    longitude: -46.64167,
    photo_url: null,
    description: story('Primeira vez que viajei de busão e foi com o amor da minha vida juntinho comigooooo'),
  },
  {
    title: 'Minha Formatura',
    type: 'special',
    created_at: at('2025-02-19'),
    location: 'São Paulo',
    latitude: -23.5568,
    longitude: -46.6538,
    photo_url: null,
    description: story('Foi um dia muito especial e mais ainda puique você foi amor'),
  },
  {
    title: 'Liberdade',
    type: 'place',
    created_at: at('2025-03-06'),
    location: 'Liberdade, São Paulo',
    latitude: -23.5678,
    longitude: -46.6294,
    photo_url: null,
    description: story('Fomos comer lámen na Liberdade e compramos vários docinhos diferentes, um dia muiiiiito gostoso'),
  },
  {
    title: 'Super trilha',
    type: 'place',
    created_at: at('2025-03-17'),
    location: 'Serra do Mar, SP',
    latitude: -23.8152,
    longitude: -46.6246,
    photo_url: null,
    description: story('Esse dia foi tenso mas foi muiiito bom, fizemos um super passeio e depois uma super trilha, temos que fazer mais trilhas meu amor'),
  },
  {
    title: 'Primeira palestra juntos',
    type: 'place',
    created_at: at('2025-04-02'),
    location: 'Bela Vista, São Paulo',
    latitude: -23.5583,
    longitude: -46.659,
    photo_url: null,
    description: story('Foiiii muito legal esse dia mo, fomos juntos na palestra e depois fomos comemorar nosso mesversário de namoro no Coco Bambu'),
  },
  {
    title: 'Viagem e aniversário do tui',
    type: 'special',
    created_at: at('2025-04-18'),
    location: 'Chácara, interior',
    latitude: -22.5914,
    longitude: -46.5289,
    photo_url: null,
    description: story('Essa chácara foi muiiito divertida mo, dormir agarradinho no sofá, ver Pesadelo na Cozinha juntos na rede, a piscina tudoooo, fazer brigadeiro juntos, foi muito gostoso mo'),
  },
  {
    title: 'Aniversário do amor da minha vidaaaa',
    type: 'special',
    created_at: at('2025-04-26'),
    location: 'Outback, São Paulo',
    latitude: -23.619603508384976,
    longitude: -46.626752288214966,
    photo_url: null,
    description: story('Foi seu aniversário momoooooo, um dos dias mais especiais do anooo, fomos no Outback cumeee'),
  },
  {
    title: 'Meu aniversário',
    type: 'special',
    created_at: at('2025-05-20'),
    location: 'Paris 6, São Bernardo do Campo',
    latitude: -23.69114993486796,
    longitude: -46.55089119005822,
    photo_url: null,
    description: story('Meu aniversário e foi o melhor aniversário de todos, puique estava nele momo, e fomos no Paris 6 cumeee com meus pais'),
  },
  {
    title: 'Casar na Aurora Boreal - Islândia',
    type: 'special',
    created_at: null, // sonho futuro — fica com a data de hoje
    location: 'Islândia 🇮🇸',
    latitude: 64.9631,
    longitude: -19.0208,
    photo_url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400',
    description: story('Achou que eu ia esquecer mo???? Ainda vamos casar com a aurora boreal no céu ✨'),
  },
];

async function main() {
  const titles = MEMORIES.map(m => m.title);
  
  const { data: existing, error: selectError } = await supabase
    .from('memories')
    .select('id, title, latitude, longitude')
    .in('title', titles);

  if (selectError) {
    console.error('Falha ao consultar memórias existentes:', selectError.message);
    process.exit(1);
  }

  const existingRows = existing ?? [];
  const existingTitles = new Set(existingRows.map(r => r.title));

  console.log('Verificando atualizações de coordenadas para memórias existentes...');
  for (const row of existingRows) {
    const seed = MEMORIES.find(m => m.title === row.title);
    if (seed && seed.latitude && seed.longitude && (row.latitude === null || row.longitude === null)) {
      console.log(`Atualizando coordenadas de: "${row.title}" -> Lat: ${seed.latitude}, Lng: ${seed.longitude}`);
      const { error: updateError } = await supabase
        .from('memories')
        .update({ latitude: seed.latitude, longitude: seed.longitude })
        .eq('id', row.id);
      if (updateError) {
        console.error(`Falha ao atualizar coordenadas de "${row.title}":`, updateError.message);
      }
    }
  }

  const toInsert = MEMORIES.filter(m => !existingTitles.has(m.title)).map(m => {
    const row = {
      type: m.type,
      title: m.title,
      description: m.description,
      location: m.location,
      latitude: m.latitude,
      longitude: m.longitude,
      photo_url: m.photo_url,
      rating: null,
      created_by: AUTHOR_ID,
    };
    if (m.created_at) row.created_at = m.created_at;
    return row;
  });

  if (existingTitles.size > 0) {
    console.log(`Pulando ${existingTitles.size} já cadastradas: ${[...existingTitles].join(' | ')}`);
  }
  if (toInsert.length === 0) {
    console.log('Nada para inserir — tudo já cadastrado.');
    return;
  }

  const { data, error } = await supabase.from('memories').insert(toInsert).select('id, title');
  if (error) {
    console.error('Falha ao inserir:', error.message);
    process.exit(1);
  }
  console.log(`Inseridas ${data.length} memórias:`);
  for (const row of data) console.log(`  #${row.id} ${row.title}`);
}

main();

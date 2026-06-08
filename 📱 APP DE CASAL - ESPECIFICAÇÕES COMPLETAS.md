# 📱 APP DE CASAL - ESPECIFICAÇÕES COMPLETAS

## 🎯 VISÃO GERAL

Um aplicativo web para casais gerenciarem memórias, momentos especiais, planejamentos e comunicação do dia a dia. O app funciona com 2 usuários pré-definidos (o casal), sem necessidade de senha. Todas as funcionalidades são compartilhadas entre os dois.

---

## 👥 AUTENTICAÇÃO E USUÁRIOS

### Login
- **Sem senha**: Apenas seleção de usuário
- **2 Usuários fixos**: "Eu" e "Ela" (ou nomes customizáveis)
- **Lembrar usuário**: Salvar em localStorage qual usuário estava logado
- **Tela de Login**: Mostrar 2 botões com nomes dos usuários
- **Sessão**: Mostrar nome do usuário logado em algum lugar da interface (header/sidebar)

### Banco de Dados - Usuários
```
users
├── id (PK)
├── username (único) - "eu", "ela"
├── displayName - "João", "Maria"
└── createdAt
```

---

## 📸 MEMÓRIAS

### O que são?
Registros de momentos especiais do casal com fotos, localização, tipo, nota e descrição.

### Tipos de Memória
1. **Restaurante**: nome, endereço, nota (1-5), o que acharam da comida
2. **Filme/Série**: nome do filme, nota (1-5), se já assistiu, comentários
3. **Lugar**: nome, endereço, várias fotos, descrição
4. **Momento Especial**: descrição, várias fotos
5. **Compra/Presente**: nome, preço, link, descrição
6. **Outro**: genérico

### Funcionalidades
- **Criar**: Formulário com campos dinâmicos por tipo
- **Editar**: Poder editar após criar
- **Deletar**: Os dois podem deletar qualquer memória
- **Upload de fotos**: Suporta múltiplas fotos (salvar em S3)
- **Localização**: Campo de endereço + latitude/longitude
- **Rating**: 1-5 estrelas (para restaurantes e filmes)
- **Comentários**: Ambos podem comentar na memória
- **Reações**: Reagir com emojis (❤️, 😂, 😍, 🔥, etc)
- **Favoritos**: Marcar memória como favorita
- **Filtros**: Por tipo, por usuário que criou, por data
- **Busca**: Buscar por título, localização, data

### Banco de Dados - Memórias
```
memories
├── id (PK)
├── type - restaurant, movie, place, special, shopping, other
├── title
├── description
├── location
├── latitude / longitude
├── rating (1-5)
├── photoUrl
├── photoKey (S3)
├── createdBy (FK users)
├── createdAt
└── updatedAt

memory_comments
├── id (PK)
├── memoryId (FK)
├── authorId (FK users)
├── content
└── createdAt

memory_reactions
├── id (PK)
├── memoryId (FK)
├── userId (FK users)
├── emoji
└── createdAt

favorites
├── id (PK)
├── memoryId (FK)
├── userId (FK users)
└── createdAt
```

---

## 📱 ABAS PRINCIPAIS

### 1️⃣ FEED DE MEMÓRIAS
**Tela principal - Instagram-like**

- Mostrar todas as memórias em ordem cronológica (mais recentes primeiro)
- Cada card mostra:
  - Foto principal
  - Tipo de memória (ícone + label)
  - Título
  - Localização (se tiver)
  - Data
  - Quem criou
  - Rating (se tiver)
  - Descrição/Legenda
  - Número de comentários
  - Reações (emojis com contagem)
  - Botão de favorito
  - Botão editar/deletar (se for o criador)

- **Filtros**:
  - Por tipo de memória
  - Por usuário que criou
  - Por data
  - Apenas favoritos

- **Botão flutuante "+"**: Criar nova memória

- **Scroll infinito**: Carregar mais memórias ao rolar

### 2️⃣ MAPA INTERATIVO
**Visualizar todos os lugares visitados**

- Google Maps integrado
- Mostrar marcadores de todas as memórias com localização
- Cores diferentes por tipo:
  - 🍽️ Vermelho = Restaurante
  - 📍 Azul = Lugar
  - 🎬 Roxo = Filme (se tiver localização)
  - ⭐ Rosa = Momento Especial
  - 🛍️ Amarelo = Compra

- **Ao clicar em marcador**:
  - Popup com foto e informações
  - Link para ver detalhes completos

- **Filtros**: Checkbox para mostrar/esconder cada tipo

- **Adicionar memória direto do mapa**: Clicar no mapa e criar memória com localização

### 3️⃣ FILMES E SÉRIES
**Gerenciar filmes/séries que vocês assistem**

- 2 seções:
  - **Não Assistidos** (ordenado por data de adição)
  - **Já Assistidos** (ordenado por data que assistiu)

- Cada item mostra:
  - Título
  - Tipo (Filme/Série)
  - Rating (se tiver nota)
  - Data que assistiu
  - Botão marcar como assistido/não assistido
  - Botão editar nota
  - Link para memória (se foi assistido junto)

- **Botão "+"**: Adicionar novo filme/série

- **Busca**: Buscar filme por nome

### 4️⃣ RECADOS
**Deixar mensagens um para o outro**

- Lista de recados ordenada por data (mais recentes primeiro)
- Cada recado mostra:
  - Quem escreveu
  - Data e hora
  - Conteúdo
  - Ícone de importante (se for)
  - Botão deletar (quem escreveu pode deletar)

- **Notificação**: Quando novo recado é criado

- **Filtros**: Mostrar todos / Apenas importantes

- **Botão "+"**: Escrever novo recado

### 5️⃣ VIAGENS
**Planejar e registrar viagens**

- Cards de viagens ordenadas por data de início
- Cada card mostra:
  - Título
  - Destino
  - Datas (de - até)
  - Orçamento vs Gasto
  - Descrição

- **Ao clicar em uma viagem**:
  - Lista de coisas para levar (checkbox para marcar como pronto)
  - Fotos da viagem (link com memórias)
  - Mapa do destino
  - Descrição detalhada

- **Botão "+"**: Criar nova viagem

### 6️⃣ CALENDÁRIO
**Datas importantes do casal**

- Calendário mensal
- Eventos marcados em cores:
  - 🎂 Azul = Aniversário
  - 💕 Rosa = Aniversário de namoro
  - ⭐ Amarelo = Evento especial
  - 📌 Cinza = Lembrete

- **Ao clicar em dia com evento**:
  - Popup mostrando todos os eventos do dia
  - Opção editar/deletar

- **Notificações**: Lembretes por notificação
- **Mostrar quantos dias faltam** para próximas datas
- **Marcar como "já celebrado"**

- **Botão "+"**: Adicionar novo evento

### 7️⃣ COISAS LEGAIS (Wishlist)
**Coisas que querem comprar/fazer**

- Filtros por categoria:
  - 🛍️ Compras
  - 🎯 Experiências
  - 💡 Ideias
  - 📝 Outros

- Cada item mostra:
  - Título
  - Descrição
  - Prioridade (cor: vermelho=alta, amarelo=média, verde=baixa)
  - Preço
  - Link (se tiver)
  - Status: Não comprado / Comprado
  - Quem adicionou

- **Botão "+"**: Adicionar nova coisa legal

### 8️⃣ GALERIA
**Todas as fotos em um só lugar**

- Grid de todas as fotos
- Filtrar por tipo de memória
- Filtrar por data
- Slideshow
- Visualizar em fullscreen

### 9️⃣ TIMELINE/HISTÓRICO
**Ver tudo que vocês fizeram**

- Cronograma visual de eventos
- Tipo: "Visitaram Restaurante X em 15/03"
- "Assistiram Filme Y em 20/03"
- Ordenado por data
- Filtrar por tipo

### 🔟 ESTATÍSTICAS
**Resumo de tudo que vocês fizeram**

- Quantas memórias criaram
- Quantos filmes assistiram
- Quantos lugares visitaram
- Quantos restaurantes foram
- Filme mais bem avaliado
- Restaurante favorito
- Gráficos visuais

---

## ✨ FUNCIONALIDADES ESPECIAIS

### #16 - CONTADOR DE DIAS JUNTOS
**Widget mostrando há quanto tempo estão juntos**

- Mostrar em:
  - Dias
  - Meses
  - Anos
  - Exemplo: "347 dias, 11 meses e 2 anos juntos"

- **Animação especial** a cada marco (100 dias, 1 ano, etc)
- **Mostrar na tela inicial** ou em widget flutuante
- **Data configurável**: Poder editar data de início

### #19 - DIÁRIO DE CASAL
**Espaço para escrever sobre o dia**

- Cada entrada tem:
  - Texto
  - Foto (opcional)
  - Sentimento/Humor (happy, sad, excited, calm, romantic, tired, grateful)
  - Data e hora

- **Visualizar**:
  - Listar todas as entradas por data
  - Poder editar/deletar próprias entradas
  - Ver entradas do parceiro

- **Busca**: Buscar por data ou sentimento

### #26 - CRONOGRAMA SEMANAL/MENSAL
**Resumo visual do que vocês fizeram**

- **Semana**: "Semana de 15/03: 2 filmes, 1 restaurante, 1 passeio"
- **Mês**: "Março: 8 memórias, 5 filmes, 3 restaurantes"
- **Gráfico visual** mostrando distribuição

### #30 - NOTIFICAÇÕES INTELIGENTES
**Sugestões baseadas em padrões**

- "Faz 1 mês que vocês não vão a um restaurante"
- "Vocês assistiram 5 filmes esse mês!"
- "Faltam 10 dias para o aniversário dela"
- "Vocês visitaram 3 lugares esse mês, que tal tentar um novo tipo?"
- "Vocês foram a 3 restaurantes italianos, que tal tentar tailandês?"

### #31 - INTEGRAÇÃO COM SPOTIFY
**Mostrar qual música vocês estavam ouvindo**

- Ao criar memória, sincronizar com Spotify
- Mostrar música que estava tocando
- Salvar:
  - Nome da música
  - Artista
  - Capa do álbum
  - Link para ouvir

- **Playlist de momentos especiais**: Criar playlist com músicas de memórias importantes

### #34 - SORTEADOR DE ATIVIDADES
**Quando não sabe o que fazer**

- Botão "O que fazemos agora?"
- Sorteia atividade aleatória baseada em:
  - Dificuldade (fácil, médio, difícil)
  - Categoria (date, home, adventure, relax, food, culture, sport)
  - Tempo estimado

- **Histórico**: Ver atividades já sorteadas e marcadas como "feito"

### #36 - LEMBRETES DE DATAS ESPECIAIS
**Não esquecer datas importantes**

- Datas pré-configuradas:
  - Aniversário dele
  - Aniversário dela
  - Aniversário de namoro
  - Primeira vez que se viram
  - Primeiro beijo
  - Primeira data
  - Datas customizadas

- **Notificações**:
  - Lembretes automáticos
  - Mostrar quantos dias faltam
  - Notificação no dia

### #38 - VOTAÇÃO/ENQUETES
**Decidir juntos**

- Criar enquete: "Qual foi o melhor restaurante?"
- Opções customizáveis
- Ambos votam
- Ver resultado em tempo real
- Histórico de enquetes

### #40 - SUGESTÕES PERSONALIZADAS
**Recomendações baseadas em padrões**

- Analisar histórico
- Sugerir:
  - Novos tipos de restaurante
  - Novos gêneros de filme
  - Novos lugares para visitar
  - Atividades baseadas em preferências

---

## 🗄️ BANCO DE DADOS COMPLETO

```sql
-- USUÁRIOS
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) UNIQUE NOT NULL,
  displayName VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MEMÓRIAS
CREATE TABLE memories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('restaurant', 'movie', 'place', 'special', 'shopping', 'other') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description LONGTEXT,
  location VARCHAR(500),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  rating INT,
  photoUrl VARCHAR(500),
  photoKey VARCHAR(500),
  createdBy INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(id)
);

-- COMENTÁRIOS EM MEMÓRIAS
CREATE TABLE memory_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  memoryId INT NOT NULL,
  authorId INT NOT NULL,
  content LONGTEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (memoryId) REFERENCES memories(id) ON DELETE CASCADE,
  FOREIGN KEY (authorId) REFERENCES users(id)
);

-- REAÇÕES EM MEMÓRIAS
CREATE TABLE memory_reactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  memoryId INT NOT NULL,
  userId INT NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_reaction (memoryId, userId),
  FOREIGN KEY (memoryId) REFERENCES memories(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- FAVORITOS
CREATE TABLE favorites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  memoryId INT NOT NULL,
  userId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_favorite (memoryId, userId),
  FOREIGN KEY (memoryId) REFERENCES memories(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- RECADOS/MENSAGENS
CREATE TABLE messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  authorId INT NOT NULL,
  content LONGTEXT NOT NULL,
  isImportant BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (authorId) REFERENCES users(id)
);

-- DIÁRIO DE CASAL
CREATE TABLE diary_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  authorId INT NOT NULL,
  content LONGTEXT NOT NULL,
  mood ENUM('happy', 'sad', 'excited', 'calm', 'romantic', 'tired', 'grateful') DEFAULT 'happy',
  photoUrl VARCHAR(500),
  photoKey VARCHAR(500),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (authorId) REFERENCES users(id)
);

-- FILMES E SÉRIES
CREATE TABLE movies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  type ENUM('movie', 'series') NOT NULL,
  rating INT,
  watched BOOLEAN DEFAULT FALSE,
  watchedDate DATE,
  notes LONGTEXT,
  memoryId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (memoryId) REFERENCES memories(id) ON DELETE SET NULL
);

-- VIAGENS
CREATE TABLE trips (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  description LONGTEXT,
  budget DECIMAL(10, 2),
  spent DECIMAL(10, 2) DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ITENS DE VIAGEM
CREATE TABLE trip_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tripId INT NOT NULL,
  item VARCHAR(255) NOT NULL,
  packed BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
);

-- EVENTOS DO CALENDÁRIO
CREATE TABLE calendar_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  eventDate DATE NOT NULL,
  category ENUM('birthday', 'anniversary', 'special', 'reminder') NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- COISAS LEGAIS
CREATE TABLE cool_things (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description LONGTEXT,
  category ENUM('shopping', 'experience', 'idea', 'other') NOT NULL,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  price DECIMAL(10, 2),
  url VARCHAR(500),
  purchased BOOLEAN DEFAULT FALSE,
  purchasedDate DATE,
  createdBy INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(id)
);

-- DATAS ESPECIAIS
CREATE TABLE special_dates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  category ENUM('birthday_him', 'birthday_her', 'anniversary', 'first_kiss', 'first_date', 'custom') NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ESTATÍSTICAS
CREATE TABLE couple_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  totalMemories INT DEFAULT 0,
  totalMovies INT DEFAULT 0,
  totalPlaces INT DEFAULT 0,
  totalRestaurants INT DEFAULT 0,
  favoriteRestaurant VARCHAR(255),
  favoriteMovie VARCHAR(255),
  lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- VOTAÇÕES
CREATE TABLE polls (
  id INT PRIMARY KEY AUTO_INCREMENT,
  question VARCHAR(500) NOT NULL,
  createdBy INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(id)
);

-- OPÇÕES DE VOTAÇÃO
CREATE TABLE poll_options (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pollId INT NOT NULL,
  option VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pollId) REFERENCES polls(id) ON DELETE CASCADE
);

-- VOTOS
CREATE TABLE poll_votes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pollId INT NOT NULL,
  optionId INT NOT NULL,
  userId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_vote (pollId, userId),
  FOREIGN KEY (pollId) REFERENCES polls(id) ON DELETE CASCADE,
  FOREIGN KEY (optionId) REFERENCES poll_options(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- ATIVIDADES
CREATE TABLE activities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description LONGTEXT,
  category ENUM('date', 'home', 'adventure', 'relax', 'food', 'culture', 'sport', 'other') NOT NULL,
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  estimatedTime INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HISTÓRICO DE ATIVIDADES
CREATE TABLE activity_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  activityId INT NOT NULL,
  sortedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  done BOOLEAN DEFAULT FALSE,
  doneAt TIMESTAMP,
  FOREIGN KEY (activityId) REFERENCES activities(id)
);

-- INTEGRAÇÃO SPOTIFY
CREATE TABLE memory_spotify (
  id INT PRIMARY KEY AUTO_INCREMENT,
  memoryId INT NOT NULL,
  spotifyTrackId VARCHAR(255),
  trackName VARCHAR(255),
  artist VARCHAR(255),
  albumUrl VARCHAR(500),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_memory_spotify (memoryId),
  FOREIGN KEY (memoryId) REFERENCES memories(id) ON DELETE CASCADE
);

-- NOTIFICAÇÕES
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  type ENUM('new_memory', 'new_comment', 'new_message', 'birthday', 'anniversary', 'special_date', 'suggestion') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description LONGTEXT,
  relatedId INT,
  read BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🎨 DESIGN E INTERFACE

### Cores
- **Primária**: Rosa profundo (#C85A7C)
- **Secundária**: Ouro (#D4AF37)
- **Fundo**: Off-white (#F8F7F4)
- **Texto**: Cinza escuro (#2C2C2C)

### Tipografia
- **Títulos**: Serif elegante (Cormorant Garamond)
- **Corpo**: Sans-serif limpo (Inter)

### Componentes
- Ícones: Lucide React
- UI Components: shadcn/ui
- Animações: Framer Motion

---

## 🔄 FLUXO DE COMPORTAMENTO

### Ao Abrir o App
1. Verificar localStorage para usuário logado
2. Se tiver, ir direto para Feed
3. Se não tiver, mostrar tela de login

### Ao Criar Memória
1. Abrir modal/formulário
2. Selecionar tipo (campos dinâmicos por tipo)
3. Preencher campos obrigatórios
4. Upload de foto (opcional)
5. Salvar no banco
6. Notificar outro usuário
7. Voltar para feed

### Ao Comentar em Memória
1. Clicar em "comentar"
2. Abrir campo de texto
3. Digitar comentário
4. Enviar
5. Atualizar lista de comentários
6. Notificar criador da memória

### Ao Reagir em Memória
1. Clicar em emoji
2. Salvar reação
3. Atualizar contagem de reações
4. Se já reagiu com esse emoji, remover

### Ao Criar Recado
1. Abrir modal
2. Digitar mensagem
3. Opção de marcar como importante
4. Enviar
5. Notificar outro usuário
6. Voltar para feed de recados

### Ao Adicionar Filme
1. Abrir modal
2. Digitar nome do filme
3. Selecionar tipo (filme/série)
4. Opção de marcar como assistido
5. Se assistido, pedir data e nota
6. Salvar
7. Atualizar lista

### Ao Criar Viagem
1. Abrir modal
2. Preencher dados: título, destino, datas, orçamento
3. Salvar
4. Poder adicionar itens depois

### Ao Adicionar Data Especial
1. Abrir modal
2. Selecionar categoria (aniversário, etc)
3. Preencher data
4. Salvar
5. Sistema vai enviar notificação no dia

---

## 📲 NOTIFICAÇÕES

O app deve notificar quando:
- Novo recado é criado
- Novo comentário em memória
- Nova reação em memória
- Novo filme adicionado
- Data especial chegando (1 dia antes)
- Data especial chegou (no dia)
- Sugestão inteligente

---

## 🔐 SEGURANÇA E PERMISSÕES

- Usuário só pode editar/deletar o que criou (exceto memórias que ambos podem deletar)
- Todos os dados são compartilhados entre os 2 usuários
- Sem autenticação externa, apenas seleção de usuário
- Dados salvos em localStorage (sessão) e banco de dados

---

## 📊 PERFORMANCE

- Lazy loading de imagens
- Paginação/scroll infinito no feed
- Cache de dados locais
- Compressão de fotos antes de upload
- Índices no banco de dados para queries rápidas

---

## 🚀 PRÓXIMOS PASSOS

1. Criar tabelas no banco de dados
2. Implementar login
3. Implementar feed de memórias
4. Implementar criar memória
5. Implementar mapa
6. Implementar outras abas
7. Implementar funcionalidades especiais
8. Testes e ajustes

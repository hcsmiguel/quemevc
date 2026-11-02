# 🎭 Cara a Cara - Jogo Web Multiplayer (2 Jogadores)

Um jogo web inspirado no clássico jogo de tabuleiro **Cara a Cara** (*Guess Who?*), desenvolvido especificamente para jogar online entre dois computadores em tempo real.

---

## 🌟 Principais Recursos

1. **Privacidade Total de Tela**:
   - Cada jogador joga na sua própria tela / computador.
   - O seu tabuleiro de cartas abaixadas é **100% privado** — o oponente **NÃO** vê quais cartas você eliminou.
   - O seu personagem secreto fica visível apenas para você (com opção de ocultar com 1 clique se a pessoa passar por perto).
2. **Multiplayer em Tempo Real Sem Configuração (Zero-Config)**:
   - Funciona direto no **Vercel** sem precisar de banco de dados, conta em terceiros ou variáveis de ambiente.
   - Comunicação via WebSockets TLS seguros com salas isoladas por código (ex: `AMOR-7842`).
   - Botão para copiar o link da partida diretamente: a outra pessoa só clica no link e já entra na sala!
3. **Mecânicas Fiéis ao Jogo Clássico**:
   - Grade com **24 personagens diversos** e expressivos desenhados em vetor SVG puro.
   - Efeito físico de tombar as cartas com som tátil de plástico (*Web Audio API* sintetizado).
   - Menu com perguntas rápidas categorizadas (*"Usa óculos?"*, *"Tem barba?"*, *"Cabelo loiro?"*, etc.) ou campo de pergunta livre.
   - O jogador que recebe a pergunta clica em **SIM** ou **NÃO** com auxílio visual das características do seu personagem para nunca responder errado sem querer.
   - **Palpite Final de Vitória**: arrisque adivinhar quem é o oponente para vencer imediatamente!
   - Chuva de confetes com fanfarra triunfante na vitória e revelação de ambos os personagens secretos.
   - Botão de revanche rápida para emendar várias partidas seguidas.
   - Chat rápido e reações de emojis flutuantes.

---

## 🚀 Como Testar Localmente (Agora Mesmo!)

1. No terminal do projeto, execute:
   ```bash
   npm run dev
   ```
2. Abra `http://localhost:5173` no navegador.
3. Para simular os dois computadores:
   - Abra uma aba normal (digite seu nome, ex: **Miguel**, e clique em **Criar Sala**).
   - Abra uma aba anônima (digite o nome dela, ex: **Amor**, e entre com o código da sala gerado).
4. Ambos escolhem seus personagens secretos e jogam!

---

## ☁️ Como Subir no Vercel

Como o projeto é construído com **Vite + React**, ele já está 100% pronto para o Vercel:

### Opção 1: Via GitHub (Recomendado)
1. Crie um repositório no seu GitHub e suba esta pasta:
   ```bash
   git init
   git add .
   git commit -m "feat: Cara a Cara Multiplayer para 2 jogadores"
   git remote add origin https://github.com/SEU-USUARIO/cara-a-cara.git
   git push -u origin main
   ```
2. Acesse [vercel.com](https://vercel.com) e clique em **Add New Project**.
3. Importe o repositório. O Vercel detectará automaticamente o framework Vite.
4. Clique em **Deploy**! Em menos de 1 minuto o site estará no ar com link público HTTPS.

### Opção 2: Via Vercel CLI
1. Instale o CLI caso não tenha: `npm install -g vercel`
2. No diretório do projeto, execute:
   ```bash
   vercel
   ```
3. Pressione Enter nas opções padrão.

---

## 🛠️ Tecnologias Utilizadas

- **React 19 + TypeScript**
- **Vite** (Build ultra-rápido)
- **Tailwind CSS** (Design moderno responsivo)
- **Lucide React** (Ícones)
- **Web Audio API** (Efeitos sonoros nativos sem arquivos externos)
- **MQTT over WebSockets TLS** (Rede em tempo real sem servidor dedicado)
- **Canvas-Confetti** (Animação de vitória)

# Atividade 5 - Consumo de API com ReactJS

## Visão Geral

Visão Geral: Você deverá criar uma aplicação em React que consuma a API do TMDB (ou OMDb) para permitir que usuários busquem filmes, vejam detalhes e montem uma lista de favoritos.

## Funcionalidades Obrigatórias

1. Página de Busca

Um campo de texto para o usuário digitar o termo.  
Exibir lista de resultados com pôster, título, ano e botão para ver detalhes.

2. Paginação

Permitir navegar pelas páginas de resultados.

3. Página de Detalhes

Exibir informações completas (diretor, elenco, sinopse, avaliação) ao clicar em um filme.

4. Lista de Favoritos

Botão para adicionar/remover filmes da lista de favoritos.  
Persistir favoritos em localStorage.

5. Tratamento de Erros & Loading

Exibir indicador enquanto aguarda resposta e mensagens de erro quando necessário.

## Criação do Projeto com VITE

A criação do projeto foi realizada utilizando os comandos abaixos numa pasta vazia chamada `cine-finder`:

```bash
npm create vite@latest . -- --template react
npm install
```

## Executando a Aplicação

```bash
npm run dev
```

Após isso, abra o navegador e acesse `http://localhost:5173` para ver a aplicação em execução.

## Bibliotecas Utilizadas

- `axios`: Para realizar requisições HTTP.
- `react-router-dom`: Para gerenciar rotas da aplicação.
- `react-bootstrap`: Integração do Bootstrap com React.
- `react-icons`: Para ícones na interface.
- `dotenv`: Para gerenciar variáveis de ambiente.
- `mui/material`: Para componentes de interface do usuário.
- `@coreui/react` e `@coreui/coreui`: Para componentes adicionais de interface do usuário.
- `prime-react`: Para componentes de interface do usuário.
- `primeicons`: Para ícones utilizados pelo PrimeReact.

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto e adicione a variável `VITE_TMDB_ACCESS_TOKEN_AUTH` com sua chave da API do TMDB:

```plaintext
VITE_TMDB_ACCESS_TOKEN_AUTH=your_api_key_here
```

Existe um arquivo `.env.example` que serve como modelo para você criar o seu.

## Fontes consultadas

- [Documentação do TMDB API](https://developer.themoviedb.org/reference/movie-popular-list)
- [Documentação do React bootstrap 1](https://react-bootstrap.github.io/)
- [Documentação do React bootstrap 2](https://react-bootstrap.netlify.app/docs/components/navbar#containers)
- [Configuração de váriaveis de ambiente no VITE](https://mayconbalves.medium.com/configurando-vari%C3%A1veis-de-ambiente-com-reactjs-5c1521768590)
- [Importação de váriaveis de ambiente no VITE](https://stackoverflow.com/questions/30239060/uncaught-referenceerror-process-is-not-defined)
- [Documentação imagens do TMDB](https://developers.themoviedb.org/3/getting-started/images)
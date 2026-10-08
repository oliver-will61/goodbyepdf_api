# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

Conversor de arquivos (JSON ↔ Excel .xlsx) em dois serviços:
- **Express + TypeScript** (`src/`): serve o frontend estático, recebe uploads, valida e repassa para o conversor.
- **FastAPI + Pandas** (`python-service/`): faz a conversão. É um serviço **interno**, chamado só pelo Express (sem CORS, sem porta publicada no compose).

O `README.md` tem a documentação completa (endpoints, códigos de erro, variáveis de ambiente). Código, comentários, mensagens de erro e commits são em português.

## Regras do projeto

- Todo código deve ser comentado (comentários em português).
- O projeto é open source: siga boas práticas de código livre.
- Mensagens de commit seguem o padrão:
  - nova feature ou mudança: `feat/titulo do commit`
  - correção de erro: `hotfix/titulo do commit`
- Sempre que refatorar o código ou adicionar uma feature nova, atualize a documentação (`README.md` e, se for o caso, este `CLAUDE.md`).
- Toda feature nova deve vir acompanhada de testes (Jest, em uma pasta `__tests__/` ao lado do código). Correções de bug também ganham um teste que reproduz o erro. O `npm test` precisa passar antes do commit.

## Comandos

```bash
# Tudo com Docker (api em :3000, conversor só na rede interna)
docker compose up --build
npm run docker:dev   # modo dev com Docker (override docker-compose.dev.yml): bind mounts + hot reload + Tailwind watch

# Servidor TypeScript
npm install
npm run dev          # gera o CSS (sem minificar) e sobe ts-node-dev com hot reload (src/index.ts)
npm run dev:css      # Tailwind em modo watch (rodar em outro terminal)
npm run build        # tsc → dist/ + CSS minificado do Tailwind
npm start            # node dist/index.js
npm test             # Jest + ts-jest
npx jest src/services/__tests__/jsonXlsx.service.test.ts   # um arquivo de teste
npx jest -t "nome do teste"                     # um teste pelo nome

# Serviço Python
cd python-service && source myvenv/bin/activate
pip install -r requirements.txt
python run.py        # dev; lê python-service/.env (WORKERS é obrigatório)
```

O Express precisa de `.env` na raiz com `PORT`, `HOST` e `CONVERSOR_API_URL` (ex.: `http://localhost:5000`, sem barra final); modelo em `.env.example`. O Docker Compose também lê esse `.env` e recusa linhas sem `#` ou com espaço ao redor do `=`. Sem o Python rodando, as rotas de conversão retornam 500 e `GET /health` retorna 503.

## Arquitetura (camadas do servidor TypeScript)

Cada camada tem uma responsabilidade, e cada conversão (feature) tem seu próprio arquivo em `routes/`, `controllers/` e `services/` (ex.: `jsonXlsx.routes.ts`, `jsonXlsx.controller.ts`, `jsonXlsx.service.ts`):

- `src/routes/`: só define endpoints e middlewares. `routes/index.ts` reúne as rotas de todas as features e é montado em `app.ts`.
- `src/controllers/`: recebe `req`/`res`, extrai o arquivo (`utils/http.ts` → `extraiArquivo`), chama o service e responde (`enviaArquivo` para o arquivo convertido, JSON no health). Não valida nem tem regra de negócio.
- `src/services/`: validações e regras de negócio, sem conhecer o Express (recebem `ArquivoRecebido`, devolvem `ArquivoConvertido`, de `types/arquivos.ts`). `conversor.service.ts` é o cliente HTTP do Python: devolve `Buffer` ou lança `ConversorError`; nunca escreve na resposta.
- `src/middlewares/`: `upload.ts` (Multer em `memoryStorage`, campo `arquivo`, limite de `constants/limites.ts` + 1 byte porque o busboy acusa o limite ao atingir exatamente o valor) e `trataErros.ts` (registrado depois das rotas; converte `AppError` em `{ success: false, mensagem, code }` com o status do erro, o erro de tamanho do Multer em 413 e qualquer outro erro em 500 `INTERNAL_ERROR`, sem expor detalhes).
- `src/utils/`: funções puras de arquivo (`obtemExtensao`, `trocaExtensao`, `possuiAssinatura`, `ehJsonValido`) e helpers de req/res.
- `src/errors/AppError.ts`: `AppError(message, code, status)`, `FileValidationError` (400, ou 413 em `FILE_TOO_LARGE`) e `ConversorError` (4xx do Python repassado como `CONVERSION_FAILED`; 5xx/timeout/conexão viram 500 `CONVERTER_UNAVAILABLE`, detalhe só no log).
- Controllers são `async` e não usam try/catch: o Express 5 repassa rejeições ao `trataErros`.
- Nada é gravado em disco (não há pasta `upload`); o teste de integração da rota garante isso.
- `python-service/main.py` → `controllers/` → `models/Gerenciador_*.py` (Pandas faz a conversão).

Mensagens e códigos de erro ficam em `src/constants/errorMessages.ts`; formatos (extensão, MIME, assinatura do .xlsx) em `src/constants/formatos.ts`; endpoints do Python em `src/constants/endpointsConversor.ts`. Para adicionar uma conversão nova, siga a seção "Como adicionar uma nova conversão" do README.

## Pontos de atenção

- Testes (Jest + ts-jest) em `__tests__/` ao lado de cada camada. Services e utils têm testes unitários; cada feature tem um teste de integração em `routes/__tests__/` (com `supertest` sobre o `app` real e só o `conversorService` mockado). Fixtures em `src/test-utils/` (fora do build). Não dependem do Python nem de rede.
- `form-data` é importado em `conversor.service.ts` mas não está no `package.json` (vem via axios).
- O CORS em `src/app.ts` só aceita `https://willian-ribeiro.com`.
- O frontend (`frontend/public`) é HTML + JS puro (ES modules), servido como estático pelo Express. O único build é o do Tailwind v4: `frontend/src/styles/main.css` → `frontend/public/assets/css/styles.css` (gerado, no `.gitignore`).
- Cor primária `#EA1D2C` (escala `primary-*` em `@theme`), fundo branco; modo escuro por classe `dark` no `<html>` (`assets/js/components/tema.js` + script inline no `<head>` de cada página).
- As páginas de conversão compartilham `assets/js/pages/conversor.js`, configurado pelos `data-*` do `<form>`. Cabeçalho e rodapé são repetidos em cada HTML: ao mudar um, mude em todos.
- Classes Tailwind precisam aparecer por inteiro no HTML/JS (nada de concatenar nomes de classe).

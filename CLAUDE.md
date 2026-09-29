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

## Comandos

```bash
# Tudo com Docker (api em :3000, conversor só na rede interna)
docker compose up --build

# Servidor TypeScript
npm install
npm run dev          # ts-node-dev com hot reload (src/index.ts)
npm run build        # tsc → dist/
npm start            # node dist/index.js
npm test             # Jest + ts-jest
npx jest src/models/__tests__/Arquivo.test.ts   # um arquivo de teste
npx jest -t "nome do teste"                     # um teste pelo nome

# Serviço Python
cd python-service && source myvenv/bin/activate
pip install -r requirements.txt
python run.py        # dev; lê python-service/.env (WORKERS é obrigatório)
```

O Express precisa de `.env` na raiz com `PORT`, `HOST` e `CONVERSOR_API_URL` (ex.: `http://localhost:5000`, sem barra final). Sem o Python rodando, as rotas de conversão retornam 500 e `GET /health` retorna 503.

## Arquitetura (fluxo de uma conversão)

1. `src/router/goodbyepdfRouter.ts`: rotas `POST /xlsx-json` e `POST /json-xlsx`, Multer em `memoryStorage` com campo `arquivo`.
2. `src/controllers/arquivosController.ts`: uma instância de `Controller` por conversão, parametrizada com o tipo esperado (`Arquivo.TIPOS`) e o endpoint Python (`src/constants/endpoinsApi.ts`).
3. `src/models/Controller.ts` → `handleUpload`: cria `Arquivo`, escolhe a validação por `switch` sobre o tipo esperado e mapeia erros para HTTP (`FileValidationError` → 400, `ValidationError` → 404, outros → 500).
4. `src/models/Arquivo.ts`: valida extensão, `JSON.parse` e a assinatura de 6 bytes do .xlsx. A assinatura é capturada no constructor, depois de `this.arquivo` ser atribuído (não mova para inicializador de campo).
5. `src/services/CallAPIPython.ts`: reenvia o buffer via axios (`responseType: 'arraybuffer'`) e devolve os bytes ao cliente. Erros 4xx do Python (ex.: 422 do Pandas) são repassados com o mesmo status; o corpo de erro vem em arraybuffer e é decodificado.
6. `python-service/main.py` → `controllers/` → `models/Gerenciador_*.py` (Pandas faz a conversão).

Mensagens e códigos de erro ficam centralizados em `src/constants/errorMessages.ts`. Para adicionar uma conversão nova, siga a seção "Como adicionar uma nova conversão" do README.

## Pontos de atenção

- Os testes em `src/models/__tests__/` estão desatualizados (usam `validaArquivo` e `FactoryController`, que não existem mais) e falham hoje.
- `form-data` é importado em `CallAPIPython.ts` mas não está no `package.json` (vem via axios).
- O CORS em `src/app.ts` só aceita `https://willian-ribeiro.com`.
- O frontend (`frontend/public`) é JS puro, servido como estático pelo Express; não tem build.

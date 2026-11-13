# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

Conversor de arquivos (JSON ↔ Excel .xlsx, PDF → Word .docx, PDF → PowerPoint .pptx, PDF → Excel .xlsx e Excel .xlsx → PDF) em dois serviços:
- **Express + TypeScript** (`src/`): serve o frontend estático, recebe uploads, valida e repassa para o conversor.
- **FastAPI + Pandas + pdf2docx + python-pptx + LibreOffice headless** (`python-service/`): faz a conversão. É um serviço **interno**, chamado só pelo Express (sem CORS, sem porta publicada no compose).

O `README.md` tem a documentação completa (endpoints, códigos de erro, variáveis de ambiente). Código, comentários, mensagens de erro e commits são em português.

## Regras do projeto

- Todo código deve ser comentado (comentários em português).
- O projeto é open source, sob **AGPL-3.0-or-later** (`LICENSE`), exigida pelo PyMuPDF (dependência da pdf2docx). Novas dependências precisam ter licença compatível com a AGPL. Siga boas práticas de código livre.
- Mensagens de commit seguem o padrão:
  - nova feature ou mudança: `feat/titulo do commit`
  - correção de erro: `hotfix/titulo do commit`
- Sempre que refatorar o código ou adicionar uma feature nova, atualize a documentação (`README.md` e, se for o caso, este `CLAUDE.md`).
- Toda feature nova deve vir acompanhada de testes (Jest, na pasta `tests/` da raiz, irmã de `src/`, com as mesmas subpastas de `src/`). Correções de bug também ganham um teste que reproduz o erro. O `npm test` precisa passar antes do commit.
- Não é permitido remover (nem desativar com `skip`/`only`, nem afrouxar asserções de) testes para fazer a compilação ou o `npm test` passar: corrija o código ou, se o comportamento mudou de propósito, atualize o teste para refletir o novo comportamento.

## Comandos

```bash
# Tudo com Docker (api em :3000, conversor só na rede interna)
docker compose up --build
npm run docker:dev   # modo dev com Docker (override docker-compose.dev.yml): bind mounts + hot reload + Tailwind watch
npm run docker:prod  # produção (override docker-compose.prod.yml): Caddy com HTTPS em 80/443 para DOMINIO do .env, api sem porta publicada, restart e logs rotacionados

# Servidor TypeScript
npm install
npm run dev          # gera o CSS (sem minificar) e sobe ts-node-dev com hot reload (src/index.ts)
npm run dev:css      # Tailwind em modo watch (rodar em outro terminal)
npm run build        # tsc → dist/ + CSS minificado do Tailwind
npm start            # node dist/index.js
npm test             # Jest + ts-jest
npx jest tests/services/jsonXlsx.service.test.ts   # um arquivo de teste
npx jest -t "nome do teste"                     # um teste pelo nome

# Serviço Python
cd python-service && source myvenv/bin/activate
pip install -r requirements.txt
python run.py        # dev; lê python-service/.env (WORKERS é obrigatório)
```

O Express precisa de `.env` na raiz com `PORT`, `HOST` e `CONVERSOR_API_URL` (ex.: `http://localhost:5000`, sem barra final); modelo em `.env.example`. O Docker Compose também lê esse `.env` e recusa linhas sem `#` ou com espaço ao redor do `=`. Sem o Python rodando, as rotas de conversão retornam 500 e `GET /health` retorna 503. Em produção, `docker-compose.prod.yml` exige também `DOMINIO` (e aceita `WORKERS_CONVERSOR`, padrão 2) no `.env`; o `Caddyfile` limita o corpo a 11 MB e espera 130 s pelo proxy. O passo a passo do deploy na VPS da Hostinger está no README.

## Arquitetura (camadas do servidor TypeScript)

Cada camada tem uma responsabilidade, e cada conversão (feature) tem seu próprio arquivo em `routes/`, `controllers/` e `services/` (ex.: `jsonXlsx.routes.ts`, `jsonXlsx.controller.ts`, `jsonXlsx.service.ts`):

- `src/routes/`: só define endpoints e middlewares. `routes/index.ts` reúne as rotas de todas as features e é montado em `app.ts`.
- `src/controllers/`: recebe `req`/`res`, extrai o arquivo (`utils/http.ts` → `extraiArquivo`), chama o service e responde (`enviaArquivo` para o arquivo convertido, JSON no health). Não valida nem tem regra de negócio.
- `src/validators/`: validação do arquivo recebido, um arquivo por formato (`pdf.validator.ts` → `validaArquivoPdf`, `xlsx.validator.ts`, `json.validator.ts`): confere a extensão e o conteúdo (assinatura ou JSON válido) e lança `FileValidationError`. Fica fora dos services para ser reaproveitada por qualquer feature que receba o formato; um service nunca importa outro service de feature.
- `src/services/`: regras de negócio de cada conversão (chama o validador do formato, o conversor e monta o resultado), sem conhecer o Express (recebem `ArquivoRecebido`, devolvem `ArquivoConvertido`, de `types/arquivos.ts`). `conversor.service.ts` é o cliente HTTP do Python: devolve `Buffer` ou lança `ConversorError`; nunca escreve na resposta.
- `src/middlewares/`: `upload.ts` (Multer em `memoryStorage`, campo `arquivo`, limite de `constants/limites.ts` + 1 byte porque o busboy acusa o limite ao atingir exatamente o valor) e `trataErros.ts` (registrado depois das rotas; converte `AppError` em `{ success: false, mensagem, code }` com o status do erro, o erro de tamanho do Multer em 413 e qualquer outro erro em 500 `INTERNAL_ERROR`, sem expor detalhes).
- `src/utils/`: funções puras de arquivo (`obtemExtensao`, `trocaExtensao`, `possuiAssinatura`, `ehJsonValido`) e helpers de req/res.
- `src/errors/AppError.ts`: `AppError(message, code, status)`, `FileValidationError` (400, ou 413 em `FILE_TOO_LARGE`) e `ConversorError` (4xx do Python repassado como `CONVERSION_FAILED`; 5xx/timeout/conexão viram 500 `CONVERTER_UNAVAILABLE`, detalhe só no log).
- Controllers são `async` e não usam try/catch: o Express 5 repassa rejeições ao `trataErros`.
- O Express não grava nada em disco (não há pasta `upload`); o teste de integração da rota garante isso.
- `python-service/main.py` → `controllers/` → `models/Gerenciador_*.py` (Pandas faz JSON ↔ Excel; `Gerenciador_pdf.py` usa a pdf2docx com entrada e saída em memória). A conversão de PDF roda em `run_in_threadpool` (é síncrona e pesada) e o Express espera até 120 s por ela (`TIMEOUT_PDF_DOCX_MS` em `pdfDocx.service.ts`, passado ao `conversorService.converte`). PDF corrompido/protegido por senha vira 422 no Python. PDF → PowerPoint (`pdfPptx.service.ts`, usa o mesmo `validaArquivoPdf` de `validators/pdf.validator.ts`) segue o mesmo esquema (`run_in_threadpool`, `TIMEOUT_PDF_PPTX_MS` de 120 s): `Gerenciador_pdf.convertePptx` renderiza cada página como PNG com PyMuPDF e põe uma por slide com a python-pptx (texto não editável). Excel → PDF (`xlsxPdf.service.ts`, reaproveita `validaArquivoXlsx`, `TIMEOUT_XLSX_PDF_MS` de 120 s): `Gerenciador_xlsx.convertePdf` roda `soffice --headless --convert-to pdf` (todas as abas) via `subprocess` em um `TemporaryDirectory` com perfil próprio por conversão (permite concorrência) e timeout de 100 s; é a única conversão que toca o disco (só no container Python). O LibreOffice é instalado no `python-service/Dockerfile`; fora do Docker, `soffice` precisa estar no `PATH`. PDF → Excel (`pdfXlsx.service.ts`, `validaArquivoPdf`, `TIMEOUT_PDF_XLSX_MS` de 120 s): `Gerenciador_pdf.converteXlsx` usa `page.find_tables()` do PyMuPDF e a openpyxl, uma aba por tabela ("Pág N - Tabela M"); sem tabelas, uma aba por página com o texto. Números simples viram número (regex `PADRAO_NUMERO`; `1.234` e zeros à esquerda ficam texto). `Gerenciador_pdf._abreDocumento` centraliza a abertura e as recusas (senha, sem páginas) das conversões pptx/xlsx.

Mensagens e códigos de erro ficam em `src/constants/errorMessages.ts`; formatos (extensão, MIME, assinatura do .xlsx) em `src/constants/formatos.ts`; endpoints do Python em `src/constants/endpointsConversor.ts`. Para adicionar uma conversão nova, siga a seção "Como adicionar uma nova conversão" do README.

## Pontos de atenção

- Testes (Jest + ts-jest) em `tests/` (irmã de `src/`), espelhando as camadas (`tests/services/`, `tests/routes/`...); importam o código por `../../src/...`. Validators, services e utils têm testes unitários; cada feature tem um teste de integração em `tests/routes/` (com `supertest` sobre o `app` real e só o `conversorService` mockado). Fixtures em `tests/fixtures.ts`. O ts-jest usa `tests/tsconfig.json` (herda o da raiz, com `rootDir` na raiz); o build só inclui `src/`. Não dependem do Python nem de rede.
- `form-data` é importado em `conversor.service.ts` mas não está no `package.json` (vem via axios).
- O CORS em `src/app.ts` só aceita `https://willian-ribeiro.com`.
- O frontend (`frontend/public`) é HTML + JS puro (ES modules), servido como estático pelo Express. O único build é o do Tailwind v4: `frontend/src/styles/main.css` → `frontend/public/assets/css/styles.css` (gerado, no `.gitignore`).
- Cor primária `#EA1D2C` (escala `primary-*` em `@theme`), fundo branco; modo escuro por classe `dark` no `<html>` (`assets/js/components/tema.js` + script inline no `<head>` de cada página).
- As páginas de conversão compartilham `assets/js/pages/conversor.js`, configurado pelos `data-*` do `<form>`. Cabeçalho (com o menu mobile) e rodapé são repetidos em cada HTML: ao mudar um, mude em todos. A navegação do cabeçalho só aparece a partir de `xl` (abaixo disso, menu mobile), porque os 7 links não cabem em `lg`.
- Classes Tailwind precisam aparecer por inteiro no HTML/JS (nada de concatenar nomes de classe).

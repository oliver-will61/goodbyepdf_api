# GoodbyePDF API

Projeto open source, em desenvolvimento, que propõe uma alternativa ao iLovePDF: uma aplicação web e uma API para conversão de arquivos entre formatos. Hoje o projeto converte **JSON → Excel (.xlsx)** e **Excel (.xlsx) → JSON**.

A arquitetura separa duas responsabilidades:

- **Servidor TypeScript (Express)**: serve o frontend, recebe os uploads, valida os arquivos e encaminha para o conversor.
- **Serviço de conversão Python (FastAPI + Pandas)**: faz a conversão propriamente dita e devolve o arquivo convertido.

---

## Sumário

- [Arquitetura](#arquitetura)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Pré-requisitos](#pré-requisitos)
- [Configuração (.env)](#configuração-env)
- [Como executar](#como-executar)
- [Endpoints](#endpoints)
- [Validação de arquivos e erros](#validação-de-arquivos-e-erros)
- [Frontend](#frontend)
- [Testes](#testes)
- [Pendências conhecidas](#pendências-conhecidas)

---

## Arquitetura

```
┌──────────────┐   multipart/form-data   ┌────────────────────────┐   multipart/form-data   ┌──────────────────────┐
│   Frontend   │ ──────────────────────▶ │  Servidor TypeScript   │ ──────────────────────▶ │  Conversor Python    │
│ (HTML + JS)  │        campo "arquivo"  │  Express + Multer      │        campo "arquivo"  │  FastAPI + Pandas    │
│              │ ◀────────────────────── │  valida extensão e     │ ◀────────────────────── │  converte e devolve  │
│  download    │    arquivo convertido   │  conteúdo do arquivo   │    arquivo convertido   │  os bytes do arquivo │
└──────────────┘                         └────────────────────────┘                         └──────────────────────┘
```

Fluxo de uma requisição:

1. O usuário envia o arquivo por uma das páginas do frontend (ou direto pela API).
2. O Express recebe o upload com o **Multer** em memória (`memoryStorage`): o arquivo fica só em `req.file.buffer`, nada é gravado em disco.
3. O `Controller` cria um objeto `Arquivo` e valida extensão e conteúdo (JSON parseável ou assinatura de Excel).
4. O `CallAPIPython` repassa o arquivo validado para o serviço Python (`CONVERSOR_API_URL` + endpoint).
5. O Python converte com Pandas e devolve os bytes. O Express repassa a resposta ao cliente, que dispara o download.

### Serviço interno

O conversor Python é um **serviço interno**. Só o Express o chama, de servidor para servidor. Por isso:

- **Não fica exposto à internet.** No `docker-compose.yml` ele não publica porta, e o Express o acessa pela rede interna (`http://conversor:5000`).
- **Não usa CORS.** CORS é uma regra do navegador, e o navegador nunca fala direto com o conversor.
- **Tem um contrato.** O FastAPI gera a documentação OpenAPI em `/docs`.
- **Expõe `GET /health`.** O Express e o orquestrador usam essa rota para saber se o serviço está no ar.
- **Repassa os erros com o status certo.** Conteúdo que o Pandas não consegue ler gera 422, e o Express devolve esse status ao cliente em vez de um 500.

Se surgirem conversões pesadas (PDF, arquivos grandes), o próximo passo é trocar a chamada síncrona por uma fila: Redis + worker, com `job_id` e consulta de status.

---

## Estrutura de pastas

```
goodbyepdf_api/
├── src/                          # Servidor TypeScript (Express)
│   ├── index.ts                  # Ponto de entrada: carrega .env e sobe o servidor
│   ├── app.ts                    # Configura Express, CORS, arquivos estáticos e rotas
│   ├── router/
│   │   ├── goodbyepdfRouter.ts   # Rotas de upload (/xlsx-json, /json-xlsx) com Multer
│   │   └── goodbyepdfPagesRouter.ts  # (desativado) rotas antigas de páginas
│   ├── controllers/
│   │   └── arquivosController.ts # Instâncias de Controller para cada conversão
│   ├── models/
│   │   ├── Controller.ts         # Fluxo de upload: valida → envia ao Python → trata erros
│   │   ├── Arquivo.ts            # Validação de extensão, JSON e assinatura do Excel
│   │   ├── AppError.ts           # Hierarquia de erros (AppError, ValidationError, FileValidationError)
│   │   └── __tests__/            # Testes de Arquivo, AppError e Controller
│   ├── services/
│   │   ├── CallAPIPython.ts      # Cliente HTTP (axios) para o serviço Python
│   │   └── __tests__/            # Testes do CallAPIPython (axios mockado)
│   └── constants/
│       ├── endpoinsApi.ts        # Endpoints do serviço Python
│       └── errorMessages.ts      # Mensagens e códigos de erro
│
├── python-service/               # Serviço de conversão (FastAPI)
│   ├── main.py                   # App FastAPI e rotas /api/xlsx-json e /api/json-xlsx
│   ├── run.py                    # Execução em desenvolvimento (lê o .env)
│   ├── controllers/
│   │   ├── xlsx_json_controller.py
│   │   └── json_xlsx_controller.py
│   ├── models/
│   │   ├── Gerenciador_xlsx.py   # Excel → JSON (pandas.read_excel / to_json)
│   │   └── Gerenciador_json.py   # JSON → Excel (pandas.read_json / to_excel)
│   ├── Dockerfile                # Imagem do conversor
│   └── requirements.txt
│
├── frontend/                     # Frontend (HTML + JS puro + Tailwind CSS)
│   ├── src/styles/main.css       # Entrada do Tailwind: tema (cor primária), modo escuro, componentes
│   └── public/                   # Servido como estático pelo Express
│       ├── index.html            # Página inicial (/)
│       ├── pages/
│       │   ├── json-para-xlsx.html   # Conversão JSON → Excel
│       │   └── xlsx-para-json.html   # Conversão Excel → JSON
│       └── assets/
│           ├── css/styles.css    # CSS gerado pelo Tailwind (não versionado)
│           ├── img/favicon.svg
│           └── js/
│               ├── components/
│               │   ├── tema.js   # Alterna modo claro/escuro e salva a escolha
│               │   └── menu.js   # Menu de navegação em telas pequenas
│               ├── models/Arquivo.js     # Validação de extensão no cliente e envio do arquivo
│               ├── pages/conversor.js    # Lógica das páginas de conversão (upload, arrastar e soltar, download)
│               └── utils/geraDownload.js # Converte a resposta em blob e dispara o download
│
├── postman-testes/               # Arquivos de exemplo usados em testes manuais
├── Dockerfile                    # Imagem do servidor Express
├── docker-compose.yml            # Sobe api (pública) + conversor (interno)
├── package.json
├── tsconfig.json
└── jest.config.js
```

---

## Pré-requisitos

- **Node.js** 20+ e npm
- **Python** 3.13+ e pip

---

## Configuração (.env)

Os dois serviços leem variáveis de ambiente de arquivos `.env`, que não são versionados.

### Servidor TypeScript: `./.env`

Use o modelo versionado como ponto de partida:

```bash
cp .env.example .env
```

> O Docker Compose também lê este arquivo, e o parser dele é mais rígido que o do `dotenv`: comentários precisam começar com `#` e não pode haver espaço ao redor do `=` (`PORT=3000`, não `PORT = 3000`). Caso contrário, o `docker compose` falha com `failed to read .env: ... key cannot contain a space`.

| Variável            | Descrição                                          | Exemplo                 |
|---------------------|----------------------------------------------------|-------------------------|
| `HOST`              | Host exibido no log de inicialização               | `http://localhost`      |
| `PORT`              | Porta do servidor Express                          | `3000`                  |
| `CONVERSOR_API_URL` | URL base do serviço Python (sem barra no final)    | `http://localhost:5000` |

### Serviço Python: `./python-service/.env`

Usado apenas pelo `run.py`.

| Variável    | Descrição                                  | Exemplo   |
|-------------|--------------------------------------------|-----------|
| `HOST`      | Host do uvicorn                            | `0.0.0.0` |
| `PORT`      | Porta do uvicorn                           | `5000`    |
| `RELOAD`    | Recarrega automaticamente ao salvar        | `true`    |
| `LOG_LEVEL` | Nível de log do uvicorn                    | `info`    |
| `WORKERS`   | Número de workers (**obrigatório**)        | `1`       |

> O `run.py` falha se `WORKERS` não estiver definido. Com `RELOAD=true`, o uvicorn ignora `WORKERS`.

---

## Como executar

### Com Docker (recomendado)

```bash
docker compose up --build
```

A aplicação sobe em `http://localhost:3000`. O conversor fica acessível só dentro da rede do compose. Com Podman, use `podman compose up --build` (requer `podman-compose` ou `docker-compose` instalado).

Se aparecer `permission denied while trying to connect to the docker API at unix:///var/run/docker.sock`, seu usuário não tem acesso ao daemon do Docker. Adicione-o ao grupo `docker` e faça logout/login (ou rode `newgrp docker`):

```bash
sudo usermod -aG docker $USER
```

> Estar no grupo `docker` equivale a ter acesso root na máquina. Se preferir não fazer isso, rode `sudo docker compose up --build`.

#### Modo desenvolvimento

O comando acima sobe o modo de **produção**: o código é copiado para a imagem, e qualquer mudança exige `--build`. Para desenvolver com Docker, use o override `docker-compose.dev.yml`:

```bash
npm run docker:dev
# equivale a:
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Nesse modo, `src/`, `frontend/` e `python-service/` são montados nos containers, e as mudanças aparecem sem rebuild:

| Serviço     | O que faz                                                         |
|-------------|-------------------------------------------------------------------|
| `api`       | `npm run dev` (ts-node-dev): reinicia ao salvar arquivos `.ts`     |
| `css`       | Tailwind em modo watch: recompila o `styles.css` (legível) ao salvar HTML, JS ou `main.css` |
| `conversor` | `uvicorn --reload`: recarrega ao salvar arquivos `.py`             |

Mudanças no `package.json` ou no `requirements.txt` exigem subir de novo com `--build`. Os containers do Node rodam com o usuário `node` (UID 1000) para que os arquivos gerados nas pastas montadas não fiquem com dono `root`; se o seu UID for outro, ajuste o `user` no `docker-compose.dev.yml`.

### Sem Docker

Suba os dois serviços. O Express depende do Python para converter.

### 1. Serviço Python

```bash
cd python-service
python -m venv myvenv
source myvenv/bin/activate        # Windows: myvenv\Scripts\activate
pip install -r requirements.txt

# Desenvolvimento
python run.py

# Produção
uvicorn main:app --host 0.0.0.0 --port 5000 --workers 4
```

A documentação interativa do FastAPI fica em `http://localhost:5000/docs`.

### 2. Servidor TypeScript

```bash
npm install

# Desenvolvimento (hot reload); gera o CSS do Tailwind (legível, sem minificar) antes de subir
npm run dev

# Em outro terminal, para recompilar o CSS a cada mudança no HTML/JS/CSS
npm run dev:css

# Produção (compila o TypeScript e gera o CSS minificado)
npm run build
npm start
```

> O CSS final (`frontend/public/assets/css/styles.css`) é gerado e não fica no repositório. Se as páginas aparecerem sem estilo, rode `npm run build:css`.

---

## Endpoints

### Servidor TypeScript (público)

Ambos recebem `multipart/form-data` com o arquivo no campo **`arquivo`**.

| Método | Rota         | Entrada         | Saída                         |
|--------|--------------|-----------------|-------------------------------|
| POST   | `/xlsx-json` | arquivo `.xlsx` | JSON (lista de objetos)       |
| POST   | `/json-xlsx` | arquivo `.json` | planilha `.xlsx` (binário)    |
| GET    | `/health`    | —               | `200` se o Express e o conversor estão no ar; `503` se o conversor está fora |

Exemplos:

```bash
# Excel → JSON
curl -X POST http://localhost:3000/xlsx-json \
  -F "arquivo=@planilha.xlsx" \
  -o resultado.json

# JSON → Excel
curl -X POST http://localhost:3000/json-xlsx \
  -F "arquivo=@dados.json" \
  -o resultado.xlsx
```

### Serviço Python (interno)

Chamado pelo Express. Usa o mesmo campo `arquivo`.

| Método | Rota             | Descrição                                                         |
|--------|------------------|-------------------------------------------------------------------|
| POST   | `/api/xlsx-json` | Lê a planilha com Pandas e devolve JSON (`orient="records"`, indentado) |
| POST   | `/api/json-xlsx` | Lê o JSON com Pandas e devolve um `.xlsx` gerado com `openpyxl`   |
| GET    | `/health`        | Retorna `{"status": "ok"}`                                        |

As respostas incluem o header `Content-Disposition: attachment; filename=<nome original>`.

### Formato esperado

Excel → JSON: cada linha da primeira aba vira um objeto, e o cabeçalho define as chaves.

| nome  | idade |
|-------|-------|
| Ana   | 30    |
| Bruno | 25    |

```json
[
    { "nome": "Ana", "idade": 30 },
    { "nome": "Bruno", "idade": 25 }
]
```

JSON → Excel: o caminho inverso. Envie uma lista de objetos com as mesmas chaves.

---

## Validação de arquivos e erros

O Express valida o arquivo antes de enviá-lo ao Python (`src/models/Arquivo.ts`):

- **Extensão**: precisa ser `.json` ou `.xlsx`, conforme a rota. A comparação ignora maiúsculas e minúsculas.
- **JSON**: o conteúdo precisa ser válido para `JSON.parse`.
- **Excel**: os 6 primeiros bytes precisam bater com a assinatura ZIP/OOXML (`50 4B 03 04 14 00`).

Erros de validação respondem assim:

```json
{
  "success": false,
  "mensagem": "Extensão não permitida. Use um arquivo com a extensão: .xlsx",
  "code": "INVALID_EXTENSION"
}
```

| Código                 | Status | Quando ocorre                                  |
|------------------------|--------|------------------------------------------------|
| `NO_FILE`              | 400    | Nenhum arquivo no campo `arquivo`              |
| `INVALID_EXTENSION`    | 400    | Extensão diferente da esperada pela rota       |
| `INVALID_JSON`         | 400    | JSON malformado (ou extensão errada na rota JSON) |
| `INVALID_EXCEL`        | 400    | Assinatura do arquivo não corresponde a um `.xlsx` (inclusive arquivos com menos de 6 bytes) |
| `UNSUPPORTED_TYPE`     | 400    | Tipo de arquivo sem validação implementada     |
| `INVALID_OR_CORRUPTED` | 400    | Erro de validação sem mensagem específica      |
| —                      | 422    | Arquivo válido, mas o Pandas não conseguiu converter o conteúdo (ex.: JSON que não é uma lista de objetos) |
| —                      | 500    | Falha inesperada no serviço Python ou no Express |

Quando o Python recusa o conteúdo (422), a resposta é:

```json
{ "success": false, "mensagem": "Não foi possível converter o arquivo JSON: ..." }
```

Em falhas inesperadas (500):

```json
{ "mensagem": "Erro ao processar arquivo no Python", "erro": "..." }
```

### Hierarquia de erros

```
Error
└── AppError            (message, code)
    └── ValidationError       → HTTP 404
        └── FileValidationError → HTTP 400 (mensagem vem de constants/errorMessages.ts)
```

### Como adicionar uma nova conversão

1. Crie o conversor no Python (`models/` + `controllers/`) e registre a rota em `main.py`.
2. Adicione o endpoint em `src/constants/endpoinsApi.ts`.
3. Se o tipo de entrada for novo, adicione-o em `Arquivo.TIPOS`, crie o método de validação e inclua o `case` correspondente em `Controller.handleUpload`.
4. Instancie o controller em `src/controllers/arquivosController.ts` e registre a rota em `src/router/goodbyepdfRouter.ts`.
5. Crie a página no frontend (veja [Páginas de conversão](#páginas-de-conversão)).

---

## Frontend

O frontend é HTML e JavaScript puro (ES modules), estilizado com **Tailwind CSS v4**. O Express serve `frontend/public` como estático:

| URL                           | Página                    |
|-------------------------------|---------------------------|
| `/`                           | Página inicial            |
| `/pages/json-para-xlsx.html`  | Conversão JSON → Excel    |
| `/pages/xlsx-para-json.html`  | Conversão Excel → JSON    |

### Estilos (Tailwind)

- A entrada é `frontend/src/styles/main.css`. O Tailwind lê as classes usadas nos HTML e JS de `frontend/public` e gera `frontend/public/assets/css/styles.css`.
- Scripts: `npm run build:css` (minificado), `npm run dev:css` (modo watch). O `npm run build` já gera o CSS minificado e o `npm run dev` gera o CSS legível (sem minificar); no Docker, ele é gerado na etapa de build da imagem.
- **Cor primária**: vermelho `#EA1D2C`, definido em `@theme` como a escala `primary-50` … `primary-950` (classes `bg-primary`, `text-primary-600` etc.). O fundo é branco no modo claro.
- **Componentes** reutilizados ficam em `@layer components`: `.btn-primary`, `.btn-secondary`, `.nav-link` e `.card`.
- Como o Tailwind só encontra classes escritas por inteiro, não monte nomes de classe por concatenação no JS (ex.: `'bg-' + cor`).

### Modo escuro

- Controlado pela classe `dark` no `<html>` (variante `dark:` definida com `@custom-variant` em `main.css`).
- O botão do cabeçalho (`data-alterna-tema`) alterna o tema e salva a escolha no `localStorage` (`tema` = `claro` ou `escuro`). Sem escolha salva, vale a preferência do sistema.
- Um script inline no `<head>` de cada página aplica o tema antes da renderização, para não "piscar" o modo claro.

### Páginas de conversão

As duas páginas usam o mesmo script, `assets/js/pages/conversor.js`. A conversão é configurada no próprio `<form>`:

```html
<form data-conversor data-endpoint="/json-xlsx" data-extensao="json" data-extensao-saida="xlsx">
```

O script aceita clique ou arrastar e soltar, valida a extensão no navegador (`assets/js/models/Arquivo.js`), envia o arquivo para o endpoint e dispara o download com `assets/js/utils/geraDownload.js`. O arquivo convertido mantém o nome original, com a nova extensão. Erros da API (campo `mensagem`) aparecem na própria página.

Para uma conversão nova no frontend, copie uma das páginas de `pages/`, ajuste os `data-*`, os textos e o `accept` do input, e adicione o link no cabeçalho de todas as páginas (o cabeçalho e o rodapé são repetidos em cada HTML, já que não há etapa de build de templates).

> O CORS do Express aceita apenas a origem `https://willian-ribeiro.com`. Para consumir a API a partir de outra origem, ajuste `src/app.ts`.

---

## Testes

```bash
npm test
```

Os testes usam Jest com ts-jest e ficam em pastas `__tests__/` ao lado do código testado. Não precisam do serviço Python nem de rede: as dependências externas são substituídas por mocks.

| Arquivo                                          | O que cobre |
|--------------------------------------------------|-------------|
| `src/models/__tests__/Arquivo.test.ts`           | Extensão (inclusive maiúsculas e sem extensão), JSON válido/malformado, assinatura do `.xlsx` |
| `src/models/__tests__/AppError.test.ts`          | Hierarquia de erros e mensagens centralizadas |
| `src/models/__tests__/Controller.test.ts`        | Fluxo do `handleUpload` e mapeamento de erros para HTTP (400, 404, 500); `CallAPIPython` mockado |
| `src/services/__tests__/CallAPIPython.test.ts`   | `/health`, envio ao Python, repasse de 4xx com o corpo decodificado e 500; `axios` mockado |
| `src/router/__tests__/goodbyepdfRouter.test.ts`  | Rotas HTTP com `supertest`: o Multer entrega o arquivo só em memória (sem gravar em disco) e `GET /health` responde 200/503 |

```bash
npx jest src/models/__tests__/Arquivo.test.ts   # um arquivo
npx jest -t "INVALID_JSON"                      # testes pelo nome
```

O `jest.setup.js` roda antes de cada arquivo de teste (hoje só silencia o aviso do `dotenv`). Os testes ficam fora do build (`exclude` do `tsconfig.json`).

---

## Pendências conhecidas

- Não há testes do JavaScript do frontend.
- `CallAPIPython.ts` importa `form-data`, que não está declarado no `package.json` (hoje vem como dependência transitiva do axios).
- O Multer não tem limite de tamanho de arquivo configurado. Como os uploads ficam em memória, um arquivo muito grande ocupa a RAM do servidor.
- Arquivos `__pycache__` estão versionados. Vale adicioná-los ao `.gitignore`.

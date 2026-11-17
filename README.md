# GoodbyePDF API

Projeto open source, em desenvolvimento, que propõe uma alternativa ao iLovePDF: uma aplicação web e uma API para conversão de arquivos entre formatos. Hoje o projeto converte **PDF → Word (.docx)**, **PDF → PowerPoint (.pptx)**, **PDF → Excel (.xlsx)**, **Excel (.xlsx) → PDF**, **JSON → Excel (.xlsx)** e **Excel (.xlsx) → JSON**.

A arquitetura separa duas responsabilidades:

- **Servidor TypeScript (Express)**: serve o frontend, recebe os uploads, valida os arquivos e encaminha para o conversor.
- **Serviço de conversão Python (FastAPI + Pandas + pdf2docx + python-pptx + LibreOffice)**: faz a conversão propriamente dita e devolve o arquivo convertido.

---

## Sumário

- [Arquitetura](#arquitetura)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Pré-requisitos](#pré-requisitos)
- [Configuração (.env)](#configuração-env)
- [Como executar](#como-executar)
- [Deploy (VPS Hostinger)](#deploy-vps-hostinger)
- [Endpoints](#endpoints)
- [Validação de arquivos e erros](#validação-de-arquivos-e-erros)
- [Frontend](#frontend)
- [Testes](#testes)
- [Pendências conhecidas](#pendências-conhecidas)
- [Licença](#licença)

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
2. O Express recebe o upload com o **Multer** em memória (`memoryStorage`): o arquivo fica só em `req.file.buffer`, nada é gravado em disco. Arquivos acima de 10 MB são recusados com `413 FILE_TOO_LARGE`.
3. O **controller** da feature extrai o arquivo da requisição e chama o **service** correspondente.
4. O **service** valida extensão e conteúdo (JSON parseável ou assinatura de Excel) e pede a conversão ao `conversorService`, que chama o Python (`CONVERSOR_API_URL` + endpoint).
5. O Python converte com Pandas e devolve os bytes. O controller responde com o arquivo convertido (`Content-Disposition: attachment`), e o frontend dispara o download.
6. Qualquer erro, em qualquer camada, é transformado em JSON pelo middleware `trataErros`.

### Camadas do servidor TypeScript

Cada camada tem uma responsabilidade, e cada conversão (feature) tem sua própria rota, controller e service:

| Camada | Responsabilidade | Exemplo (JSON → Excel) |
|---|---|---|
| `routes/` | Só define os endpoints e os middlewares de cada um | `jsonXlsx.routes.ts`: `POST /json-xlsx` |
| `controllers/` | Recebe `req`/`res`, extrai os parâmetros, chama o service e responde | `jsonXlsx.controller.ts` |
| `validators/` | Validação do arquivo recebido (extensão e conteúdo), um arquivo por formato, reaproveitada por qualquer feature | `json.validator.ts`: `validaArquivoJson` |
| `services/` | Regras de negócio da conversão (chama o validador e o conversor); não conhece o Express | `jsonXlsx.service.ts` (+ `conversor.service.ts`, cliente do Python) |
| `middlewares/` | Upload em memória (`upload.ts`) e tratamento central de erros (`trataErros.ts`) | — |
| `utils/` | Funções auxiliares reutilizáveis (arquivos e HTTP) | `obtemExtensao`, `possuiAssinatura`, `extraiArquivo` |
| `errors/` | Hierarquia de erros, cada um com seu status HTTP | `FileValidationError`, `ConversorError` |

```
POST /json-xlsx
  → routes/jsonXlsx.routes.ts          recebeArquivo (Multer em memória)
  → controllers/jsonXlsx.controller.ts extraiArquivo(req)
  → services/jsonXlsx.service.ts       validaArquivoJson (validators/json.validator.ts) → conversorService.converte
  ← controllers/jsonXlsx.controller.ts enviaArquivo(res, convertido)
  (erro em qualquer etapa → middlewares/trataErros.ts → { success: false, mensagem, code })
```

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
│   ├── app.ts                    # Express, CORS, arquivos estáticos, rotas e tratamento de erros
│   ├── routes/                   # Endpoints (um arquivo por feature)
│   │   ├── index.ts              # Reúne as rotas de todas as features
│   │   ├── jsonXlsx.routes.ts    # POST /json-xlsx
│   │   ├── xlsxJson.routes.ts    # POST /xlsx-json
│   │   ├── pdfDocx.routes.ts     # POST /pdf-docx
│   │   ├── pdfPptx.routes.ts     # POST /pdf-pptx
│   │   ├── xlsxPdf.routes.ts     # POST /xlsx-pdf
│   │   ├── pdfXlsx.routes.ts     # POST /pdf-xlsx
│   │   └── health.routes.ts      # GET /health
│   ├── controllers/              # req/res → service → resposta
│   │   ├── jsonXlsx.controller.ts
│   │   ├── xlsxJson.controller.ts
│   │   ├── pdfDocx.controller.ts
│   │   ├── pdfPptx.controller.ts
│   │   ├── xlsxPdf.controller.ts
│   │   ├── pdfXlsx.controller.ts
│   │   └── health.controller.ts
│   ├── validators/               # Validação do arquivo recebido, um por formato (reaproveitada pelas features)
│   │   ├── pdf.validator.ts      # .pdf + cabeçalho %PDF-
│   │   ├── xlsx.validator.ts     # .xlsx + assinatura OOXML
│   │   └── json.validator.ts     # .json + conteúdo JSON válido
│   ├── services/                 # Regras de negócio de cada conversão
│   │   ├── jsonXlsx.service.ts   # Converte .json para .xlsx
│   │   ├── xlsxJson.service.ts   # Converte .xlsx para .json
│   │   ├── pdfDocx.service.ts    # Converte .pdf para .docx (timeout de 120 s)
│   │   ├── pdfPptx.service.ts    # Converte .pdf para .pptx (timeout de 120 s)
│   │   ├── xlsxPdf.service.ts    # Converte .xlsx para .pdf (timeout de 120 s)
│   │   ├── pdfXlsx.service.ts    # Converte .pdf para .xlsx (timeout de 120 s)
│   │   ├── health.service.ts     # Status da API e do conversor
│   │   └── conversor.service.ts  # Cliente HTTP (axios) do serviço Python
│   ├── middlewares/
│   │   ├── upload.ts             # Multer em memória com limite de 10 MB
│   │   └── trataErros.ts         # Converte erros em { success: false, mensagem, code }
│   ├── utils/
│   │   ├── arquivo.ts            # Extensão, assinatura (magic number), JSON válido
│   │   └── http.ts               # extraiArquivo(req) e enviaArquivo(res, ...)
│   ├── errors/AppError.ts        # AppError, FileValidationError, ConversorError
│   ├── types/arquivos.ts         # ArquivoRecebido e ArquivoConvertido
│   ├── constants/
│   │   ├── endpointsConversor.ts # Endpoints do serviço Python
│   │   ├── errorMessages.ts      # Mensagens e códigos de erro
│   │   ├── formatos.ts           # Extensões, MIME types e assinaturas (.xlsx, .pdf)
│   │   └── limites.ts            # Tamanho máximo de upload
│
├── tests/                        # Testes Jest (mesmas pastas de src/: routes/, services/, validators/...)
│   ├── fixtures.ts               # Dados de exemplo usados pelos testes
│   └── tsconfig.json             # tsconfig do ts-jest (enxerga src/ e tests/)
│
├── python-service/               # Serviço de conversão (FastAPI)
│   ├── main.py                   # App FastAPI e rotas /api/xlsx-json, /api/json-xlsx, /api/pdf-docx, /api/pdf-pptx, /api/xlsx-pdf e /api/pdf-xlsx
│   ├── run.py                    # Execução em desenvolvimento (lê o .env)
│   ├── controllers/
│   │   ├── xlsx_json_controller.py
│   │   ├── json_xlsx_controller.py
│   │   ├── pdf_docx_controller.py
│   │   ├── pdf_pptx_controller.py
│   │   ├── xlsx_pdf_controller.py
│   │   └── pdf_xlsx_controller.py
│   ├── models/
│   │   ├── Gerenciador_xlsx.py   # Excel → JSON (pandas.read_excel / to_json) e Excel → PDF (LibreOffice headless)
│   │   ├── Gerenciador_json.py   # JSON → Excel (pandas.read_json / to_excel)
│   │   └── Gerenciador_pdf.py    # PDF → Word (pdf2docx), PDF → PowerPoint (PyMuPDF + python-pptx) e PDF → Excel (PyMuPDF + openpyxl), tudo em memória
│   ├── Dockerfile                # Imagem do conversor (instala o LibreOffice Calc sem interface)
│   └── requirements.txt
│
├── frontend/                     # Frontend (HTML + JS puro + Tailwind CSS)
│   ├── src/styles/main.css       # Entrada do Tailwind: tema (cor primária), modo escuro, componentes
│   └── public/                   # Servido como estático pelo Express
│       ├── index.html            # Página inicial (/)
│       ├── pages/
│       │   ├── json-para-xlsx.html   # Conversão JSON → Excel
│       │   ├── xlsx-para-json.html   # Conversão Excel → JSON
│       │   ├── pdf-para-docx.html    # Conversão PDF → Word
│       │   ├── pdf-para-pptx.html    # Conversão PDF → PowerPoint
│       │   ├── xlsx-para-pdf.html    # Conversão Excel → PDF
│       │   └── pdf-para-xlsx.html    # Conversão PDF → Excel
│       └── assets/
│           ├── css/styles.css    # CSS gerado pelo Tailwind (não versionado)
│           ├── img/favicon.svg
│           └── js/
│               ├── components/
│               │   ├── tema.js   # Alterna modo claro/escuro e salva a escolha
│               │   ├── menu.js   # Menu de navegação em telas pequenas
│               │   └── submenu.js # Submenus suspensos do cabeçalho (clique, teclado, Esc)
│               ├── models/Arquivo.js     # Validação de extensão no cliente e envio do arquivo
│               ├── pages/conversor.js    # Lógica das páginas de conversão (upload, arrastar e soltar, download)
│               └── utils/geraDownload.js # Converte a resposta em blob e dispara o download
│
├── postman-testes/               # Arquivos de exemplo usados em testes manuais
├── Dockerfile                    # Imagem do servidor Express
├── docker-compose.yml            # Sobe api (pública) + conversor (interno)
├── docker-compose.dev.yml        # Override de desenvolvimento (bind mounts + hot reload)
├── docker-compose.prod.yml       # Override de produção (Caddy com HTTPS, restart, logs)
├── Caddyfile                     # Proxy reverso de produção (HTTPS automático)
├── package.json
├── tsconfig.json
└── jest.config.js
```

---

## Pré-requisitos

- **Node.js** 20+ e npm
- **Python** 3.13+ e pip
- **LibreOffice** (só para rodar o conversor fora do Docker; usado na conversão Excel → PDF). O comando `soffice` precisa estar no `PATH` (ex.: `sudo apt install libreoffice-calc` ou `sudo dnf install libreoffice-calc`). Sem ele, `/xlsx-pdf` responde 500 `CONVERTER_UNAVAILABLE`; as demais conversões funcionam normalmente.

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
| `DOMINIO`           | Domínio público do deploy (só `docker-compose.prod.yml`; obrigatório nele) | `exemplo.com` |
| `WORKERS_CONVERSOR` | Workers do conversor Python em produção (só `docker-compose.prod.yml`) | `2` |

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

## Deploy (VPS Hostinger)

Em produção, o override `docker-compose.prod.yml` acrescenta o **Caddy** como única porta de entrada (80/443, com certificado HTTPS do Let's Encrypt emitido e renovado sozinho para o domínio em `DOMINIO`), tira a porta 3000 da api da internet, reduz os workers do conversor (`WORKERS_CONVERSOR`, padrão 2), liga `restart: unless-stopped` e rotaciona os logs (3 × 10 MB por container). O `Caddyfile` limita o corpo da requisição a 11 MB (o limite da aplicação é 10 MB) e espera até 130 s pela resposta (as conversões podem levar até 120 s). Requer Docker Compose 2.24+.

```bash
npm run docker:prod
# equivale a:
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 1. No painel da Hostinger (hPanel → VPS)

1. **Plano**: qualquer KVM com **no mínimo 4 GB de RAM** (o KVM 1 já atende; o KVM 2 dá folga para várias conversões de PDF/Excel ao mesmo tempo, que consomem bastante memória por causa do LibreOffice e da pdf2docx). Escolha o datacenter mais próximo dos usuários.
2. **Sistema operacional**: *Plain OS* → **Ubuntu 24.04 LTS** (ou o template *Ubuntu 24.04 with Docker*, que já traz o Docker e dispensa a instalação abaixo). Na criação, defina a senha de root e **cadastre sua chave SSH pública**.
3. **IP**: a VPS já vem com um IPv4 dedicado e fixo (aparece em *Visão geral*); não é preciso reservar IP.
4. **Firewall** (*Segurança* → *Firewall*): crie uma configuração, ative-a para a VPS e permita **TCP 22** (de preferência só do seu IP), **TCP 80**, **TCP 443** e, opcionalmente, **UDP 443** (HTTP/3). Não abra 3000 nem 5000. Esse firewall fica fora da VPS, então vale também para as portas publicadas pelo Docker (o Docker ignora as regras do `ufw` de dentro da máquina).
5. **DNS**: crie um registro `A` do domínio (ou subdomínio) apontando para o IP da VPS. Se o domínio estiver na Hostinger, é em *Domínios* → *DNS / Nameservers*; senão, no seu registrador. Espere propagar (`dig +short seu.dominio.com`) antes de subir o Caddy, senão a emissão do certificado falha (ele tenta de novo depois).
6. **Backups/snapshots** (*Backups e monitoramento*): crie um snapshot depois que tudo estiver no ar. Não há banco de dados; o único estado são os certificados no volume `caddy_data`.

### 2. Na VPS (via SSH)

A VPS da Hostinger entra como `root`. Crie um usuário próprio para o deploy e desligue o login por senha:

```bash
# como root: usuário "deploy" com sudo e a mesma chave SSH do root
adduser deploy && usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
# só login por chave e sem root direto (teste o login como deploy antes de fechar a sessão)
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/; s/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh
```

Depois, entrando como `deploy` (`ssh deploy@IP_DA_VPS`):

```bash
# atualizações do sistema
sudo apt update && sudo apt upgrade -y

# swap de 2 GB: evita que o kernel mate o conversor num pico de memória
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Docker + plugin compose (script oficial; pule se usou o template com Docker);
# depois saia e entre de novo no SSH
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# código e configuração
git clone https://github.com/oliver-will61/goodbyepdf_api.git
cd goodbyepdf_api
cp .env.example .env
nano .env   # ajuste DOMINIO=seu.dominio.com (e WORKERS_CONVERSOR, se quiser)

# sobe tudo em segundo plano
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Confira com `docker compose -f docker-compose.yml -f docker-compose.prod.yml ps` (todos `running`/`healthy`), `curl https://seu.dominio.com/health` e os logs com `docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f caddy`.

### 3. Atualizar

```bash
cd goodbyepdf_api
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker image prune -f   # remove as imagens antigas
```

> O CORS de `src/app.ts` só aceita `https://willian-ribeiro.com`, mas isso não afeta o frontend servido pelo próprio Express (mesma origem). Só importa se outro site for chamar a API pelo navegador.

---

## Endpoints

### Servidor TypeScript (público)

As rotas de conversão recebem `multipart/form-data` com o arquivo no campo **`arquivo`** (até 10 MB).

| Método | Rota         | Entrada         | Saída                         |
|--------|--------------|-----------------|-------------------------------|
| POST   | `/xlsx-json` | arquivo `.xlsx` | JSON (lista de objetos)       |
| POST   | `/json-xlsx` | arquivo `.json` | planilha `.xlsx` (binário)    |
| POST   | `/pdf-docx`  | arquivo `.pdf`  | documento Word `.docx` (binário) |
| POST   | `/pdf-pptx`  | arquivo `.pdf`  | apresentação PowerPoint `.pptx` (binário) |
| POST   | `/xlsx-pdf`  | arquivo `.xlsx` | documento `.pdf` com todas as abas (binário) |
| POST   | `/pdf-xlsx`  | arquivo `.pdf`  | planilha `.xlsx` com as tabelas do PDF (binário) |
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

# PDF → Word
curl -X POST http://localhost:3000/pdf-docx \
  -F "arquivo=@contrato.pdf" \
  -o contrato.docx

# PDF → PowerPoint
curl -X POST http://localhost:3000/pdf-pptx \
  -F "arquivo=@slides.pdf" \
  -o slides.pptx

# Excel → PDF
curl -X POST http://localhost:3000/xlsx-pdf \
  -F "arquivo=@planilha.xlsx" \
  -o planilha.pdf

# PDF → Excel
curl -X POST http://localhost:3000/pdf-xlsx \
  -F "arquivo=@relatorio.pdf" \
  -o relatorio.xlsx
```

### Serviço Python (interno)

Chamado pelo Express. Usa o mesmo campo `arquivo`.

| Método | Rota             | Descrição                                                         |
|--------|------------------|-------------------------------------------------------------------|
| POST   | `/api/xlsx-json` | Lê a planilha com Pandas e devolve JSON (`orient="records"`, indentado) |
| POST   | `/api/json-xlsx` | Lê o JSON com Pandas e devolve um `.xlsx` gerado com `openpyxl`   |
| POST   | `/api/pdf-docx`  | Converte o PDF com `pdf2docx` (em memória, em uma thread separada) e devolve um `.docx`. PDF corrompido ou protegido por senha → 422 |
| POST   | `/api/pdf-pptx`  | Renderiza cada página do PDF como imagem (PyMuPDF, 150 dpi) e monta um `.pptx` com um slide por página (`python-pptx`), em memória e em uma thread separada. PDF corrompido, protegido por senha ou sem páginas → 422 |
| POST   | `/api/xlsx-pdf`  | Converte a planilha (todas as abas) em PDF com o LibreOffice headless (`soffice --convert-to pdf`), em uma thread separada. A planilha é gravada em uma pasta temporária, apagada logo após a conversão; cada conversão usa um perfil próprio do LibreOffice, o que permite conversões simultâneas. Planilha corrompida → 422; LibreOffice ausente ou acima de 100 s → 500 |
| POST   | `/api/pdf-xlsx`  | Detecta as tabelas de cada página com o PyMuPDF (`page.find_tables`) e monta um `.xlsx` com uma aba por tabela (`openpyxl`); sem tabelas, uma aba por página com o texto. Em memória e em uma thread separada. PDF corrompido, protegido por senha ou sem páginas → 422 |
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

PDF → Word: a `pdf2docx` analisa o layout de cada página e recria no `.docx` os parágrafos (com fonte, tamanho e cor), as tabelas (como tabelas editáveis) e as imagens. Limitações:

- PDFs escaneados viram imagens no Word: não há OCR, então o texto não fica editável.
- PDFs protegidos por senha são recusados (422).
- Layouts elaborados (várias colunas, caixas sobrepostas) podem precisar de ajustes.
- A conversão é mais pesada que as outras; o Express espera até 120 s pela resposta (`TIMEOUT_PDF_DOCX_MS`).

PDF → PowerPoint: cada página do PDF é renderizada como imagem PNG (150 dpi) e colocada em um slide próprio, na mesma ordem. O slide tem o tamanho da primeira página (retrato ou paisagem); páginas de outro tamanho são ajustadas ao slide mantendo a proporção. Limitações:

- O texto não fica editável no PowerPoint: cada slide é uma imagem da página.
- PDFs protegidos por senha são recusados (422).
- PDFs com muitas páginas geram apresentações maiores; o Express espera até 120 s pela resposta (`TIMEOUT_PDF_PPTX_MS`).

Excel → PDF: o LibreOffice Calc abre a planilha e exporta **todas as abas**, na ordem da planilha, cada uma começando em uma página nova. São mantidos formatação (cores, bordas, fontes, células mescladas, larguras de coluna), gráficos, imagens e as configurações de impressão da planilha (área de impressão, orientação, margens, ajuste à página). Limitações:

- Só `.xlsx`: planilhas `.xls`, `.xlsm` e protegidas por senha (que não são ZIP) são recusadas pelo Express (400).
- Fontes que não estão instaladas no container são substituídas (a imagem traz Liberation e DejaVu, compatíveis em métricas com Arial, Times New Roman e Courier New).
- O LibreOffice é iniciado a cada conversão (~2 s em planilhas pequenas); o Express espera até 120 s pela resposta (`TIMEOUT_XLSX_PDF_MS`) e o Python interrompe o LibreOffice após 100 s.
- Diferente das outras conversões, esta grava a planilha em disco por alguns instantes (no container do Python), porque o LibreOffice só trabalha com arquivos. O Express continua sem gravar nada.

PDF → Excel: o PyMuPDF procura tabelas em cada página (`page.find_tables()`, que usa as linhas de grade e o alinhamento do texto). Cada tabela vira uma aba `Pág N - Tabela M`, com a primeira linha em negrito (cabeçalho) e a largura das colunas ajustada ao conteúdo. Números simples (inteiros e decimais com vírgula ou ponto) viram números no Excel; valores ambíguos como `1.234` (mil e duzentos ou um vírgula dois?) e números com zero à esquerda (`007`, CEPs) ficam como texto. Se o PDF não tiver nenhuma tabela, cada página vira uma aba `Página N` com o texto, uma linha do PDF por linha da planilha. Limitações:

- PDFs escaneados (imagem) não têm texto para extrair: não há OCR.
- Tabelas sem linhas de grade, com células mescladas ou que continuam na página seguinte podem sair incompletas, divididas ou não ser detectadas.
- A formatação (cores, fontes, bordas) não é copiada.
- PDFs protegidos por senha são recusados (422); o Express espera até 120 s pela resposta (`TIMEOUT_PDF_XLSX_MS`).

---

## Validação de arquivos e erros

O Express valida o arquivo antes de enviá-lo ao Python (validadores em `src/validators/`, chamados pelos services de cada feature):

- **Extensão**: precisa ser `.json` ou `.xlsx`, conforme a rota. A comparação ignora maiúsculas e minúsculas.
- **JSON**: o conteúdo precisa ser válido para `JSON.parse`.
- **Excel**: os 6 primeiros bytes precisam bater com a assinatura ZIP/OOXML (`50 4B 03 04 14 00`).

Todo erro responde no mesmo formato:

```json
{
  "success": false,
  "mensagem": "Extensão não permitida. Use um arquivo com a extensão: .xlsx",
  "code": "INVALID_EXTENSION"
}
```

| Código                  | Status | Quando ocorre                                  |
|-------------------------|--------|------------------------------------------------|
| `NO_FILE`               | 400    | Nenhum arquivo no campo `arquivo`              |
| `INVALID_EXTENSION`     | 400    | Extensão diferente da esperada pela rota       |
| `INVALID_JSON`          | 400    | JSON malformado ou vazio                       |
| `INVALID_EXCEL`         | 400    | Assinatura do arquivo não corresponde a um `.xlsx` (inclusive arquivos com menos de 6 bytes) |
| `INVALID_PDF`           | 400    | O arquivo não começa com o cabeçalho `%PDF-` (não é um PDF) |
| `FILE_TOO_LARGE`        | 413    | Arquivo maior que o limite (10 MB, em `src/constants/limites.ts`) |
| `CONVERSION_FAILED`     | 4xx (o mesmo do Python, ex.: 422) | Arquivo válido, mas o Pandas não conseguiu converter o conteúdo (ex.: JSON que não é uma lista de objetos). A mensagem vem do Python. |
| `CONVERTER_UNAVAILABLE` | 500    | O serviço Python está fora do ar, demorou demais ou falhou (5xx). O detalhe técnico fica só no log do servidor. |
| `INTERNAL_ERROR`        | 500    | Erro inesperado no Express. O detalhe fica só no log do servidor. |

### Hierarquia de erros

Cada erro carrega o próprio status HTTP; o middleware `trataErros` só monta a resposta.

```
Error
└── AppError (message, code, status)
    ├── FileValidationError → 400 (ou 413 em FILE_TOO_LARGE); mensagem de constants/errorMessages.ts
    └── ConversorError      → status 4xx do Python (CONVERSION_FAILED) ou 500 (CONVERTER_UNAVAILABLE)
```

Erros que não são `AppError` viram `500 INTERNAL_ERROR`. O erro de tamanho do Multer vira `413 FILE_TOO_LARGE`.

### Como adicionar uma nova conversão

Exemplo para uma conversão `csv → json`:

1. **Python:** crie o conversor (`models/` + `controllers/`) e registre a rota em `main.py`.
2. **Constantes:** adicione o endpoint em `src/constants/endpointsConversor.ts` e, se o formato for novo, em `src/constants/formatos.ts`.
3. **Validator:** se o formato de entrada ainda não tem validação, crie `src/validators/csv.validator.ts` (`validaArquivoCsv`, usando as funções de `utils/arquivo.ts`). Se já existe (ex.: `validaArquivoPdf`), reaproveite; nunca importe a validação do service de outra feature.
4. **Service:** crie `src/services/csvJson.service.ts`, que chama o validador e `conversorService.converte(...)`, devolvendo um `ArquivoConvertido`.
5. **Controller:** crie `src/controllers/csvJson.controller.ts` (`extraiArquivo` → service → `enviaArquivo`).
6. **Rota:** crie `src/routes/csvJson.routes.ts` com `router.post('/csv-json', recebeArquivo, csvJsonController.converte)` e registre em `src/routes/index.ts`.
7. **Testes:** `tests/validators/csv.validator.test.ts` (validação), `tests/services/csvJson.service.test.ts` (conversão) e `tests/routes/csvJson.routes.test.ts` (integração, com o `conversorService` mockado).
8. **Frontend:** crie a página (veja [Páginas de conversão](#páginas-de-conversão)).

---

## Frontend

O frontend é HTML e JavaScript puro (ES modules), estilizado com **Tailwind CSS v4**. O Express serve `frontend/public` como estático:

| URL                           | Página                    |
|-------------------------------|---------------------------|
| `/`                           | Página inicial            |
| `/pages/json-para-xlsx.html`  | Conversão JSON → Excel    |
| `/pages/xlsx-para-json.html`  | Conversão Excel → JSON    |
| `/pages/pdf-para-docx.html`   | Conversão PDF → Word      |
| `/pages/pdf-para-pptx.html`   | Conversão PDF → PowerPoint |
| `/pages/xlsx-para-pdf.html`   | Conversão Excel → PDF      |
| `/pages/pdf-para-xlsx.html`   | Conversão PDF → Excel      |

### Estilos (Tailwind)

- A entrada é `frontend/src/styles/main.css`. O Tailwind lê as classes usadas nos HTML e JS de `frontend/public` e gera `frontend/public/assets/css/styles.css`.
- Scripts: `npm run build:css` (minificado), `npm run dev:css` (modo watch). O `npm run build` já gera o CSS minificado e o `npm run dev` gera o CSS legível (sem minificar); no Docker, ele é gerado na etapa de build da imagem.
- **Cor primária**: vermelho `#EA1D2C`, definido em `@theme` como a escala `primary-50` … `primary-950` (classes `bg-primary`, `text-primary-600` etc.). O fundo é branco no modo claro.
- **Componentes** reutilizados ficam em `@layer components`: `.btn-primary`, `.btn-secondary`, `.nav-link`, `.nav-link-ativo` (grupo do cabeçalho que contém a página atual), `.nav-sublink` (link dos submenus do cabeçalho), `.card` e os ícones de formato do cabeçalho: `.icone-formato` (tamanho e forma) mais uma cor por tipo de arquivo — `.icone-word` (azul), `.icone-excel` (verde), `.icone-powerpoint` (vermelho da marca) e `.icone-json` (âmbar). Nos cartões da página inicial, cada ícone usa a cor do seu formato (o enviado à esquerda e o recebido à direita, ambos em tom claro com `.icone-*`, sem fundo forte), e o PDF continua no vermelho da marca. No cabeçalho, o ícone e a cor são sempre os do formato que não é PDF: o de saída em "Converter de PDF" e "Outras conversões", o do arquivo enviado em "Converter em PDF" (ex.: Excel para PDF → planilha verde). Um formato novo ganha a sua classe `.icone-*` no mesmo padrão (fundo `-50`/ícone `-600`; no escuro, fundo `-950/60`/ícone `-400`).
- Como o Tailwind só encontra classes escritas por inteiro, não monte nomes de classe por concatenação no JS (ex.: `'bg-' + cor`).

### Modo escuro

- Controlado pela classe `dark` no `<html>` (variante `dark:` definida com `@custom-variant` em `main.css`).
- O botão do cabeçalho (`data-alterna-tema`) alterna o tema e salva a escolha no `localStorage` (`tema` = `claro` ou `escuro`). Sem escolha salva, vale a preferência do sistema.
- Um script inline no `<head>` de cada página aplica o tema antes da renderização, para não "piscar" o modo claro.

### Páginas de conversão

Todas as páginas de conversão usam o mesmo script, `assets/js/pages/conversor.js`. A conversão é configurada no próprio `<form>`:

```html
<form data-conversor data-endpoint="/json-xlsx" data-extensao="json" data-extensao-saida="xlsx">
```

O script aceita clique ou arrastar e soltar, valida a extensão no navegador (`assets/js/models/Arquivo.js`), envia o arquivo para o endpoint e dispara o download com `assets/js/utils/geraDownload.js`. O arquivo convertido mantém o nome original, com a nova extensão. Erros da API (campo `mensagem`) aparecem na própria página.

Para uma conversão nova no frontend, copie uma das páginas de `pages/`, ajuste os `data-*`, os textos e o `accept` do input, e adicione o link no cabeçalho e no menu mobile de todas as páginas (o cabeçalho e o rodapé são repetidos em cada HTML, já que não há etapa de build de templates). O cabeçalho agrupa as conversões em três submenus suspensos (abrem ao passar o mouse, por clique ou pelo teclado): **Converter de PDF** (PDF → X), **Converter em PDF** (X → PDF) e **Outras conversões** (JSON ↔ Excel). O link novo entra como `<li><a class="nav-sublink">` no submenu do seu grupo, com o ícone do formato à esquerda do texto (regra acima) (o mesmo SVG do cartão da página inicial, dentro de `<span class="icone-formato icone-<formato>">`) e, no menu mobile, abaixo do título do grupo (também com o ícone); na página da conversão, marque o link com `aria-current="page"` e o botão do grupo com `nav-link-ativo`. Na página inicial, inclua também o cartão em "Ferramentas" e o atalho no topo. A ordem, na página inicial e no cabeçalho (telas grandes e menu mobile), é: PDF para outro formato (PDF → X), depois outro formato para PDF (X → PDF) e, sempre por último, JSON ↔ Excel. Uma conversão nova entra no fim do seu grupo.

> O CORS do Express aceita apenas a origem `https://willian-ribeiro.com`. Para consumir a API a partir de outra origem, ajuste `src/app.ts`.

---

## Testes

```bash
npm test
```

Os testes usam Jest com ts-jest e ficam na pasta `tests/` (irmã de `src/`), com as mesmas subpastas de `src/` (`tests/services/`, `tests/routes/`...). Não precisam do serviço Python nem de rede: o `conversorService` (ou o `axios`, no teste dele) é substituído por um mock.

| Arquivo | O que cobre |
|---|---|
| `tests/utils/arquivo.test.ts` | Extensão, troca de extensão, assinatura (inclusive arquivo vazio) e JSON válido |
| `tests/utils/http.test.ts` | `extraiArquivo` (NO_FILE, arquivo sem buffer) e `enviaArquivo` |
| `tests/errors/AppError.test.ts` | Status, código e mensagem de cada erro |
| `tests/middlewares/trataErros.test.ts` | Erros da aplicação, 413 do Multer e 500 genérico sem expor detalhes |
| `tests/validators/pdf.validator.test.ts` | Validação do `.pdf`: extensão, cabeçalho `%PDF-` e arquivo vazio |
| `tests/validators/xlsx.validator.test.ts` | Validação do `.xlsx`: extensão, assinatura e arquivo vazio |
| `tests/validators/json.validator.test.ts` | Validação do `.json`: extensão, JSON malformado e vazio |
| `tests/services/jsonXlsx.service.test.ts` | Resultado da conversão e conversor não chamado com arquivo inválido |
| `tests/services/xlsxJson.service.test.ts` | Resultado da conversão e conversor não chamado com arquivo inválido |
| `tests/services/health.service.test.ts` | Status `ok`/`degradado` |
| `tests/services/conversor.service.test.ts` | Chamada ao Python, erros 4xx/5xx e conexão recusada (`axios` mockado) |
| `tests/routes/jsonXlsx.routes.test.ts` | Integração com `supertest`: download, upload só em memória, erros 400, limite de 10 MB (413), 422 e 500 |
| `tests/routes/xlsxJson.routes.test.ts` | Integração com `supertest`: download e erros |
| `tests/services/pdfDocx.service.test.ts` | Timeout maior, resultado da conversão e conversor não chamado com arquivo inválido |
| `tests/routes/pdfDocx.routes.test.ts` | Integração com `supertest`: download do `.docx`, erros 400, 413, 422 (PDF protegido) e 500 |
| `tests/services/pdfPptx.service.test.ts` | Extensão, assinatura `%PDF-`, arquivo vazio, timeout maior e resultado da conversão para `.pptx` |
| `tests/routes/pdfPptx.routes.test.ts` | Integração com `supertest`: download do `.pptx`, erros 400 (sem arquivo, extensão, assinatura, vazio), limite de 10 MB (aceita exatamente 10 MB, 413 acima), 422 e 500 |
| `tests/controllers/pdfPptx.controller.test.ts` | Arquivo sem buffer (NO_FILE sem chamar o service) e envio do `.pptx` |
| `tests/services/xlsxPdf.service.test.ts` | Extensão (`.xls`/`.xlsm` recusados), assinatura do `.xlsx`, arquivo vazio, timeout de 120 s e resultado da conversão para `.pdf` |
| `tests/routes/xlsxPdf.routes.test.ts` | Integração com `supertest`: download do `.pdf`, erros 400 (sem arquivo, extensão, assinatura, vazio), limite de 10 MB (aceita exatamente 10 MB, 413 acima), 422 e 500 |
| `tests/controllers/xlsxPdf.controller.test.ts` | Arquivo sem buffer (NO_FILE sem chamar o service) e envio do `.pdf` |
| `tests/services/pdfXlsx.service.test.ts` | Extensão, assinatura `%PDF-`, arquivo vazio, timeout maior e resultado da conversão para `.xlsx` |
| `tests/routes/pdfXlsx.routes.test.ts` | Integração com `supertest`: download do `.xlsx`, erros 400 (sem arquivo, extensão, assinatura, vazio), limite de 10 MB (aceita exatamente 10 MB, 413 acima), 422 e 500 |
| `tests/controllers/pdfXlsx.controller.test.ts` | Arquivo sem buffer (NO_FILE sem chamar o service) e envio do `.xlsx` |
| `tests/routes/health.routes.test.ts` | `GET /health` 200/503 |

```bash
npx jest tests/services/jsonXlsx.service.test.ts   # um arquivo
npx jest -t "INVALID_JSON"                                 # testes pelo nome
```

Dados de exemplo compartilhados ficam em `tests/fixtures.ts`. Os testes ficam fora do build (o `tsconfig.json` da raiz só inclui `src/`); o ts-jest usa `tests/tsconfig.json`, que herda o da raiz e enxerga `src/` e `tests/`.

---

## Pendências conhecidas

- Não há testes do JavaScript do frontend nem do serviço Python (as conversões PDF → Word, PDF → PowerPoint, PDF → Excel e Excel → PDF foram validadas manualmente com arquivos reais).
- A imagem Docker do conversor passou de ~410 MB para ~790 MB com a `pdf2docx` (PyMuPDF e OpenCV) e cresce mais algumas centenas de MB com o LibreOffice (Excel → PDF).
- `conversor.service.ts` importa `form-data`, que não está declarado no `package.json` (hoje vem como dependência transitiva do axios).
- Arquivos `__pycache__` estão versionados. Vale adicioná-los ao `.gitignore`.

---

## Licença

Este projeto é distribuído sob a **GNU Affero General Public License v3.0 ou posterior** (AGPL-3.0-or-later). O texto completo está em [`LICENSE`](LICENSE).

A conversão PDF → Word usa a [pdf2docx](https://github.com/ArtifexSoftware/pdf2docx) (MIT), que depende do [PyMuPDF](https://github.com/pymupdf/PyMuPDF), licenciado sob AGPL-3.0. Por isso o projeto inteiro adota a AGPL. A conversão PDF → PowerPoint usa o PyMuPDF e a [python-pptx](https://github.com/scanny/python-pptx) (MIT), que traz a Pillow (MIT-CMU) e a XlsxWriter (BSD-2-Clause), todas compatíveis com a AGPL. A conversão PDF → Excel usa o PyMuPDF e a [openpyxl](https://foss.heptapod.net/openpyxl/openpyxl) (MIT). A conversão Excel → PDF usa o [LibreOffice](https://www.libreoffice.org/) (MPL-2.0), executado como um programa separado (linha de comando) dentro do container, sem ser incorporado ao código; a MPL-2.0 também é compatível com a AGPL. Na prática:

- Você pode usar, estudar, modificar e redistribuir o código livremente.
- Se você disponibilizar uma versão **modificada** como serviço na rede (um site, uma API), precisa oferecer o código-fonte dessa versão aos usuários, sob a mesma licença. O link "Código no GitHub" no rodapé das páginas cumpre esse papel; mantenha-o apontando para o código que está rodando.


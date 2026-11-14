# servidor TypeScript (Express): única porta de entrada pública do projeto

# etapa de build: compila o TypeScript e gera o CSS do Tailwind
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY frontend ./frontend
RUN npm run build

# etapa final: só dependências de produção e o código compilado
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
# frontend já com o CSS gerado na etapa de build
COPY --from=build /app/frontend/public ./frontend/public
EXPOSE 3000
CMD ["node", "dist/index.js"]

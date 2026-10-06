// Configuração carregada pelo Jest antes de cada arquivo de teste (ver jest.config.js).

// o dotenv (chamado em CallAPIPython.ts) imprime um aviso a cada carga do .env;
// silencia para manter a saída dos testes limpa
process.env.DOTENV_CONFIG_QUIET = 'true'

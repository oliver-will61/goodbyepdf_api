import request from 'supertest'
import app from '../../src/app'

// a página de doação é estática: o conversor Python é mockado só para o app não tentar alcançá-lo
jest.mock('../../src/services/conversor.service')

// todas as páginas do site, que repetem o mesmo cabeçalho e rodapé
const PAGINAS = [
    '/',
    '/pages/pdf-para-docx.html',
    '/pages/pdf-para-pptx.html',
    '/pages/pdf-para-xlsx.html',
    '/pages/xlsx-para-pdf.html',
    '/pages/json-para-xlsx.html',
    '/pages/xlsx-para-json.html',
    '/pages/doacao.html',
]

/** Recorta o trecho do HTML entre a abertura e o fechamento de uma tag (ex.: header, footer) */
function trecho(html: string, tag: string): string {
    const inicio = html.indexOf(`<${tag}`)
    const fim = html.indexOf(`</${tag}>`)
    expect(inicio).toBeGreaterThanOrEqual(0)
    expect(fim).toBeGreaterThan(inicio)
    return html.slice(inicio, fim)
}

describe('página de doação', () => {

    it('GET /pages/doacao.html responde 200 com a frase de apoio', async () => {
        const resposta = await request(app).get('/pages/doacao.html').expect(200)

        expect(resposta.text).toContain('Ajude a manter o projeto no ar')
        expect(resposta.text).toContain('/assets/js/pages/doacao.js')
    })

    it('serve o script da página e a configuração do Pix', async () => {
        await request(app).get('/assets/js/pages/doacao.js').expect(200)

        const config = await request(app).get('/assets/js/config/pix.js').expect(200)
        expect(config.text).toContain('export const PIX_COPIA_E_COLA')
    })

    it('a página inicial termina com a seção de apoio que leva à página de doação', async () => {
        const { text: html } = await request(app).get('/').expect(200)

        const principal = trecho(html, 'main')
        const inicioSecao = principal.indexOf('<section aria-labelledby="titulo-apoie"')
        expect(inicioSecao).toBeGreaterThanOrEqual(0)
        // é a última seção do <main>
        expect(principal.indexOf('<section', inicioSecao + 1)).toBe(-1)

        const secao = principal.slice(inicioSecao)
        expect(secao).toContain('Ajude a manter o goodbyePDF no ar')
        expect(secao).toContain('href="/pages/doacao.html"')
    })

    it.each(PAGINAS.filter((pagina) => pagina.includes('-para-')))(
        '%s tem o convite para doar, escondido até a conversão terminar',
        async (pagina) => {
            const { text: html } = await request(app).get(pagina).expect(200)

            // o convite fica dentro do formulário de conversão
            const formulario = trecho(html, 'form')
            const inicio = formulario.indexOf('<div data-convite-doacao')
            expect(inicio).toBeGreaterThanOrEqual(0)

            // o convite é o último elemento do formulário: vai do início dele até o fim do <form>
            const convite = formulario.slice(inicio)
            // começa escondido (conversor.js mostra só depois do sucesso)
            expect(convite).toMatch(/^<div data-convite-doacao class="hidden /)
            expect(convite).toContain('href="/pages/doacao.html"')
        },
    )

    it.each(PAGINAS)('%s tem o link de doação no cabeçalho (botão e menu mobile) e no rodapé', async (pagina) => {
        const { text: html } = await request(app).get(pagina).expect(200)

        const cabecalho = trecho(html, 'header')
        // botão "Apoiar" do cabeçalho
        expect(cabecalho).toMatch(/<a href="\/pages\/doacao\.html" class="btn-apoiar/)
        // link no menu mobile (o último <nav> do cabeçalho)
        const menuMobile = cabecalho.slice(cabecalho.indexOf('id="menu-mobile"'))
        expect(menuMobile).toContain('<a href="/pages/doacao.html" class="nav-link')
        // link no rodapé
        expect(trecho(html, 'footer')).toContain('href="/pages/doacao.html"')
    })
})

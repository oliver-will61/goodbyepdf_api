import request from 'supertest'
import app from '../../src/app'

// a página inicial é estática: o conversor Python é mockado só para o app não tentar alcançá-lo
jest.mock('../../src/services/conversor.service')

// grupos de ferramentas da página inicial, na ordem do projeto, com os links das conversões de cada um (também na ordem)
const GRUPOS: Record<string, string[]> = {
    'de-pdf': ['/pages/pdf-para-docx.html', '/pages/pdf-para-pptx.html', '/pages/pdf-para-xlsx.html'],
    'em-pdf': ['/pages/xlsx-para-pdf.html'],
    outras: ['/pages/json-para-xlsx.html', '/pages/xlsx-para-json.html'],
}

/** Recorta a seção de um grupo de ferramentas (do <section data-grupo> até o seu </section>) */
function secaoDoGrupo(html: string, grupo: string): string {
    const inicio = html.indexOf(`<section data-grupo="${grupo}"`)
    expect(inicio).toBeGreaterThanOrEqual(0)
    return html.slice(inicio, html.indexOf('</section>', inicio))
}

/** Lista os href de páginas de conversão (/pages/...-para-...) na ordem em que aparecem */
function linksDeConversao(html: string): string[] {
    return [...html.matchAll(/href="(\/pages\/[a-z]+-para-[a-z]+\.html)"/g)].map((m) => m[1])
}

describe('página inicial: seções de ferramentas e filtros', () => {

    let html: string

    beforeAll(async () => {
        html = (await request(app).get('/').expect(200)).text
    })

    it('não tem mais a seção única "Ferramentas"', () => {
        expect(html).not.toContain('titulo-ferramentas')
    })

    it('o topo tem os botões de filtro no lugar dos atalhos para as conversões', () => {
        const destaque = html.slice(html.indexOf('<main'), html.indexOf('<div id="ferramentas"'))

        // nenhum link direto para uma conversão no topo
        expect(linksDeConversao(destaque)).toEqual([])

        // um botão "Todas" (ativo no início) e um por grupo, na ordem do projeto
        const filtros = [...destaque.matchAll(/data-filtro="([a-z-]+)" aria-pressed="(true|false)"/g)]
        expect(filtros.map((m) => m[1])).toEqual(['todas', ...Object.keys(GRUPOS)])
        expect(filtros.map((m) => m[2])).toEqual(['true', 'false', 'false', 'false'])
    })

    it('tem uma seção por grupo, na ordem do projeto, dentro de #ferramentas', () => {
        const ferramentas = html.slice(html.indexOf('<div id="ferramentas"'))
        const grupos = [...ferramentas.matchAll(/<section data-grupo="([a-z-]+)"/g)].map((m) => m[1])
        expect(grupos).toEqual(Object.keys(GRUPOS))
    })

    it.each(Object.entries(GRUPOS))('a seção "%s" tem só os cartões das suas conversões', (grupo, links) => {
        const secao = secaoDoGrupo(html, grupo)
        expect(secao).toContain(`aria-labelledby="titulo-${grupo}"`)
        expect(secao).toContain(`id="titulo-${grupo}"`)
        expect(linksDeConversao(secao)).toEqual(links)
    })

    it('carrega e serve o script dos filtros', async () => {
        expect(html).toContain('<script type="module" src="/assets/js/pages/inicio.js"></script>')

        const script = await request(app).get('/assets/js/pages/inicio.js').expect(200)
        expect(script.text).toContain('[data-filtro]')
        expect(script.text).toContain('[data-grupo]')
    })

    it('o filtro não mexe na rolagem da página', async () => {
        const { text: script } = await request(app).get('/assets/js/pages/inicio.js').expect(200)
        // o clique só mostra/esconde seções: nada de rolar até as ferramentas
        expect(script).not.toMatch(/scrollIntoView|scrollTo|scrollBy/)
    })
})

// Endpoints do serviço interno de conversão (Python/FastAPI).
// A URL base vem da variável de ambiente CONVERSOR_API_URL.
export const EndpointsConversor = {
    JSON_XLSX: '/api/json-xlsx',
    XLSX_JSON: '/api/xlsx-json',
    PDF_DOCX: '/api/pdf-docx',
    PDF_PPTX: '/api/pdf-pptx',
    HEALTH: '/health'
} as const

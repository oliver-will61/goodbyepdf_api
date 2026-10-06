import {ErrorMessagens, ErrorCodes} from "../constants/errorMessages"

// classe responsavel por gerenciar as mensagens de erros

export class AppError extends Error {
    public code: string;

    constructor(
        message: string,
        code: string,
    ) {
        super(message) // chama constructor da classe pai (lá tem this.menssage = message)
        this.name = 'AppError'; //também vem da classe pai, por isso não definimos esse atributo
        this.code = code;
        //mostra o StackTrace no terminal
        Error.captureStackTrace(this, AppError)
    }

   
}

// erros de validação em geral 
    // message: mensagem de erro manual
    // code: codigo do erro manual
export class ValidationError extends AppError {
    constructor(message: string, code:string){
        super(message, code)
        this.name = 'ValidationError';
    }
}

//  erros especificos na validação de arquivos
    // message: mensagem de erro definida pela constante ErrorMensagens
    //code: codigo de erro definio pela constante ErrorMensagens
export class FileValidationError extends ValidationError {
    constructor (code: keyof typeof ErrorCodes, extensaoEsperada?: string) {
        let message: string

        switch(code) {
            case ErrorCodes.INVALID_EXTENSION:
                message = ErrorMessagens.FILE.INVALID_EXTENSION(extensaoEsperada)
                break;

            case ErrorCodes.INVALID_JSON:
                message = ErrorMessagens.FILE.INVALID_JSON;
                break;

            case ErrorCodes.NO_FILE:
                message = ErrorMessagens.FILE.NO_FILE;
                break;

            case ErrorCodes.INVALID_EXCEL:
                message = ErrorMessagens.FILE.INVALID_EXCEL;
                break;

            case ErrorCodes.UNSUPPORTED_TYPE:
                message = ErrorMessagens.FILE.UNSUPPORTED_TYPE;
                break;

            default:
                message = ErrorMessagens.FILE.INVALID_OR_CORRUPTED
        }

        super(message, code);
        this.name = 'FileValidationError'
    }
}

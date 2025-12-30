import { Request, Response } from 'express';
import { FactoryController } from '../FactoryController';
import { tiposInterface } from '../Arquivo';
import { FileValidationError, ValidationError } from '../AppError';
import { Arquivo } from '../Arquivo';
import { CallAPIPython } from '../../services/CallAPIPython';

// Mock das dependências
jest.mock('../Arquivo');
jest.mock('../../services/CallAPIPython');

describe('FactoryController - Controller Tests', () => {
  // Mock configurations
  const mockArquivoEsperado: tiposInterface = {
    extensao: 'pdf',
  };
  
  const mockEndPointAPI = '/api/processar';
  
  // Mock Express objects
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;
  
  // Mock instances
  let mockArquivoInstance: any;
  let mockCallAPIPythonInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Express mocks
    mockStatus = jest.fn().mockReturnThis();
    mockJson = jest.fn().mockReturnThis();
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };
    
    mockRequest = {
      file: undefined,
      body: {},
      params: {},
      query: {}
    };

    // Setup Arquivo mock instance
    mockArquivoInstance = {
      validaArquivo: jest.fn()
    };
    
    (Arquivo as jest.MockedClass<typeof Arquivo>).mockImplementation(() => mockArquivoInstance);

    // Setup CallAPIPython mock instance
    mockCallAPIPythonInstance = {
      enviaParaAPI: jest.fn()
    };
    
    (CallAPIPython as jest.MockedClass<typeof CallAPIPython>).mockImplementation(
      () => mockCallAPIPythonInstance
    );
  });

  describe('handleUpload Method', () => {
    let Controller: any;
    let controllerInstance: any;
    let mockFile: Express.Multer.File;

    beforeEach(() => {
      Controller = FactoryController.createController(
        mockArquivoEsperado,
        mockEndPointAPI
      );
      controllerInstance = new Controller();
      
      mockFile = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
        destination: '',
        filename: 'test.pdf',
        path: '',
        buffer: Buffer.from('test content'),
        stream: null as any
      };
    });

    describe('Error Cases', () => {
      it('deve retornar 400 quando não há arquivo', async () => {
        // Arrange
        mockRequest.file = undefined;

        // Act
        await controllerInstance.handleUpload(
          mockRequest as Request,
          mockResponse as Response
        );

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          mensagem: expect.any(String),
          code: 'NO_FILE'
        });
        
        // Verifica que não chamou validaArquivo nem enviaParaAPI
        expect(mockArquivoInstance.validaArquivo).not.toHaveBeenCalled();
        expect(mockCallAPIPythonInstance.enviaParaAPI).not.toHaveBeenCalled();
      });

      it('deve tratar ValidationError corretamente', async () => {
        // Arrange
        mockRequest.file = mockFile;
        const validationError = new ValidationError('Arquivo não encontrado', 'FILE_NOT_FOUND');
        mockArquivoInstance.validaArquivo.mockRejectedValue(validationError);

        // Act
        await controllerInstance.handleUpload(
          mockRequest as Request,
          mockResponse as Response
        );

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(404);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          mensagem: 'Arquivo não encontrado',
          code: 'FILE_NOT_FOUND'
        });
        expect(mockCallAPIPythonInstance.enviaParaAPI).not.toHaveBeenCalled();
      });

      it('deve tratar Error genérico corretamente', async () => {
        // Arrange
        mockRequest.file = mockFile;
        const genericError = new Error('Erro interno do servidor');
        mockArquivoInstance.validaArquivo.mockRejectedValue(genericError);

        // Act
        await controllerInstance.handleUpload(
          mockRequest as Request,
          mockResponse as Response
        );

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith({
          mensagem: 'Erro interno do servidor'
        });
        expect(mockCallAPIPythonInstance.enviaParaAPI).not.toHaveBeenCalled();
      });

      it('deve tratar erro desconhecido (não Error) corretamente', async () => {
        // Arrange
        mockRequest.file = mockFile;
        const unknownError = 'String error não é instância de Error';
        mockArquivoInstance.validaArquivo.mockRejectedValue(unknownError);

        // Act
        await controllerInstance.handleUpload(
          mockRequest as Request,
          mockResponse as Response
        );

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith({
          mensagem: expect.any(String) // ErrorMessagens.OTHER
        });
        expect(mockCallAPIPythonInstance.enviaParaAPI).not.toHaveBeenCalled();
      });
    }); // Fechamento do describe('Error Cases') que estava faltando

    describe('Flow Control', () => {
      it('não deve chamar validaArquivo quando não há arquivo', async () => {
        // Arrange
        mockRequest.file = undefined;

        // Act
        await controllerInstance.handleUpload(
          mockRequest as Request,
          mockResponse as Response
        );

        // Assert
        expect(mockArquivoInstance.validaArquivo).not.toHaveBeenCalled();
        expect(mockCallAPIPythonInstance.enviaParaAPI).not.toHaveBeenCalled();
      });

      it('não deve chamar enviaParaAPI quando validaArquivo falha', async () => {
        // Arrange
        mockRequest.file = mockFile;
        mockArquivoInstance.validaArquivo.mockRejectedValue(
          new FileValidationError('INVALID_OR_CORRUPTED')
        );

        // Act
        await controllerInstance.handleUpload(
          mockRequest as Request,
          mockResponse as Response
        );

        // Assert
        expect(mockArquivoInstance.validaArquivo).toHaveBeenCalled();
        expect(mockCallAPIPythonInstance.enviaParaAPI).not.toHaveBeenCalled();
      });

      it('deve chamar enviaParaAPI apenas quando validaArquivo for bem-sucedido', async () => {
        // Arrange
        mockRequest.file = mockFile;
        mockArquivoInstance.validaArquivo.mockResolvedValue(true);
        mockCallAPIPythonInstance.enviaParaAPI.mockResolvedValue({});

        // Act
        await controllerInstance.handleUpload(
          mockRequest as Request,
          mockResponse as Response
        );

        // Assert
        expect(mockArquivoInstance.validaArquivo).toHaveBeenCalled();
        expect(mockCallAPIPythonInstance.enviaParaAPI).toHaveBeenCalled();
      });
    });
  });
});
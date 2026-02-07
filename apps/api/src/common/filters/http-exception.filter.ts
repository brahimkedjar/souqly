import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = undefined;
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;

      if (typeof res === 'string') {
        message = res;
      } else if (res) {
        message = res.message || message;
        details = res.details || res.error || res;
        code = res.code || res.statusCode || code;
      }
    }

    if (Array.isArray(message)) {
      details = message;
      message = 'Validation error';
      code = 'VALIDATION_ERROR';
    }

    response.status(status).json({
      success: false,
      message,
      code,
      details,
    });
  }
}


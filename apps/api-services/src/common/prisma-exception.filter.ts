import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@livestock/database';

/**
 * Maps database errors to meaningful HTTP responses instead of leaking a
 * generic 500 (and internal details) to the client.
 */
@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'A database error occurred.';

    if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'The request contained invalid or missing fields.';
    } else {
      switch (exception.code) {
        case 'P2002': {
          const target = (exception.meta?.target as string[] | string | undefined) ?? 'field';
          status = HttpStatus.CONFLICT;
          message = `A record with this ${Array.isArray(target) ? target.join(', ') : target} already exists.`;
          break;
        }
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'The requested record was not found.';
          break;
        case 'P2003':
        case 'P2014':
          status = HttpStatus.CONFLICT;
          message = 'This operation conflicts with related records (e.g. the record is still referenced elsewhere).';
          break;
        default:
          this.logger.error(`Unhandled Prisma error ${exception.code}: ${exception.message}`);
      }
    }

    res.status(status).json({ statusCode: status, message, error: HttpStatus[status] });
  }
}

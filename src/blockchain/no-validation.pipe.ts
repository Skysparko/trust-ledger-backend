import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * A pipe that does nothing - just passes through the value
 * Used to bypass ValidationPipe for endpoints that do manual validation
 */
@Injectable()
export class NoValidationPipe implements PipeTransform<any> {
  transform(value: any, metadata: ArgumentMetadata) {
    return value;
  }
}


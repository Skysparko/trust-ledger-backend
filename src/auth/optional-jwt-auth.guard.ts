import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to allow requests without tokens
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If there's an error or no user, return undefined instead of throwing
    // This allows the request to proceed without authentication
    // Don't throw errors - just return undefined if authentication failed
    if (err || !user) {
      return undefined;
    }
    return user;
  }

  // Override canActivate to catch errors and allow request to proceed
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check if authorization header exists
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    
    // If no authorization header, allow request to proceed without authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    // Try to authenticate if token is provided
    try {
      const result = super.canActivate(context);
      
      // Handle both Observable and Promise/boolean cases
      if (result instanceof Observable) {
        return result.pipe(
          catchError(() => {
            // If authentication fails (invalid token, expired, etc.), 
            // return true to allow the request to proceed without authentication
            return of(true);
          }),
        );
      }
      
      // If it's a Promise or boolean, wrap it
      return Promise.resolve(result).catch(() => true);
    } catch (error) {
      // If any error occurs, allow request to proceed
      return true;
    }
  }
}


import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { UserService } from '../service/user.service';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const authGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const userService = inject(UserService);
  const router = inject(Router);

  // already have a user
  if (userService.user.value()) return true;

  // wait if a request is in flight
  while (userService.user.isLoading()) {
    await delay(50);
  }

  // after settling, allow only if we have a user and no error
  if (userService.user.value() && !userService.user.error()) return true;

  return router.parseUrl('/login');
};

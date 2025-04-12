import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AccountService } from '@app/_services';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
  constructor(
    private router: Router,
    private accountService: AccountService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const account = this.accountService.accountValue;

    if (account) {
      // Check if route is restricted by role
      if (route.data.roles && !route.data.roles.includes(account.role)) {
        // Role not authorized so redirect to home page
        this.router.navigate(['/']);
        return false;
      }

      // Authorized so return true
      return true;
    }

    // Not logged in so redirect to login page with the return URL
    this.router.navigate(['/account/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
}

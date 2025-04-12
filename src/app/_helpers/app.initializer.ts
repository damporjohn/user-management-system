import { AccountService } from '@app/_services';

export function appInitializer(accountService: AccountService) {
  return () => new Promise<void>(resolve => {
    // Attempt to refresh token on app startup to auto authenticate
    accountService.refreshToken()
      .subscribe()
      .add(resolve);
  });
}

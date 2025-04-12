import { Injectable } from '@angular/core';
import { HttpRequest, HttpResponse, HttpHandler, HttpEvent, HttpInterceptor, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, mergeMap, materialize, dematerialize } from 'rxjs/operators';

import { AlertService } from '../_services';
import { Role } from '../_models/role';

// array in local storage for accounts
const accountsKey = 'angular-users-accounts';
const accountsJSON = localStorage.getItem(accountsKey);
let accounts: any[] = accountsJSON ? JSON.parse(accountsJSON) : [];

// add test user
if (!accounts.find((x: any) => x.email === 'test@example.com')) {
    // create test users with hashed passwords
    const testUser = {
        id: '1',
        title: 'Mr',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        role: Role.User,
        password: 'test123',
        created: new Date('2023-01-01').toISOString(),
        isVerified: true
    };
    
    accounts.push(testUser);
    localStorage.setItem(accountsKey, JSON.stringify(accounts));
}

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
    constructor(private alertService: AlertService) {}

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const { url, method, headers, body } = request;

        // wrap in delayed observable to simulate server api call
        return of(null)
            .pipe(mergeMap(handleRoute))
            .pipe(materialize()) // call materialize and dematerialize to ensure delay even if an error is thrown
            .pipe(delay(500))
            .pipe(dematerialize());

        function handleRoute() {
            switch (true) {
                case url.endsWith('/accounts/authenticate') && method === 'POST':
                    return authenticate();
                case url.endsWith('/accounts/refresh-token') && method === 'POST':
                    return refreshToken();
                case url.endsWith('/accounts/revoke-token') && method === 'POST':
                    return revokeToken();
                case url.endsWith('/accounts/register') && method === 'POST':
                    return register();
                case url.endsWith('/accounts/verify-email') && method === 'POST':
                    return verifyEmail();
                case url.endsWith('/accounts/forgot-password') && method === 'POST':
                    return forgotPassword();
                case url.endsWith('/accounts/validate-reset-token') && method === 'POST':
                    return validateResetToken();
                case url.endsWith('/accounts/reset-password') && method === 'POST':
                    return resetPassword();
                case url.endsWith('/accounts') && method === 'GET':
                    return getAccounts();
                case url.match(/\/accounts\/\w+$/) && method === 'GET':
                    return getAccountById();
                case url.endsWith('/accounts') && method === 'POST':
                    return createAccount();
                case url.match(/\/accounts\/\w+$/) && method === 'PUT':
                    return updateAccount();
                case url.match(/\/accounts\/\w+$/) && method === 'DELETE':
                    return deleteAccount();
                default:
                    // pass through any requests not handled above
                    return next.handle(request);
            }    
        }

        // route functions

        function authenticate() {
            const { email, password } = body;
            const account = accounts.find(x => x.email === email && x.password === password && x.isVerified);
            
            if (!account) return error('Email or password is incorrect');
            
            return ok({
                ...basicDetails(account),
                jwtToken: generateJwtToken(account)
            });
        }

        function refreshToken() {
            const refreshToken = getRefreshToken();
            
            if (!refreshToken) return unauthorized();
            
            const account = accounts.find(x => x.refreshTokens?.includes(refreshToken));
            
            if (!account) return unauthorized();
            
            // replace old refresh token with a new one and save
            const newRefreshToken = generateRefreshToken();
            account.refreshTokens = account.refreshTokens.filter(x => x !== refreshToken);
            account.refreshTokens.push(newRefreshToken);
            
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            
            return ok({
                ...basicDetails(account),
                jwtToken: generateJwtToken(account)
            });
        }

        function revokeToken() {
            const refreshToken = getRefreshToken();
            if (!refreshToken) return ok();
            
            const account = accounts.find(x => x.refreshTokens?.includes(refreshToken));
            
            // revoke token and save
            if (account) {
                account.refreshTokens = account.refreshTokens.filter(x => x !== refreshToken);
                localStorage.setItem(accountsKey, JSON.stringify(accounts));
            }
            
            return ok();
        }

        function register() {
            const account = body;
            
            if (accounts.find(x => x.email === account.email)) {
                // display email already registered in alert
                setTimeout(() => {
                    this.alertService.error(`Email ${account.email} is already registered`);
                }, 100);
                
                // always return ok() response to prevent email enumeration
                return ok();
            }
            
            // assign account id and a few other properties and save
            account.id = newAccountId();
            account.created = new Date().toISOString();
            account.isVerified = false;
            account.verificationToken = generateVerificationToken();
            
            // first registered account is an admin
            const isFirstAccount = accounts.length === 0;
            account.role = isFirstAccount ? Role.Admin : Role.User;
            account.refreshTokens = [];
            
            accounts.push(account);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            
            // display verification in email alert
            setTimeout(() => {
                const verifyUrl = `${location.origin}/account/verify-email?token=${account.verificationToken}`;
                this.alertService.info(`
                    <h4>Verification Email</h4>
                    <p>Thanks for registering!</p>
                    <p>Please click the below link to verify your email address:</p>
                    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
                `);
            }, 100);
            
            return ok();
        }

        function verifyEmail() {
            const { token } = body;
            const account = accounts.find(x => x.verificationToken === token);
            
            if (!account) return error('Verification token is invalid');
            
            // set is verified flag to true if token is valid
            account.isVerified = true;
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            
            return ok();
        }

        function forgotPassword() {
            const { email } = body;
            const account = accounts.find(x => x.email === email);
            
            // always return ok() response to prevent email enumeration
            if (!account) return ok();
            
            // create reset token that expires after 24 hours
            account.resetToken = {
                token: generateResetToken(),
                expires: new Date(Date.now() + 24*60*60*1000).toISOString()
            };
            
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            
            // display password reset in email alert
            setTimeout(() => {
                const resetUrl = `${location.origin}/account/reset-password?token=${account.resetToken.token}`;
                this.alertService.info(`
                    <h4>Reset Password Email</h4>
                    <p>Please click the below link to reset your password, the link will be valid for 1 day:</p>
                    <p><a href="${resetUrl}">${resetUrl}</a></p>
                `);
            }, 100);
            
            return ok();
        }

        function validateResetToken() {
            const { token } = body;
            const account = accounts.find(x => 
                x.resetToken?.token === token &&
                new Date() < new Date(x.resetToken.expires)
            );
            
            if (!account) return error('Invalid token');
            
            return ok();
        }

        function resetPassword() {
            const { token, password } = body;
            const account = accounts.find(x => 
                x.resetToken?.token === token &&
                new Date() < new Date(x.resetToken.expires)
            );
            
            if (!account) return error('Invalid token');
            
            // update password and remove reset token
            account.password = password;
            account.resetToken = undefined;
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            
            return ok();
        }

        function getAccounts() {
            if (!isAuthenticated()) return unauthorized();
            
            // user accounts can get own profile and admin accounts can get all profiles
            if (currentAccount().role === Role.Admin) {
                return ok(accounts.map(x => basicDetails(x)));
            } else {
                return ok(accounts.filter(x => x.id === currentAccount().id).map(x => basicDetails(x)));
            }
        }

        function getAccountById() {
            if (!isAuthenticated()) return unauthorized();
            
            // users can get their own account and admins can get any account
            if (currentAccount().role !== Role.Admin && currentAccount().id !== idFromUrl()) {
                return unauthorized();
            }
            
            const account = accounts.find(x => x.id === idFromUrl());
            if (!account) return notFound();
            
            return ok(basicDetails(account));
        }

        function createAccount() {
            if (!isAuthenticated() || currentAccount().role !== Role.Admin) return unauthorized();
            
            const account = body;
            
            if (accounts.find(x => x.email === account.email)) {
                return error(`Email ${account.email} is already registered`);
            }
            
            // assign account id and a few other properties then save
            account.id = newAccountId();
            account.created = new Date().toISOString();
            account.isVerified = true;
            account.refreshTokens = [];
            
            accounts.push(account);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            
            return ok();
        }

        function updateAccount() {
            if (!isAuthenticated()) return unauthorized();
            
            // users can update own account and admins can update any account
            if (currentAccount().role !== Role.Admin && currentAccount().id !== idFromUrl()) {
                return unauthorized();
            }
            
            const account = accounts.find(x => x.id === idFromUrl());
            if (!account) return notFound();
            
            const updatedAccount = body;
            
            // only update password if included
            if (updatedAccount.password) {
                updatedAccount.password = updatedAccount.password;
            } else {
                updatedAccount.password = account.password;
            }
            
            // don't save confirm password
            delete updatedAccount.confirmPassword;
            
            // update and save account
            Object.assign(account, updatedAccount);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            
            return ok(basicDetails(account));
        }

        function deleteAccount() {
            if (!isAuthenticated()) return unauthorized();
            
            // users can delete own account and admins can delete any account
            if (currentAccount().role !== Role.Admin && currentAccount().id !== idFromUrl()) {
                return unauthorized();
            }
            
            accounts = accounts.filter(x => x.id !== idFromUrl());
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            
            return ok();
        }

        // helper functions

        function ok(body?: any) {
            return of(new HttpResponse({ status: 200, body }));
        }

        function unauthorized() {
            return throwError({ status: 401, error: { message: 'Unauthorized' } });
        }

        function error(message: string) {
            return throwError({ error: { message } });
        }

        function notFound() {
            return throwError({ status: 404, error: { message: 'Not Found' } });
        }

        function basicDetails(account: any) {
            const { id, title, firstName, lastName, email, role, created, isVerified } = account;
            return { id, title, firstName, lastName, email, role, created, isVerified };
        }

        function isAuthenticated() {
            return !!currentAccount();
        }

        function currentAccount() {
            // check if jwt token is in auth header
            const authHeader = headers.get('Authorization');
            if (!authHeader?.startsWith('Bearer ')) return null;
            
            const jwtToken = authHeader.substring(7);
            
            // check if token is expired
            const decodedToken = JSON.parse(atob(jwtToken.split('.')[1]));
            const tokenExpired = Date.now() > decodedToken.exp * 1000;
            if (tokenExpired) return null;
            
            const accountId = decodedToken.id;
            return accounts.find(x => x.id === accountId);
        }

        function idFromUrl() {
            const urlParts = url.split('/');
            return urlParts[urlParts.length - 1];
        }

        function newAccountId() {
            return (accounts.length ? Math.max(...accounts.map(x => parseInt(x.id))) + 1 : 1).toString();
        }

        function generateJwtToken(account: any) {
            // create token that expires in 15 minutes
            const tokenPayload = { 
                exp: Math.round(new Date(Date.now() + 15*60*1000).getTime() / 1000),
                id: account.id
            }
            return `fake-jwt-token.${btoa(JSON.stringify(tokenPayload))}`;
        }

        function generateRefreshToken() {
            const token = new Date().getTime().toString();
            
            // add token cookie that expires in 7 days
            const expires = new Date(Date.now() + 7*24*60*60*1000).toUTCString();
            document.cookie = `fakeRefreshToken=${token}; expires=${expires}; path=/`;
            
            return token;
        }

        function getRefreshToken() {
            // get refresh token from cookie
            return (document.cookie.split(';').find(x => x.includes('fakeRefreshToken')) || '=').split('=')[1];
        }

        function generateVerificationToken() {
            return `fake-verification-token-${new Date().getTime()}`;
        }

        function generateResetToken() {
            return `fake-reset-token-${new Date().getTime()}`;
        }
    }
}

export const fakeBackendProvider = {
    // use fake backend in place of Http service for backend-less development
    provide: HTTP_INTERCEPTORS,
    useClass: FakeBackendInterceptor,
    multi: true
};

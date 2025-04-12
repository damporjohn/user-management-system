import { Component } from '@angular/core';
import { AccountService } from './_services/account.service';
import {Account, Role} from './_models';

@Component({
    selector: 'app',
    templateUrl: 'app.component.html'
})
export class AppComponent {
    role = Role;
    account: Account;

    constructor(private accountService: AccountService) {
        this.accountService.account.subscribe(x => this.account = x);
    }

    logout() {
        this.accountService.logout();
    }
}

import { Role } from './role';

export class Account {
  id: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  jwtToken?: string;
}

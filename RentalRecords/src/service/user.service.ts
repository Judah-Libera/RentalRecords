import { Injectable, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { env } from '../env';
import { User } from '../objects';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly userId = signal<string | null>(null);
  user = httpResource<User | null>(() => { // .id updates properties list
    const login = this.userId();
    if (!login) return undefined;
    return {
      url: `${env.apiBaseUrl}/users/${encodeURIComponent(login)}`,
      method: 'GET',
    };
  });

  loadUser(id: string): void {
    this.userId.set(id);
  }
  clear(): void {
    this.userId.set(null);
  }
}

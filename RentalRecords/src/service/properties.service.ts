import { Injectable, computed, inject, signal } from '@angular/core';
import { httpResource, HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { env } from '../env';
import { Property } from '../objects';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class PropertiesService {
  private readonly http = inject(HttpClient);
  private readonly userService = inject(UserService);

  readonly properties = httpResource<Property[] | null>(() => {
    const userId = this.userService.user.value()?.id;
    if (!userId) return undefined;

    return {
      url: `${env.apiBaseUrl}/properties/${encodeURIComponent(userId)}`,
      method: 'GET',
    };
  });

  activeProperty = signal<Property | null>(null); // .id updates ledgerList

  async create(property: Partial<Property>): Promise<void> {
    const userId = this.userService.user.value()?.id;
    if (!userId) throw new Error('No user loaded.');

    property.userId = userId;

    await firstValueFrom(
      this.http.post<void>(
        `${env.apiBaseUrl}/properties`, property
      )
    );

    this.properties.reload();
  }
}

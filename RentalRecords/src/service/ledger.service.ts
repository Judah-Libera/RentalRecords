import { Injectable, computed, inject } from '@angular/core';
import { PropertiesService } from './properties.service';
import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { UserService } from './user.service';
import { env } from '../env';
import { BillType, LedgerType, Ledger } from '../objects';

@Injectable({ providedIn: 'root' })
export class LedgerService {
  private readonly httpClient = inject(HttpClient);
  private readonly propertiesService = inject(PropertiesService);
  private readonly userService = inject(UserService);

  readonly activePropertyId = computed(() => this.propertiesService.activeProperty()?.id ?? null);

  incomeRent(date: string, description: string | null, amount: number): void {
    this.add({ date, description, amount, type: 'income:rent' });
  }

  incomeDeposit(date: string, description: string | null, amount: number): void {
    this.add({ date, description, amount, type: 'income:deposit' });
  }

  incomeOther(date: string, description: string | null, amount: number): void {
    this.add({ date, description, amount, type: 'income:other' });
  }

  expenseBill(date: string, description: string | null, billType: BillType, amount: number): void {
    this.add({ date, description, amount, type: `expense:bill:${billType}` });
  }

  expenseMortgage(date: string, description: string | null, amount: number): void {
    this.add({ date, description, amount, type: `expense:mortgage` });
  }

  expenseDeposit(date: string, description: string | null, amount: number): void {
    this.add({ date, description, amount, type: 'expense:deposit' });
  }

  expenseRepair(date: string, description: string | null, amount: number): void {
    this.add({ date, description, amount, type: 'expense:repair' });
  }

  expenseOther(date: string, description: string | null, amount: number): void {
    this.add({ date, description, amount, type: 'expense:other' });
  }

  filterLedger(
    list: readonly Ledger[] | null | undefined,
    options?: {
      year?: number;
      type?: LedgerType;
    }
  ): Ledger[] {
    const year = options?.year;
    const type = options?.type;
    const todayIso = new Date().toISOString().slice(0, 10);

    return (list ?? [])
      .filter(item => {
        const itemYear = Number.parseInt(item.date.slice(0, 4), 10);
        const matchesYear = year === undefined || itemYear === year;
        const matchesType = type === undefined || item.type === type;

        return matchesYear && matchesType;
      })
      .sort((a, b) => {
        const aIsFuture = a.date > todayIso;
        const bIsFuture = b.date > todayIso;

        if (aIsFuture !== bIsFuture) {
          return aIsFuture ? 1 : -1;
        }
        return b.date.localeCompare(a.date);
      });
  }

  private add(input: { date: string; description: string | null; type: LedgerType; amount: number }): void {
    const propertyId = this.activePropertyId();
    if (!propertyId) throw new Error('No active property selected.');
    const userId = this.userService.user.value()?.id;
    if (!userId) throw new Error('No user loaded.');

    const entry: Partial<Ledger> = {
      propertyId,
      userId,
      date: input.date,
      description: input.description,
      type: input.type,
      amount: input.amount,
    };

    this.httpClient
      .post<void>(`${env.apiBaseUrl}/ledger`, entry)
      .subscribe({
        next: () => this.apiLedgerList.reload(),
        error: console.error
      });
  }

  delete(id: string) {
    this.httpClient
      .delete<void>(`${env.apiBaseUrl}/ledger/${encodeURIComponent(id)}`)
      .subscribe({
        next: () => this.apiLedgerList.reload(),
        error: console.error
      });
  }

  deleteRange(type?: string, startDate?: string, endDate?: string) {
    const propertyId = this.activePropertyId();
    if (!propertyId) throw new Error('No active property selected.');

    let params = new HttpParams().set('propertyId', propertyId);
    if (type) params = params.set('type', type);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    this.httpClient
      .delete<void>(`${env.apiBaseUrl}/ledger`, { params })
      .subscribe({
        next: () => this.apiLedgerList.reload(),
        error: console.error,
      });
  }

  readonly apiLedgerList = httpResource<Ledger[] | null>(() => {
    const propertyId = this.activePropertyId();
    if (!propertyId) return undefined;

    return {
      url: `${env.apiBaseUrl}/ledger/${encodeURIComponent(propertyId)}`,
      method: 'GET',
    };
  });
  ledgerList = computed(() => {
    const list = this.apiLedgerList.value() ?? [];
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  });
}

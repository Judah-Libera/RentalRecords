import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, computed, signal } from '@angular/core';
import { Ledger, LedgerType } from '../../../objects';
import { LedgerService } from '../../../service/ledger.service';

@Component({
  selector: 'app-view-ledger',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './viewLedger.component.html',
  styleUrl: './viewLedger.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewLedgerComponent {
  readonly ledgerService = inject(LedgerService);

  readonly availableTypes: ReadonlyArray<LedgerType> = [
    'income:rent',
    'income:deposit',
    'income:other',
    'expense:bill:water',
    'expense:bill:electric',
    'expense:bill:internet',
    'expense:bill:other',
    'expense:mortgage',
    'expense:deposit',
    'expense:repair',
    'expense:other',
  ];

  readonly availableYears: ReadonlyArray<number> = [
    2026,
    //2025,
  ];

  readonly todayIso = new Date().toISOString().slice(0, 10);
  readonly currentYear = new Date().getFullYear();

  readonly selectedType = signal<LedgerType | 'all'>('all');
  readonly selectedYear = signal(this.currentYear);

  readonly filteredLedger = computed(() => {
    const selectedType = this.selectedType();
    const selectedYear = this.selectedYear();

    return this.ledgerService.filterLedger(this.ledgerService.ledgerList(), {
      year: selectedYear,
      type: selectedType === 'all' ? undefined : selectedType,
    });
  });

  readonly totalForSelection = computed(() => {
    return this.filteredLedger()
      .filter(x => x.date <= this.todayIso)
      .reduce((sum, x) => sum + x.amount, 0);
  });

  delete(id: Ledger['id']): void {
    this.ledgerService.delete(id);
  }

  deleteCurrentYearMortgage(): void {
    const year = new Date().getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year + 1}-12-31`;
    this.ledgerService.deleteRange('expense:mortgage', startDate, endDate);
  }

  onTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value ?? 'all';
    this.selectedType.set(value as LedgerType | 'all');
  }

  onYearChange(event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value ?? `${this.currentYear}`;
    this.selectedYear.set(Number.parseInt(value, 10));
  }
}

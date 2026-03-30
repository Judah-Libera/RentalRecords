import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { Ledger } from '../../../objects';
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

  readonly todayIso = new Date().toISOString().slice(0, 10);
  readonly year = new Date().getFullYear();
  readonly start = `${this.year}-01-01`;
  readonly totalThisYear = computed(() => {
    const ledger = this.ledgerService.ledgerList() ?? [];
    return ledger
      .filter(x => x.date >= this.start && x.date <= this.todayIso)
      .reduce((sum, x) => sum + x.amount, 0);
  });


  delete(id: Ledger['id']): void {
    this.ledgerService.delete(id);
  }

  deleteCurrentYearMortgage(): void {
    const year = new Date().getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year + 1}-12-31`;
    this.ledgerService.deleteRange("expense:mortgage", startDate, endDate);
  }
}

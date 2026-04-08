import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LedgerService } from '../../../service/ledger.service';
import { BillType } from '../../../objects';


type MortgageType = 'single' | 'monthly';

@Component({
  selector: 'app-edit-ledger',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './editLedger.component.html',
  styleUrl: './editLedger.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditLedgerComponent {
  private readonly fb = inject(FormBuilder);
  private ledgerService = inject(LedgerService);

  readonly billOptions: readonly { value: BillType; label: string }[] = [
    { value: 'water', label: 'Water' },
    { value: 'electric', label: 'Electric' },
    { value: 'internet', label: 'Internet' },
    { value: 'other', label: 'Other' },
  ] as const;

  readonly mortgageOptions: readonly { value: MortgageType; label: string }[] = [
    { value: 'single', label: 'Single' },
    { value: 'monthly', label: 'Monthly' },
  ] as const;

  readonly form = this.fb.group({
    date: this.fb.control<string>(this.todayIso(), { nonNullable: true, validators: [Validators.required] }),
    description: this.fb.control<string | null>(null),

    income: this.fb.group({
      rent: this.fb.control<number | null>(null, [Validators.min(0)]),
      deposit: this.fb.control<number | null>(null, [Validators.min(0)]),
      other: this.fb.control<number | null>(null, [Validators.min(0)]),
    }),

    expenses: this.fb.group({
      billType: this.fb.control<BillType>('water', { nonNullable: true }),
      billAmount: this.fb.control<number | null>(null, [Validators.min(0)]),

      mortgageType: this.fb.control<MortgageType>('monthly', { nonNullable: true }),
      mortgageAmount: this.fb.control<number | null>(null, [Validators.min(0)]),

      deposit: this.fb.control<number | null>(null, [Validators.min(0)]),
      repairs: this.fb.control<number | null>(null, [Validators.min(0)]),
      other: this.fb.control<number | null>(null, [Validators.min(0)]),
    }),
  });

  addRent(): void {
    const amount = this.form.controls.income.controls.rent.value;
    if (!this.canSubmitAmount(amount)) return;

    this.ledgerService.incomeRent(this.form.controls.date.value, this.form.controls.description.value, amount);
    this.form.controls.income.controls.rent.setValue(null);
    this.form.controls.description.setValue(null);
  }

  addIncomeDeposit(): void {
    const amount = this.form.controls.income.controls.deposit.value;
    if (!this.canSubmitAmount(amount)) return;

    this.ledgerService.incomeDeposit(this.form.controls.date.value, this.form.controls.description.value, amount);
    this.form.controls.income.controls.deposit.setValue(null);
    this.form.controls.description.setValue(null);
  }

  addIncomeOther(): void {
    const amount = this.form.controls.income.controls.other.value;
    if (!this.canSubmitAmount(amount)) return;

    this.ledgerService.incomeOther(this.form.controls.date.value, this.form.controls.description.value, amount);
    this.form.controls.income.controls.other.setValue(null);
    this.form.controls.description.setValue(null);
  }

  addBill(): void {
    const type = this.form.controls.expenses.controls.billType.value;
    const amount = this.form.controls.expenses.controls.billAmount.value;
    if (!this.canSubmitAmount(amount)) return;

    this.ledgerService.expenseBill(this.form.controls.date.value, this.form.controls.description.value, type, amount);
    this.form.controls.expenses.controls.billAmount.setValue(null);
    this.form.controls.description.setValue(null);
  }

  addMortgage(): void {
    const type = this.form.controls.expenses.controls.mortgageType.value;
    const amount = this.form.controls.expenses.controls.mortgageAmount.value;
    if (!this.canSubmitAmount(amount)) return;

    if (type === 'single') {
      this.ledgerService.expenseMortgage(this.form.controls.date.value, this.form.controls.description.value, amount);
    }
    else if (type === 'monthly') {
      const thisYear = new Date().getFullYear();
      for (let month = 0; month < 12; month++) {
        const d = new Date(thisYear, month, 1); // local time
        const iso = d.toISOString().slice(0, 10);
        this.ledgerService.expenseMortgage(iso, null, amount);
      }
    }
    
    this.form.controls.expenses.controls.mortgageAmount.setValue(null);
    this.form.controls.description.setValue(null);
  }

  addExpenseDeposit(): void {
    const amount = this.form.controls.expenses.controls.deposit.value;
    if (!this.canSubmitAmount(amount)) return;

    this.ledgerService.expenseDeposit(this.form.controls.date.value, this.form.controls.description.value, amount);
    this.form.controls.expenses.controls.deposit.setValue(null);
    this.form.controls.description.setValue(null);
  }

  addRepairs(): void {
    const amount = this.form.controls.expenses.controls.repairs.value;
    if (!this.canSubmitAmount(amount)) return;

    this.ledgerService.expenseRepair(this.form.controls.date.value, this.form.controls.description.value, amount);
    this.form.controls.expenses.controls.repairs.setValue(null);
    this.form.controls.description.setValue(null);
  }

  addExpenseOther(): void {
    const amount = this.form.controls.expenses.controls.other.value;
    if (!this.canSubmitAmount(amount)) return;

    this.ledgerService.expenseOther(this.form.controls.date.value, this.form.controls.description.value, amount);
    this.form.controls.expenses.controls.other.setValue(null);
    this.form.controls.description.setValue(null);
  }

  private canSubmitAmount(amount: number | null): amount is number {
    return typeof amount === 'number' && Number.isFinite(amount) && amount > 0;
  }

  private todayIso(): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
}

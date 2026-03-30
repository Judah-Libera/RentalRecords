import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PropertiesService } from '../../service/properties.service';
import { Property } from '../../objects';
import { ViewLedgerComponent } from '../components/viewLedger/viewLedger.component';
import { EditLedgerComponent } from '../components/editLedger/editLedger.component';

@Component({
  selector: 'app-properties',
  templateUrl: './properties.page.html',
  styleUrl: './properties.page.css',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ViewLedgerComponent, EditLedgerComponent],
})
export class PropertiesPage {
  private readonly fb = inject(FormBuilder);
  propertiesService = inject(PropertiesService);

  openProperty(property: Property): void {
    this.propertiesService.activeProperty.set(property);
  }

  closeModal(): void {
    this.propertiesService.activeProperty.set(null);
  }

  createModalOpen = signal(false);
  readonly createForm = this.fb.group({
    number: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    address: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
  });
  openCreateModal(): void {
    this.createModalOpen.set(true);
  }
  closeCreateModal(): void {
    this.createModalOpen.set(false);
    this.createForm.reset({ number: '', address: '' });
  }

  createNewProperty(): void {
    if (this.createForm.invalid) return;

    const newProperty: Partial<Property> = {
      number: this.createForm.controls.number.value,
      address: this.createForm.controls.address.value,
    }

    this.propertiesService.create(newProperty);
    this.closeCreateModal();
  }
}

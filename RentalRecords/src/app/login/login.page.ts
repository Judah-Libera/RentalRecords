import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../service/user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
  imports: [ReactiveFormsModule],
  standalone: true,
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private userService = inject(UserService);

  form = this.fb.group({
    login: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const login = this.form.controls.login.value;
    this.userService.loadUser(login);

    this.router.navigateByUrl('/properties');
  }
}

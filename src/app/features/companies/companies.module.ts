import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CompaniesPage } from './companies.page';
@NgModule({
  declarations: [CompaniesPage],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: CompaniesPage }]),
  ],
})
export class CompaniesModule {}

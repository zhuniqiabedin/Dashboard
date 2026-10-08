import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CalendarPage } from './calendar.page';
@NgModule({
  declarations: [CalendarPage],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: CalendarPage }]),
  ],
})
export class CalendarModule {}

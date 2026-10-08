import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MessagesPage } from './messages.page';
@NgModule({
  declarations: [MessagesPage],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: MessagesPage }]),
  ],
})
export class MessagesModule {}

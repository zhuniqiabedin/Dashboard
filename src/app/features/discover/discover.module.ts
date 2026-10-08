import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DiscoverPage } from './discover.page';
import { SkillsChipsComponent } from '../../shared/skills-chips/skills-chips.component';

@NgModule({
  declarations: [DiscoverPage],
  imports: [
    CommonModule,
    FormsModule,
    SkillsChipsComponent,
    RouterModule.forChild([{ path: '', component: DiscoverPage }]),
  ],
})
export class DiscoverModule {}

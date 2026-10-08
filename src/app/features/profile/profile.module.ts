import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProfilePage } from './profile.page';
import { SkillsChipsComponent } from '../../shared/skills-chips/skills-chips.component';

@NgModule({
  declarations: [ProfilePage],
  imports: [
    CommonModule,
    SkillsChipsComponent,
    FormsModule,
    RouterModule.forChild([{ path: '', component: ProfilePage }]),
  ],
})
export class ProfileModule {}

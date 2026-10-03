import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-skills-chips',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './skills-chips.component.html',
})
export class SkillsChipsComponent {
  @Input() skills: string[] = [];
  @Input() readOnly = false;
  @Output() skillsChange = new EventEmitter<string[]>();
  value = '';

  addFromInput(): void {
    for (const skill of this.value.split(',')) this.add(skill);
    this.value = '';
  }

  add(skill: string): void {
    const value = skill.trim();
    if (!value || this.skills.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    this.skillsChange.emit([...this.skills, value]);
  }

  remove(index: number): void {
    this.skillsChange.emit(this.skills.filter((_, itemIndex) => itemIndex !== index));
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addFromInput();
    } else if (event.key === 'Backspace' && !this.value && this.skills.length) {
      this.remove(this.skills.length - 1);
    }
  }
}

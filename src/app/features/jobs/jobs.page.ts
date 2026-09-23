import { Component } from '@angular/core';
@Component({ selector: 'app-jobs-page', standalone: false, templateUrl: './jobs.page.html' })
export class JobsPage {
  notice = '';
  stats = [
    { value: '4', label: 'In progress' },
    { value: '1', label: 'Interviewing' },
    { value: '2', label: 'Awaiting reply' },
    { value: '1', label: 'Recently saved' },
  ];
  jobs = [
    {
      mark: 'N',
      color: 'bg-[#e8eee1] text-[#536649]',
      role: 'Product Designer',
      company: 'Northstar',
      location: 'Remote',
      status: 'Interview',
      applied: 'Sep 18, 2026',
      contact: 'Maya L.',
    },
    {
      mark: 'G',
      color: 'bg-[#e7eef3] text-[#59758b]',
      role: 'UX Designer',
      company: 'Goodwell',
      location: 'Belgrade, RS',
      status: 'In review',
      applied: 'Sep 16, 2026',
      contact: '—',
    },
    {
      mark: 'F',
      color: 'bg-[#f6ece5] text-[#aa7955]',
      role: 'Senior Product Designer',
      company: 'Forma',
      location: 'Remote',
      status: 'In review',
      applied: 'Sep 12, 2026',
      contact: 'Jules R.',
    },
    {
      mark: 'S',
      color: 'bg-[#f0eaf3] text-[#866d8e]',
      role: 'Product Designer',
      company: 'Sunday Studio',
      location: 'Hybrid',
      status: 'Saved',
      applied: 'Sep 10, 2026',
      contact: '—',
    },
  ];
}

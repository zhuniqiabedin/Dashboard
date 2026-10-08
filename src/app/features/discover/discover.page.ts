import { Component } from '@angular/core';
import { Branches } from '../../branches';
import { CvService } from '../../core/cv.service';
import { ProjectsService } from '../../core/projects.service';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

type FeedType = 'All' | 'Projects' | 'Jobs';
type Post = {
  id: number;
  type: 'Project' | 'Job';
  category: string;
  branch: Branches;
  author: string;
  authorInitials: string;
  avatarTone: string;
  headline: string;
  posted: string;
  title: string;
  summary: string;
  details: string;
  tags: string[];
  likes: number;
  comments: number;
  callToAction: string;
};

@Component({
  selector: 'app-discover-page',
  standalone: false,
  templateUrl: './discover.page.html',
})
export class DiscoverPage {
  notice = '';
  selectedType: FeedType = 'All';
  selectedCategory = 'All';
  selectedBranch = 'All';
  matchMySkills = false;
  projectId = '';
  contactUser: any = null;
  messageText = '';
  messageNotice = '';

  constructor(
    private readonly cvService: CvService,
    public readonly projectsService: ProjectsService,
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    route: ActivatedRoute,
  ) {
    this.projectId = route.snapshot.paramMap.get('projectId') ?? '';
    this.projectId
      ? this.projectsService.loadMatchingUsers(this.projectId)
      : this.projectsService.loadPublished();
  }
  openContact(user: any): void {
    this.contactUser = user;
    this.messageText = '';
    this.messageNotice = '';
  }
  closeContact(): void {
    this.contactUser = null;
  }
  sendMessage(): void {
    if (!this.contactUser || !this.messageText.trim()) return;
    this.http
      .post(
        `${environment.apiUrl}/messages/${this.contactUser.pageId}/${this.projectId}`,
        {
          text: this.messageText.trim(),
          recipientUserId: this.contactUser.userId ?? this.contactUser._id,
        },
        { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.token ?? ''}` }) },
      )
      .subscribe({
        next: () => {
          this.messageNotice = 'Message sent.';
          this.messageText = '';
        },
        error: () => (this.messageNotice = 'Message could not be sent.'),
      });
  }

  readonly types: FeedType[] = ['All', 'Projects', 'Jobs'];
  readonly categories = ['All', 'Product design', 'Engineering', 'Marketing', 'Creative'];
  readonly branches = Object.values(Branches);
  readonly featuredBranches = [
    Branches.IT_Telecommunications,
    Branches.Education,
    Branches.Finance_Marketing_Insurance,
    Branches.Media_Internet,
  ];
  readonly popularCategories = [
    { name: 'Product design', count: 18 },
    { name: 'Engineering', count: 12 },
    { name: 'Creative', count: 9 },
    { name: 'Marketing', count: 7 },
  ];

  readonly posts: Post[] = [
    {
      id: 1,
      type: 'Project',
      category: 'Product design',
      branch: Branches.Trade,
      author: 'Mila Petrović',
      authorInitials: 'MP',
      avatarTone: 'bg-[#e8f3ff] text-[#0a66c2]',
      headline: 'Independent designer',
      posted: '2h ago',
      title: 'Rethinking the neighborhood market',
      summary:
        'A small side project exploring how local shops can feel more connected to their communities.',
      details:
        'I’m building a lightweight discovery experience that helps people find independent neighborhood shops. I’ve finished the first round of research and would love feedback from people who work in retail or community design.',
      tags: ['UX research', 'Figma', 'Community'],
      likes: 28,
      comments: 6,
      callToAction: 'View project',
    },
    {
      id: 2,
      type: 'Job',
      category: 'Engineering',
      branch: Branches.IT_Telecommunications,
      author: 'Northstar Studio',
      authorInitials: 'NS',
      avatarTone: 'bg-[#e7eef3] text-[#59758b]',
      headline: 'Product team · Hiring',
      posted: '5h ago',
      title: 'Frontend engineer, design systems',
      summary:
        'Help us make thoughtful tools for teams doing their best work. Remote-friendly across Europe.',
      details:
        'We’re looking for a frontend engineer who enjoys the details: accessible components, solid foundations, and close collaboration with designers. You’ll help shape our shared design system and bring it into production.',
      tags: ['Angular', 'TypeScript', 'Remote'],
      likes: 41,
      comments: 12,
      callToAction: 'Explore role',
    },
    {
      id: 3,
      type: 'Project',
      category: 'Creative',
      branch: Branches.Media_Internet,
      author: 'Jordan Lee',
      authorInitials: 'JL',
      avatarTone: 'bg-[#f0eaf3] text-[#866d8e]',
      headline: 'Brand designer',
      posted: '1d ago',
      title: 'Open-source identity kit for climate groups',
      summary:
        'A flexible set of visual tools for grassroots organizations that need a place to start.',
      details:
        'The kit includes editable layouts, a simple color system, and templates for social posts and event flyers. I’m looking for a couple of community groups to try it and share what is missing.',
      tags: ['Branding', 'Open source', 'Climate'],
      likes: 63,
      comments: 9,
      callToAction: 'See the kit',
    },
    {
      id: 4,
      type: 'Job',
      category: 'Marketing',
      branch: Branches.Finance_Marketing_Insurance,
      author: 'Goodwell',
      authorInitials: 'G',
      avatarTone: 'bg-[#f6ece5] text-[#aa7955]',
      headline: 'People-first fintech · Hiring',
      posted: '1d ago',
      title: 'Content strategist',
      summary:
        'Shape a clearer voice for money tools that make everyday decisions feel less complicated.',
      details:
        'You’ll partner with product, research, and support to create useful content across our app and learning hub. We value clear writing, curiosity, and experience turning complex subjects into helpful guidance.',
      tags: ['Content', 'Fintech', 'Full-time'],
      likes: 19,
      comments: 4,
      callToAction: 'Explore role',
    },
  ];

  get filteredPosts(): Post[] {
    if (this.projectId) return [];
    const companyProjects: Post[] = this.projectsService
      .publishedProjects()
      .map((project) => ({
        id: project.id as any,
        type: 'Project',
        category: project.category,
        branch: project.branch,
        author: 'Company project',
        authorInitials: 'CP',
        avatarTone: 'bg-[#e8f3ff] text-[#0a66c2]',
        headline: 'Published project',
        posted: 'Recently',
        title: project.title,
        summary: project.summary,
        details: project.details,
        tags: project.skills,
        likes: 0,
        comments: 0,
        callToAction: 'View project',
      }));
    return companyProjects.filter((post) => {
      const typeMatches =
        this.selectedType === 'All' || post.type === this.selectedType.slice(0, -1);
      const categoryMatches =
        this.selectedCategory === 'All' || post.category === this.selectedCategory;
      const branchMatches = this.selectedBranch === 'All' || post.branch === this.selectedBranch;
      const mySkills = this.cvService.cv().skills.map((skill) => skill.toLowerCase());
      const matchingSkills = post.tags.filter((tag) => mySkills.includes(tag.toLowerCase())).length;
      const skillMatches =
        mySkills.length === 0 || matchingSkills / Math.max(post.tags.length, 1) >= 0.5;
      return typeMatches && categoryMatches && branchMatches && skillMatches;
    });
  }

  selectCategory(event: Event): void {
    this.selectedCategory = (event.target as HTMLSelectElement).value;
  }

  selectBranch(event: Event): void {
    this.selectedBranch = (event.target as HTMLSelectElement).value;
  }

  branchLabel(branch: Branches): string {
    return branch === Branches.All ? 'All branches' : branch.replaceAll('_', ' ');
  }
}

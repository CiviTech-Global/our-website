import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useTheme } from '@/contexts/ThemeProvider';
import { JobRow, type JobRowData } from '@/components/jobs/JobUi';

/**
 * The job card in every state it can be in, with sample data.
 *
 * DEVELOPMENT ONLY, like the dashboard kit: no API, no sign-in — just the real
 * card, so a change to it can be judged at once, in both themes (?theme=dark)
 * and both directions.
 */

const day = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString();

const jobs: JobRowData[] = [
  {
    id: 'k1',
    code: 'JB4K2Q',
    title: 'Senior React developer (Next.js, TypeScript)',
    companyName: 'Rayan Tamaddon',
    company: { slug: 'rayan', name: 'Rayan Tamaddon', logoUrl: null },
    employmentType: 'FULL_TIME',
    workArrangement: 'HYBRID',
    province: 'تهران',
    city: 'Tehran',
    seniority: 'SENIOR',
    minExperienceYears: 4,
    urgent: true,
    salaryMin: '60000000',
    salaryMax: '90000000',
    salaryUndisclosed: false,
    publishedAt: iso(0),
    closesAt: iso(2),
    skills: ['React', 'TypeScript', 'Next.js', 'GraphQL', 'Jest', 'Docker'],
    benefits: ['SUPPLEMENTARY_INSURANCE', 'BONUS', 'FLEXIBLE_HOURS', 'MEALS', 'TRAINING'],
    openings: 2,
    jobCategory: { name: 'توسعه وب', nameEn: 'Web development' },
    authorProfile: { username: 'rayan', headline: null, verified: true, ratingAvg: 4.6, ratingCount: 23 },
    applicantCount: 14,
    reviewingNow: true,
    responsiveEmployer: true,
  },
  {
    id: 'k2',
    code: 'JB9X1M',
    title: 'Sales specialist',
    companyName: 'Sepid Yar Hesab Arad',
    employmentType: 'PART_TIME',
    workArrangement: 'ONSITE',
    province: 'قزوین',
    city: 'Qazvin',
    featured: true,
    salaryMin: '25000000',
    salaryMax: '35000000',
    salaryUndisclosed: false,
    publishedAt: iso(-3),
    closesAt: iso(25),
    skills: ['CRM', 'Negotiation'],
    benefits: ['INSURANCE', 'COMMISSION'],
    amriehEligible: true,
    authorProfile: { username: 'sepid', headline: null, verified: true, ratingAvg: 0, ratingCount: 0 },
    applicantCount: 0,
  },
  {
    id: 'k3',
    code: 'JB2T8C',
    title: 'Back-end intern (Node.js)',
    companyName: null,
    employmentType: 'INTERNSHIP',
    workArrangement: 'REMOTE',
    province: null,
    city: null,
    seniority: 'INTERN',
    minExperienceYears: 0,
    salaryMin: null,
    salaryMax: null,
    salaryUndisclosed: true,
    publishedAt: iso(-12),
    skills: ['Node.js', 'PostgreSQL'],
    disabilityFriendly: true,
    applicantCount: 1,
  },
];

export default function JobCardsKitPage() {
  const [params] = useSearchParams();
  const { setTheme } = useTheme();
  useEffect(() => {
    const wanted = params.get('theme');
    if (wanted === 'dark' || wanted === 'light') setTheme(wanted);
  }, [params, setTheme]);

  return (
    <div className="min-h-screen bg-surface-100 px-4 py-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="flex flex-col gap-3">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </ul>
        <ul className="flex flex-col gap-3">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} variant="compact" />
          ))}
        </ul>
      </div>
    </div>
  );
}

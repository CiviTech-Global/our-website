import { Link } from 'react-router';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { usePublicProjects, showcaseImageSrc, type ShowcaseProject } from '@/api/showcase';
import { useLocale } from '@/i18n/LocaleProvider';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

/**
 * Selected work: featured showcase projects from the API, three per row.
 * Hidden entirely until data arrives (prerender-safe). Cards carry a cover
 * image when the project has one, and a gradient hairline edge in every case.
 */
export function SelectedWork() {
  const { t, locale } = useLocale();
  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;
  const projects = usePublicProjects('all');

  const list = projects.data ?? [];
  if (list.length === 0) return null;

  const featured = [...list].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 3);

  return (
    <section className="py-12">
      <AnimatedSection className="mb-10">
        <p className="eyebrow">{t.home.workEyebrow}</p>
        <h2 className="mt-3 text-3xl font-extrabold text-text-primary sm:text-4xl">
          {t.home.workTitle}
        </h2>
        <p className="mt-3 max-w-2xl text-text-secondary">{t.home.workSubtitle}</p>
      </AnimatedSection>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {featured.map((project, i) => (
          <AnimatedSection key={project.id} delay={i * 0.08} className="h-full">
            <WorkCard project={project} />
          </AnimatedSection>
        ))}
      </div>

      <AnimatedSection className="mt-8 text-center">
        <Link
          to="/portfolio"
          className="glass-pill !min-h-11 px-6 text-sm"
        >
          {t.home.workCta}
          <ArrowIcon className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      </AnimatedSection>
    </section>
  );
}

function WorkCard({ project }: { project: ShowcaseProject }) {
  const cover = showcaseImageSrc(project.coverUrl);
  return (
    <article className="card-edge ct-lift group flex h-full flex-col overflow-hidden rounded-3xl">
      {cover ? (
        <img
          src={cover}
          alt=""
          loading="lazy"
          className="h-44 w-full object-cover transition-transform duration-(--dur-reveal) motion-reduce:transition-none group-hover:scale-[1.03]"
        />
      ) : (
        <div className="hero-canvas bagh-ground flex h-44 items-center justify-center">
          <span className="text-5xl font-bold text-brand-green-600/80 dark:text-brand-green-300/80">
            {project.title.trim().charAt(0)}
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        {project.category && (
          <span className="bagh-chip w-fit text-xs">{project.category}</span>
        )}
        <h3 className="mt-3 text-lg font-bold text-text-primary">{project.title}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-text-secondary">
          {project.summary}
        </p>
        {project.technologies.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {project.technologies.slice(0, 3).map((tech) => (
              <li
                key={tech}
                className="rounded-full border border-border-subtle px-2.5 py-0.5 text-xs text-text-muted"
              >
                {tech}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

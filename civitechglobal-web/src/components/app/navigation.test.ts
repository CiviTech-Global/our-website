import { describe, expect, it } from 'vitest';
import {
  formatCount,
  itemMatches,
  moduleCount,
  moduleHome,
  resolveActive,
  visibleModules,
  type NavModule,
} from './navigation';

const modules: NavModule[] = [
  {
    id: 'home',
    label: 'Home',
    icon: null,
    sections: [{ id: 'main', items: [{ to: '/admin', label: 'Overview', icon: null, end: true }] }],
  },
  {
    id: 'intake',
    label: 'Intake',
    icon: null,
    sections: [
      {
        id: 'main',
        items: [
          { to: '/admin/projects', label: 'Projects', icon: null, count: 3 },
          { to: '/admin/resumes', label: 'CVs', icon: null, count: 2 },
        ],
      },
    ],
  },
  {
    id: 'empty',
    label: 'Nothing granted',
    icon: null,
    sections: [{ id: 'main', items: [] }],
  },
];

describe('navigation', () => {
  it('matches an index link only exactly', () => {
    expect(itemMatches('/admin', modules[0].sections[0].items[0])).toBe(true);
    expect(itemMatches('/admin/projects', modules[0].sections[0].items[0])).toBe(false);
  });

  it('matches a detail screen to the list it belongs to', () => {
    const active = resolveActive('/admin/resumes/abc123', modules);
    expect(active?.module.id).toBe('intake');
    expect(active?.item?.label).toBe('CVs');
  });

  it('does not let a shorter prefix win', () => {
    // "/admin/projects" is not "/admin/project", and neither is the index.
    expect(itemMatches('/admin/projects-archive', modules[1].sections[0].items[0])).toBe(false);
    expect(resolveActive('/admin/projects', modules)?.item?.label).toBe('Projects');
  });

  it('tolerates a trailing slash', () => {
    expect(resolveActive('/admin/', modules)?.item?.label).toBe('Overview');
  });

  it('falls back to the home module for a path nothing links to', () => {
    const active = resolveActive('/admin/somewhere-else', modules);
    expect(active?.module.id).toBe('home');
    expect(active?.item).toBeNull();
  });

  it('hides a module with nothing the reader may open', () => {
    expect(visibleModules(modules).map((module) => module.id)).toEqual(['home', 'intake']);
  });

  it('sends a rail click to the module first screen', () => {
    expect(moduleHome(modules[1])).toBe('/admin/projects');
  });

  it('adds up what is waiting in a module', () => {
    expect(moduleCount(modules[1])).toBe(5);
  });

  it('never lets a shortcut decide where the reader is', () => {
    const withShortcut: NavModule[] = [
      {
        ...modules[0],
        sections: [
          ...modules[0].sections,
          { id: 'waiting', items: [{ to: '/admin/resumes', label: 'CVs', icon: null, count: 2, shortcut: true }] },
        ],
      },
      modules[1],
    ];
    expect(resolveActive('/admin/resumes', withShortcut)?.module.id).toBe('intake');
    // Nor count twice on the rail.
    expect(moduleCount(withShortcut[0])).toBe(0);
  });

  it('caps a count chip at 99+', () => {
    expect(formatCount(7, String)).toBe('7');
    expect(formatCount(240, String)).toBe('99+');
  });
});

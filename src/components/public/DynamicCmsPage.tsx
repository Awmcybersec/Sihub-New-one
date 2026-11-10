/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SiHub Digital Ecosystem - Dedicated Public CMS Page
 * Renders dedicated, ready-made pre-designed templates for all 33 official website subsections
 * and custom administrator-created pages without duplicate hero headers or redundant blocks.
 */

import React, { useState } from 'react';
import { useCmsPage } from '../../hooks/useCmsPage';
import { CmsSectionRenderer } from '../common/CmsSectionRenderer';
import type { CmsPageSection } from '../../types/cmsBlocks';
import { getTemplateTypeForSlug } from '../../types/pageTemplates';
import {
  ChevronRight,
  Home as HomeIcon,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

// Pre-Designed Template View Components
import { HomeFlagshipTemplateView } from './templates/HomeFlagshipTemplateView';
import { InstitutionalStoryTemplateView } from './templates/InstitutionalStoryTemplateView';
import { VisionMissionTemplateView } from './templates/VisionMissionTemplateView';
import { TeamDirectoryTemplateView } from './templates/TeamDirectoryTemplateView';
import { ProgrammeTrackTemplateView } from './templates/ProgrammeTrackTemplateView';
import { StartupAcceleratorTemplateView } from './templates/StartupAcceleratorTemplateView';
import { StartupShowcaseTemplateView } from './templates/StartupShowcaseTemplateView';
import { InstituteAcademyTemplateView } from './templates/InstituteAcademyTemplateView';
import { CredentialVerificationTemplateView } from './templates/CredentialVerificationTemplateView';
import { EventConferenceTemplateView } from './templates/EventConferenceTemplateView';
import { NewsMediaTemplateView } from './templates/NewsMediaTemplateView';
import { ImpactReportTemplateView } from './templates/ImpactReportTemplateView';
import { PartnershipPortalTemplateView } from './templates/PartnershipPortalTemplateView';

export interface DynamicPageContent {
  [key: string]: unknown;
  id?: string;
  slug?: string;
  title?: string;
  categoryKey?: string;
  categoryTitle?: string;
  heading?: string;
  subheading?: string;
  summary?: string;
  description?: string;
  heroBadge?: string;
  publicPath?: string;
  published?: boolean;
  cta?: {
    label: string;
    url: string;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  stats?: Array<{ value: string; label: string; description?: string }>;
  features?: Array<{ title: string; description: string }>;
  team?: Array<{ name: string; role: string; bio?: string; image?: string; station?: string; email?: string }>;
  faqs?: Array<{ question: string; answer: string }>;
  documents?: Array<{ title: string; description: string; fileUrl: string; fileSize?: string; format?: string }>;
  sections?: CmsPageSection[];
}

export const DynamicCmsPage: React.FC<{ slug: string }> = ({ slug }) => {
  const { navigateTo } = useApp();
  const { page, loading, error } = useCmsPage<DynamicPageContent>(slug);

  const handleNavigate = (url: string) => {
    if (!url) return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading page content…</span>
        </div>
      </main>
    );
  }

  if (error || !page) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-20 text-center space-y-4">
        <div className="inline-flex p-3 rounded-2xl bg-amber-50 text-amber-600 mb-2">
          <Layers className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Page Currently Unavailable</h1>
        <p className="max-w-xl mx-auto text-sm text-slate-600 leading-relaxed">
          The requested page (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">{slug}</code>) is either unpublished, being updated, or does not exist.
        </p>
        <div className="pt-4">
          <button
            onClick={() => handleNavigate('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold shadow-sm transition-all"
          >
            <HomeIcon className="w-4 h-4" />
            <span>Return to SiHub Home</span>
          </button>
        </div>
      </main>
    );
  }

  // Filter out duplicate seeded top sections that duplicate page hero
  const sections = (page.sections ?? []).filter((section) => {
    if (!section.visible || section.archived) return false;
    const isDuplicateHero = (section.title === page.heading || section.title === page.title) && section.placement === 'top';
    return !isDuplicateHero;
  }).sort((left, right) => left.order - right.order);

  const customSections = sections.filter((s) => s.placement !== 'top');

  const templateType = getTemplateTypeForSlug(slug);
  const categoryLabel = page.categoryTitle || 'SiHub Ecosystem';

  // Render the tailored pre-designed template view
  const renderTemplateView = () => {
    switch (templateType) {
      case 'home_flagship':
        return <HomeFlagshipTemplateView page={page} onNavigate={handleNavigate} />;
      case 'institutional_story':
        return <InstitutionalStoryTemplateView page={page} onNavigate={handleNavigate} />;
      case 'vision_mission':
        return <VisionMissionTemplateView page={page} onNavigate={handleNavigate} />;
      case 'team_directory':
        return <TeamDirectoryTemplateView page={page} onNavigate={handleNavigate} />;
      case 'programme_track':
        return <ProgrammeTrackTemplateView page={page} onNavigate={handleNavigate} />;
      case 'startup_accelerator':
        return <StartupAcceleratorTemplateView page={page} onNavigate={handleNavigate} />;
      case 'startup_showcase':
        return <StartupShowcaseTemplateView page={page} onNavigate={handleNavigate} />;
      case 'institute_academy':
        return <InstituteAcademyTemplateView page={page} onNavigate={handleNavigate} />;
      case 'credential_verification':
        return <CredentialVerificationTemplateView page={page} onNavigate={handleNavigate} />;
      case 'event_conference':
        return <EventConferenceTemplateView page={page} onNavigate={handleNavigate} />;
      case 'news_media':
        return <NewsMediaTemplateView page={page} onNavigate={handleNavigate} />;
      case 'impact_report':
        return <ImpactReportTemplateView page={page} onNavigate={handleNavigate} />;
      case 'partnership_portal':
        return <PartnershipPortalTemplateView page={page} onNavigate={handleNavigate} />;
      default:
        return <ProgrammeTrackTemplateView page={page} onNavigate={handleNavigate} />;
    }
  };

  return (
    <article className="min-h-screen bg-slate-50/50 pb-20">
      {/* 1. Official Breadcrumb Strip */}
      <nav aria-label="Breadcrumb" className="bg-white border-b border-slate-200/80 py-3.5 px-4 sm:px-6 lg:px-8 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2 truncate">
            <button
              onClick={() => handleNavigate('/')}
              className="flex items-center gap-1 hover:text-cyan-700 transition-colors"
            >
              <HomeIcon className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="text-slate-600 font-medium truncate">{categoryLabel}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="text-cyan-800 font-bold truncate">{page.title}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-400 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-mono uppercase">{templateType.replace('_', ' ')}</span>
          </div>
        </div>
      </nav>

      {/* 2. Main Content Canvas */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14">
        {renderTemplateView()}

        {/* 3. Optional Additional Visual CMS Blocks (if added by admin) */}
        {customSections.length > 0 && (
          <section className="mt-16 pt-16 border-t border-slate-200/80 space-y-12">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-700">Additional Information</span>
              <h2 className="text-2xl font-bold text-slate-900">Custom Section Highlights</h2>
            </div>
            <div className="space-y-8">
              {customSections.map((section) => (
                <CmsSectionRenderer key={section.id} section={section} />
              ))}
            </div>
          </section>
        )}
      </main>
    </article>
  );
};

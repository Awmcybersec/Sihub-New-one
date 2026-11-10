/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SiHub Digital Ecosystem - Dedicated Public CMS Page
 * Renders dedicated pages for all 32 official website subsections
 * and custom administrator-created pages with full visual block support.
 */

import React, { useState } from 'react';
import { useCmsPage } from '../../hooks/useCmsPage';
import { CmsSectionRenderer } from '../common/CmsSectionRenderer';
import type { CmsPageSection } from '../../types/cmsBlocks';
import {
  ChevronRight,
  Home as HomeIcon,
  Sparkles,
  ArrowRight,
  FileText,
  Download,
  Users,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  Layers
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export interface DynamicPageContent {
  [key: string]: unknown;
  title?: string;
  categoryKey?: string;
  categoryTitle?: string;
  heading?: string;
  subheading?: string;
  summary?: string;
  description?: string;
  heroBadge?: string;
  publicPath?: string;
  cta?: {
    label: string;
    url: string;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  stats?: Array<{ value: string; label: string; description?: string }>;
  features?: Array<{ title: string; description: string }>;
  team?: Array<{ name: string; role: string; bio?: string; image?: string }>;
  faqs?: Array<{ question: string; answer: string }>;
  documents?: Array<{ title: string; description: string; fileUrl: string; fileSize?: string; format?: string }>;
  sections?: CmsPageSection[];
}

export const DynamicCmsPage: React.FC<{ slug: string }> = ({ slug }) => {
  const { navigateTo } = useApp();
  const { page, loading, error } = useCmsPage<DynamicPageContent>(slug);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

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
            onClick={() => {
              window.history.pushState({}, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold shadow-sm transition-all"
          >
            <HomeIcon className="w-4 h-4" />
            <span>Return to SiHub Home</span>
          </button>
        </div>
      </main>
    );
  }

  const sections = (page.sections ?? []).filter(section => section.visible && !section.archived).sort((left, right) => left.order - right.order);
  const topSections = sections.filter(section => section.placement === 'top');
  const middleSections = sections.filter(section => !section.placement || (section.placement !== 'top' && section.placement !== 'bottom'));
  const bottomSections = sections.filter(section => section.placement === 'bottom');

  const mainHeading = page.heading || page.title || 'SiHub Digital Ecosystem';
  const categoryLabel = page.categoryTitle || 'SiHub Ecosystem';
  const badgeLabel = page.heroBadge || categoryLabel;

  const handleCtaClick = (url: string) => {
    if (!url) return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <article className="min-h-screen bg-slate-50/50 pb-20">
      {/* 1. Breadcrumb Strip */}
      <nav aria-label="Breadcrumb" className="bg-white border-b border-slate-200/80 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs font-semibold text-slate-500">
          <button
            onClick={() => handleCtaClick('/')}
            className="flex items-center gap-1 hover:text-cyan-700 transition-colors"
          >
            <HomeIcon className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="text-slate-600 font-medium">{categoryLabel}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="text-cyan-800 font-bold truncate">{page.title}</span>
        </div>
      </nav>

      {/* 2. Top Visual Sections (Position: Top) */}
      {topSections.length > 0 && (
        <section className="space-y-4">
          {topSections.map(section => (
            <CmsSectionRenderer key={section.id} section={section} />
          ))}
        </section>
      )}

      {/* 3. Official Dedicated Subsection Hero Header */}
      <header className="relative overflow-hidden bg-gradient-to-b from-white via-cyan-50/30 to-slate-50 border-b border-slate-200/70 py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-100/80 border border-cyan-200 text-cyan-900 text-xs font-bold uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
            <span>{badgeLabel}</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-tight">
            {mainHeading}
          </h1>

          {/* Subheading */}
          {page.subheading && (
            <p className="max-w-3xl mx-auto text-base sm:text-lg font-semibold text-cyan-800 leading-relaxed">
              {page.subheading}
            </p>
          )}

          {/* Summary / Description */}
          {(page.description || page.summary) && (
            <p className="max-w-3xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-wrap">
              {page.description || page.summary}
            </p>
          )}

          {/* Call to Action Button */}
          {page.cta && (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handleCtaClick(page.cta!.url)}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold shadow-md transition-all ${
                  page.cta.variant === 'secondary'
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : page.cta.variant === 'outline'
                    ? 'border-2 border-cyan-700 text-cyan-700 hover:bg-cyan-50'
                    : 'bg-cyan-700 text-white hover:bg-cyan-800'
                }`}
              >
                <span>{page.cta.label}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 4. Key Statistics Strip (if defined on this page) */}
      {page.stats && page.stats.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
          <div className={`grid grid-cols-1 gap-4 ${
            page.stats.length === 2 ? 'sm:grid-cols-2' :
            page.stats.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'
          }`}>
            {page.stats.map((stat, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm text-center space-y-1.5 hover:shadow-md transition-shadow">
                <p className="text-3xl sm:text-4xl font-black text-cyan-700 tracking-tight">{stat.value}</p>
                <p className="text-sm font-bold text-slate-800">{stat.label}</p>
                {stat.description && <p className="text-xs text-slate-500 leading-relaxed">{stat.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Middle Visual Sections (Position: Middle / Custom) */}
      {middleSections.length > 0 && (
        <section className="space-y-6 pt-12">
          {middleSections.map(section => (
            <CmsSectionRenderer key={section.id} section={section} />
          ))}
        </section>
      )}

      {/* 6. Feature Pillars / Strategic Components (if defined) */}
      {page.features && page.features.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-700">Key Pillars & Deliverables</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">What Drives This Programme</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {page.features.map((feat, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-cyan-300 hover:shadow-sm transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{feat.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Team Members / Leadership Profiles (if defined) */}
      {page.team && page.team.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-slate-200/60">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-700">Leadership & Stewards</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Meet Our Dedicated Team</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {page.team.map((member, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center space-y-3">
                {member.image ? (
                  <img src={member.image} alt={member.name} className="w-24 h-24 rounded-full mx-auto object-cover ring-2 ring-cyan-500/20" />
                ) : (
                  <div className="w-24 h-24 rounded-full mx-auto bg-gradient-to-br from-cyan-600 to-slate-800 text-white flex items-center justify-center text-xl font-bold">
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{member.name}</h4>
                  <p className="text-xs font-semibold text-cyan-700">{member.role}</p>
                </div>
                {member.bio && <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{member.bio}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 8. Publications & Annual Reports / Documents (if defined) */}
      {page.documents && page.documents.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-slate-200/60">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-700">Official Publications</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Download Reports & Briefs</h2>
          </div>
          <div className="space-y-3">
            {page.documents.map((doc, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4 hover:border-cyan-300 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{doc.title}</h4>
                    <p className="text-xs text-slate-500 truncate">{doc.description}</p>
                  </div>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-cyan-50 text-slate-800 hover:text-cyan-800 text-xs font-bold transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {doc.format || 'PDF'}</span>
                  {doc.fileSize && <span className="text-[10px] text-slate-400 font-mono">({doc.fileSize})</span>}
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 9. FAQs Accordion (if defined) */}
      {page.faqs && page.faqs.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-slate-200/60">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-700">Frequently Asked Questions</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Common Inquiries</h2>
          </div>
          <div className="space-y-3">
            {page.faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-xs transition-all">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-sm hover:text-cyan-700"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-cyan-700' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 10. Bottom Visual Sections (Position: Bottom) */}
      {bottomSections.length > 0 && (
        <section className="space-y-6 pt-10">
          {bottomSections.map(section => (
            <CmsSectionRenderer key={section.id} section={section} />
          ))}
        </section>
      )}

      {/* 11. Final Engagement Banner */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white text-center space-y-4 shadow-xl">
          <h3 className="text-2xl sm:text-3xl font-black">Empower Your Ideas with SiHub</h3>
          <p className="max-w-2xl mx-auto text-sm text-slate-300 leading-relaxed">
            Have questions about this programme, or want to collaborate with our mentors and innovators? Connect with our team today.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => handleCtaClick('/contact')}
              className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md"
            >
              Contact SiHub Desk
            </button>
            <button
              onClick={() => handleCtaClick('/track')}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all"
            >
              Track Existing Application
            </button>
          </div>
        </div>
      </section>
    </article>
  );
};

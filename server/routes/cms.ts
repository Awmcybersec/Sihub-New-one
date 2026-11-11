import { Router, type RequestHandler } from 'express';
import { Prisma, PublicationStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../security';
import { asyncRoute, httpError } from '../utils';
import { validateCmsMediaContent } from '../cmsMediaValidation';
import { validateDynamicPageSections } from '../cmsSections';
import { ensureWebsiteStructureSeeded, OFFICIAL_WEBSITE_SUBSECTIONS } from '../defaultWebsiteStructure';

type CmsDatabase = Pick<typeof prisma, 'cmsEntry' | 'cmsRevision' | 'auditLog'>;

export const createCmsRouter = (
  database: CmsDatabase = prisma,
  authenticate: RequestHandler = requireAuth,
  authorize: typeof requireRole = requireRole
) => {
  // Ensure 32 official website subsections are seeded when running with primary database
  if (database === prisma && process.env.NODE_ENV !== 'test') {
    void ensureWebsiteStructureSeeded(database);
  }

const router = Router();
const staffRoles = [Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN] as const;
const slugSchema = z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const entrySchema = z.object({
  type: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  slug: slugSchema,
  title: z.string().trim().min(1).max(240),
  summary: z.string().max(10000).optional(),
  content: z.record(z.string(), z.unknown()),
});

const recordRevision = async (entry: {
  id: string; type: string; slug: string; title: string; summary: string | null;
  content: Prisma.JsonValue; status: PublicationStatus; deletedAt: Date | null; publishedAt: Date | null;
}, authorId: string) => {
  const revisionNumber = await database.cmsRevision.count({ where: { entryId: entry.id } }) + 1;
  await database.cmsRevision.create({
    data: {
      entryId: entry.id,
      revisionNumber,
      type: entry.type,
      slug: entry.slug,
      title: entry.title,
      summary: entry.summary,
      content: entry.content as Prisma.InputJsonValue,
      status: entry.status,
      deletedAt: entry.deletedAt,
      publishedAt: entry.publishedAt,
      authorId
    }
  });
};

const stripInternalCmsFields = (content: unknown): unknown => {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return content;
  const contentObj = content as Record<string, unknown>;
  if (contentObj._published && typeof contentObj._published === 'object') {
    return contentObj._published;
  }
  const { _draft, _published, ...clean } = contentObj;
  return clean;
};

const officialNavHierarchy = [
  { key: 'home', label: 'Home', view: 'home', url: '/' },
  {
    key: 'about',
    label: 'About SiHub',
    view: 'about',
    url: '/about',
    subItems: [
      { key: 'who-we-are', label: 'Who We Are', view: 'subsection_page', url: '/about/who-we-are', desc: 'Parent ecosystem mandate & strategic identity' },
      { key: 'vision', label: 'Vision', view: 'subsection_page', url: '/about/vision', desc: 'Envisioning a digitally self-reliant Somalia' },
      { key: 'mission', label: 'Mission', view: 'subsection_page', url: '/about/mission', desc: 'Catalyzing opportunity through skills and ventures' },
      { key: 'our-team', label: 'Our Team', view: 'subsection_page', url: '/about/our-team', desc: 'Executive leadership & ecosystem stewards' }
    ]
  },
  {
    key: 'programmes',
    label: 'Our Programmes',
    view: 'programs',
    url: '/programs',
    subItems: [
      { key: 'digital-skills', label: 'Digital Skills Development', view: 'subsection_page', url: '/programs/digital-skills', desc: 'High-impact technology & workforce tracks' },
      { key: 'youth-empowerment', label: 'Youth Empowerment', view: 'subsection_page', url: '/programs/youth-empowerment', desc: 'Leadership, capacity building & pathways' },
      { key: 'social-innovation', label: 'Social Innovation', view: 'subsection_page', url: '/programs/social-innovation', desc: 'Grassroots community problem-solving' },
      { key: 'women-innovation', label: 'Women in Innovation', view: 'subsection_page', url: '/programs/women-innovation', desc: 'Gender-inclusive tech & entrepreneurship' },
      { key: 'inclusive-digital', label: 'Inclusive Digital Inclusion', view: 'subsection_page', url: '/programs/inclusive-digital', desc: 'Equitable access for all regions & backgrounds' },
      { key: 'green-sustainability', label: 'Green Innovation & Sustainability', view: 'subsection_page', url: '/programs/green-sustainability', desc: 'Climate resilience, clean energy & AgriTech' },
      { key: 'youth-peace', label: 'Youth Peace Innovation', view: 'subsection_page', url: '/programs/youth-peace', desc: 'Community cohesion & peacebuilding solutions' },
      { key: 'community-dev', label: 'Community Development', view: 'subsection_page', url: '/programs/community-dev', desc: 'Grassroots civic transformation initiatives' }
    ]
  },
  {
    key: 'startups',
    label: 'Entrepreneurship & Startups',
    view: 'startups',
    url: '/entrepreneurship',
    subItems: [
      { key: 'incubation', label: 'Startup Incubation', view: 'subsection_page', url: '/startups/incubation', desc: 'Seed funding, co-working & structured acceleration' },
      { key: 'entrepreneurs', label: 'Entrepreneurs', view: 'subsection_page', url: '/startups/entrepreneurs', desc: 'Featured Somali founders & active portfolio' },
      { key: 'youth-mentorship', label: 'Youth Mentorship', view: 'subsection_page', url: '/startups/youth-mentorship', desc: '1-on-1 guidance from diaspora & industry leaders' },
      { key: 'startup-support', label: 'Startup Support', view: 'subsection_page', url: '/startups/startup-support', desc: 'Legal sandboxes, prototyping labs & investor readiness' }
    ]
  },
  {
    key: 'institute',
    label: 'SiHub Institute',
    view: 'courses',
    url: '/institute',
    subItems: [
      { key: 'digital-skills-academy', label: 'Digital Skills Academy', view: 'subsection_page', url: '/institute/digital-skills-academy', desc: 'Software engineering, cloud & modern tech' },
      { key: 'professional-training', label: 'Professional Training', view: 'subsection_page', url: '/institute/professional-training', desc: 'Executive masterclasses & industry diplomas' },
      { key: 'ai-emerging', label: 'AI & Emerging Technologies', view: 'subsection_page', url: '/institute/ai-emerging', desc: 'Machine learning, IoT & generative AI' },
      { key: 'research-innovation', label: 'Research & Innovation', view: 'subsection_page', url: '/institute/research-innovation', desc: 'Applied R&D labs & academic publications' },
      { key: 'certification', label: 'Certification', view: 'subsection_page', url: '/institute/certification', desc: 'Public learning pathways and completion records' }
    ]
  },
  {
    key: 'events-media',
    label: 'Events & Media',
    view: 'events',
    url: '/events',
    subItems: [
      { key: 'sitalks', label: 'SiHub Talks (SiTalks)', view: 'subsection_page', url: '/events/sitalks', desc: 'Thought leadership panels & keynote sessions' },
      { key: 'summit', label: 'Somali Innovation Summit', view: 'subsection_page', url: '/events/summit', desc: 'Annual flagship Horn of Africa gathering' },
      { key: 'expo', label: 'SiHub Expo', view: 'subsection_page', url: '/events/expo', desc: 'Showcase of homegrown innovations & prototypes' },
      { key: 'news-stories', label: 'News & Stories', view: 'subsection_page', url: '/events/news-stories', desc: 'Ecosystem updates, milestones & press releases' },
      { key: 'media-gallery', label: 'Media Gallery', view: 'media', url: '/media', desc: 'Event photos, video archives & highlights' }
    ]
  },
  {
    key: 'impact',
    label: 'Our Impact',
    view: 'impact',
    url: '/impact',
    subItems: [
      { key: 'success-stories', label: 'Success Stories', view: 'subsection_page', url: '/impact/success-stories', desc: 'Inspiring founder journeys & community impact' },
      { key: 'projects-achievements', label: 'Projects & Achievements', view: 'subsection_page', url: '/impact/projects-achievements', desc: 'Tangible milestones delivered across Somalia' },
      { key: 'annual-reports', label: 'Annual Reports', view: 'subsection_page', url: '/impact/annual-reports', desc: 'Audited impact assessments & publications' },
      { key: 'community-impact', label: 'Community Impact', view: 'subsection_page', url: '/impact/community-impact', desc: 'Outreach metrics across regional hub stations' }
    ]
  },
  {
    key: 'partnerships',
    label: 'Partnerships',
    view: 'partnerships',
    url: '/partnerships',
    subItems: [
      { key: 'become-partner', label: 'Become a Partner', view: 'subsection_page', url: '/partnerships/become-partner', desc: 'Join as an academic, corporate, or civic ally' },
      { key: 'donors-supporters', label: 'Donors & Supporters', view: 'subsection_page', url: '/partnerships/donors-supporters', desc: 'Multilateral agencies, foundations & diaspora' },
      { key: 'collaboration-opportunities', label: 'Collaboration Opportunities', view: 'subsection_page', url: '/partnerships/collaboration-opportunities', desc: 'Joint funding calls, pilot projects & research' }
    ]
  }
];

router.get('/navigation', asyncRoute(async (_req, res) => {
  try {
    const entry = await database.cmsEntry.findFirst({
      where: { type: 'page', slug: 'header', status: PublicationStatus.PUBLISHED, deletedAt: null }
    });
    const content = entry?.content && typeof entry.content === 'object' && !Array.isArray(entry.content)
      ? entry.content as Record<string, unknown>
      : {};
    const rawCategories = Array.isArray(content.categories) && content.categories.length > 0
      ? content.categories
      : officialNavHierarchy;
    const categories = (rawCategories as Array<{ key?: string }>).filter(
      cat => cat && cat.key !== 'portal-access' && !String(cat.key).toLowerCase().includes('portal')
    );
    res.json({ categories });
  } catch {
    res.json({ categories: officialNavHierarchy });
  }
}));

router.put('/navigation', authenticate, authorize(...staffRoles), asyncRoute(async (req, res) => {
  const navChildSchema = z.object({
    key: z.string().trim().min(1).max(100),
    label: z.string().trim().min(1).max(200),
    view: z.string().optional(),
    url: z.string().optional(),
    anchor: z.string().optional(),
    desc: z.string().max(1000).optional(),
    query: z.record(z.string(), z.string()).optional()
  });

  const navSubItemSchema = z.object({
    key: z.string().trim().min(1).max(100),
    label: z.string().trim().min(1).max(200),
    view: z.string().optional(),
    url: z.string().optional(),
    anchor: z.string().optional(),
    desc: z.string().max(1000).optional(),
    query: z.record(z.string(), z.string()).optional(),
    subItems: z.array(navChildSchema).optional()
  });

  const schema = z.object({
    categories: z.array(z.object({
      key: z.string().trim().min(1).max(100),
      label: z.string().trim().min(1).max(200),
      view: z.string().optional(),
      url: z.string().optional(),
      subItems: z.array(navSubItemSchema).optional()
    }))
  });
  const input = schema.safeParse(req.body);
  if (!input.success) throw httpError(400, 'Invalid navigation structure');
  const sanitizedCategories = input.data.categories.filter(
    cat => cat.key !== 'portal-access' && !String(cat.key).toLowerCase().includes('portal')
  );

  let entry = await database.cmsEntry.findFirst({
    where: { type: 'page', slug: 'header', deletedAt: null }
  });
  if (entry) {
    await recordRevision(entry, req.authUser!.id);
    entry = await database.cmsEntry.update({
      where: { id: entry.id },
      data: {
        content: { categories: sanitizedCategories } as Prisma.InputJsonValue,
        status: PublicationStatus.PUBLISHED,
        publishedAt: new Date()
      }
    });
  } else {
    entry = await database.cmsEntry.create({
      data: {
        type: 'page',
        slug: 'header',
        title: 'Institutional Header Navigation',
        content: { categories: sanitizedCategories } as Prisma.InputJsonValue,
        status: PublicationStatus.PUBLISHED,
        publishedAt: new Date(),
        authorId: req.authUser!.id
      }
    });
  }
  await database.auditLog.create({
    data: {
      actorId: req.authUser!.id,
      action: 'CMS_NAVIGATION_UPDATE',
      entity: 'navigation',
      entityId: entry.id,
      metadata: { categoryCount: input.data.categories.length }
    }
  });
  res.json({ categories: input.data.categories, entryId: entry.id });
}));

router.get('/settings', asyncRoute(async (_req, res) => {
  const defaultSettings = {
    siteTitle: 'Somali Innovation Hub (SiHub)',
    siteMetaDesc: 'Pioneering center for grassroots innovation, digital skills, technology ventures, and social transformation in Somalia.',
    contactEmail: 'info@sihub.so',
    contactPhone: '+252 61 500 0000',
    contactAddress: 'KM4 Airport Road, Wadajir District, Mogadishu, Somalia',
    socialLinks: {},
    branding: {}
  };
  try {
    const entry = await database.cmsEntry.findFirst({
      where: { type: 'page', slug: 'settings', status: PublicationStatus.PUBLISHED, deletedAt: null }
    });
    const content = entry?.content && typeof entry.content === 'object' && !Array.isArray(entry.content)
      ? entry.content as Record<string, unknown>
      : {};
    res.json({
      siteTitle: content.siteTitle || defaultSettings.siteTitle,
      siteMetaDesc: content.siteMetaDesc || defaultSettings.siteMetaDesc,
      contactEmail: content.contactEmail || defaultSettings.contactEmail,
      contactPhone: content.contactPhone || defaultSettings.contactPhone,
      contactAddress: content.contactAddress || defaultSettings.contactAddress,
      socialLinks: content.socialLinks || defaultSettings.socialLinks,
      branding: content.branding || defaultSettings.branding
    });
  } catch {
    res.json(defaultSettings);
  }
}));

router.put('/settings', authenticate, authorize(...staffRoles), asyncRoute(async (req, res) => {
  const settingsSchema = z.object({
    siteTitle: z.string().trim().min(1).max(200).optional(),
    siteMetaDesc: z.string().max(2000).optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().max(100).optional(),
    contactAddress: z.string().max(500).optional(),
    socialLinks: z.record(z.string(), z.string()).optional(),
    branding: z.record(z.string(), z.unknown()).optional()
  });
  const input = settingsSchema.safeParse(req.body);
  if (!input.success) throw httpError(400, 'Invalid website settings');

  let entry = await database.cmsEntry.findFirst({
    where: { type: 'page', slug: 'settings', deletedAt: null }
  });
  if (entry) {
    await recordRevision(entry, req.authUser!.id);
    entry = await database.cmsEntry.update({
      where: { id: entry.id },
      data: {
        content: input.data as Prisma.InputJsonValue,
        status: PublicationStatus.PUBLISHED,
        publishedAt: new Date()
      }
    });
  } else {
    entry = await database.cmsEntry.create({
      data: {
        type: 'page',
        slug: 'settings',
        title: 'Institutional Website Settings',
        content: input.data as Prisma.InputJsonValue,
        status: PublicationStatus.PUBLISHED,
        publishedAt: new Date(),
        authorId: req.authUser!.id
      }
    });
  }
  await database.auditLog.create({
    data: {
      actorId: req.authUser!.id,
      action: 'CMS_SETTINGS_UPDATE',
      entity: 'settings',
      entityId: entry.id
    }
  });
  res.json({ settings: input.data, entryId: entry.id });
}));


router.get('/admin', authenticate, authorize(...staffRoles), asyncRoute(async (_req, res) => {
  const entries = await database.cmsEntry.findMany({ orderBy: { updatedAt: 'desc' } });
  res.json({ entries });
}));

router.post('/admin', authenticate, authorize(...staffRoles), asyncRoute(async (req, res) => {
  const input = entrySchema.safeParse(req.body);
  if (!input.success) throw httpError(400, 'Invalid content entry');
  const sectionError = validateDynamicPageSections(input.data.content);
  if (sectionError) throw httpError(400, sectionError);
  const mediaError = validateCmsMediaContent(input.data.content);
  if (mediaError) throw httpError(400, mediaError);
  const entry = await database.cmsEntry.create({
    data: { ...input.data, content: input.data.content as Prisma.InputJsonValue, status: PublicationStatus.DRAFT, authorId: req.authUser!.id }
  });
  await database.auditLog.create({ data: { actorId: req.authUser!.id, action: 'CMS_CREATE', entity: input.data.type, entityId: entry.id } });
  res.status(201).json({ entry });
}));

router.patch('/admin/:id', authenticate, authorize(...staffRoles), asyncRoute(async (req, res) => {
  const input = entrySchema.partial().extend({
    publishNow: z.boolean().optional(),
    isDraft: z.boolean().optional()
  }).safeParse(req.body);
  if (!input.success || Object.keys(input.data).length === 0) throw httpError(400, 'Invalid content update');
  if (input.data.content) {
    const sectionError = validateDynamicPageSections(input.data.content);
    if (sectionError) throw httpError(400, sectionError);
  }
  if (input.data.content) {
    const mediaError = validateCmsMediaContent(input.data.content);
    if (mediaError) throw httpError(400, mediaError);
  }
  const existing = await database.cmsEntry.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw httpError(404, 'Content not found');
  await recordRevision(existing, req.authUser!.id);

  const isCurrentlyPublished = existing.status === PublicationStatus.PUBLISHED;
  const shouldPublishNow = input.data.publishNow === true;

  let nextStatus = existing.status;
  let nextPublishedAt = existing.publishedAt;
  let nextContent = input.data.content !== undefined ? (input.data.content as Prisma.InputJsonValue) : existing.content;

  if (isCurrentlyPublished && !shouldPublishNow) {
    // Preserve published status on the live site while recording the working draft
    nextStatus = PublicationStatus.PUBLISHED;
    const existingContentObj = (existing.content && typeof existing.content === 'object' && !Array.isArray(existing.content))
      ? existing.content as Record<string, unknown>
      : {};
    const liveContent = existingContentObj._published ?? existing.content;
    const workingDraft = input.data.content ?? existingContentObj;
    nextContent = {
      ...(typeof liveContent === 'object' && !Array.isArray(liveContent) ? liveContent : {}),
      _published: liveContent,
      _draft: {
        content: workingDraft,
        title: input.data.title ?? existing.title,
        summary: input.data.summary ?? existing.summary,
        savedAt: new Date().toISOString(),
        authorId: req.authUser!.id
      }
    } as Prisma.InputJsonValue;
  } else if (shouldPublishNow) {
    nextStatus = PublicationStatus.PUBLISHED;
    nextPublishedAt = new Date();
    const contentObj = (input.data.content ?? existing.content) as Record<string, unknown>;
    const { _draft: _discardDraft, _published: _discardPub, ...cleanContent } = contentObj && typeof contentObj === 'object' ? contentObj : {};
    nextContent = cleanContent as Prisma.InputJsonValue;
  } else {
    nextStatus = PublicationStatus.DRAFT;
    nextPublishedAt = null;
  }

  const data: Prisma.CmsEntryUpdateInput = {
    ...(input.data.type !== undefined ? { type: input.data.type } : {}),
    ...(input.data.slug !== undefined ? { slug: input.data.slug } : {}),
    ...(input.data.title !== undefined ? { title: input.data.title } : {}),
    ...(input.data.summary !== undefined ? { summary: input.data.summary } : {}),
    content: nextContent,
    status: nextStatus,
    publishedAt: nextPublishedAt
  };
  const entry = await database.cmsEntry.update({
    where: { id: req.params.id, deletedAt: null },
    data
  });
  await database.auditLog.create({ data: { actorId: req.authUser!.id, action: shouldPublishNow ? 'CMS_PUBLISHED' : 'CMS_UPDATE', entity: entry.type, entityId: entry.id } });
  res.json({ entry });
}));

router.patch('/admin/:id/status', authenticate, authorize(...staffRoles), asyncRoute(async (req, res) => {
  const input = z.object({ status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED']), reason: z.string().max(2000).optional() }).safeParse(req.body);
  if (!input.success) throw httpError(400, 'Invalid publication status');
  const existing = await database.cmsEntry.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw httpError(404, 'Content not found');
  const allowedTransitions: Record<PublicationStatus, PublicationStatus[]> = {
    DRAFT: [PublicationStatus.PENDING_APPROVAL, PublicationStatus.ARCHIVED],
    PENDING_APPROVAL: [PublicationStatus.APPROVED, PublicationStatus.REJECTED, PublicationStatus.ARCHIVED],
    APPROVED: [PublicationStatus.PUBLISHED, PublicationStatus.REJECTED, PublicationStatus.ARCHIVED],
    PUBLISHED: [PublicationStatus.DRAFT, PublicationStatus.ARCHIVED],
    REJECTED: [PublicationStatus.PENDING_APPROVAL, PublicationStatus.ARCHIVED],
    ARCHIVED: []
  };
  if (!allowedTransitions[existing.status].includes(input.data.status)) throw httpError(409, `Cannot move content from ${existing.status} to ${input.data.status}`);
  await recordRevision(existing, req.authUser!.id);

  let nextContent: Prisma.InputJsonValue = existing.content as unknown as Prisma.InputJsonValue;
  if (input.data.status === PublicationStatus.PUBLISHED) {
    const contentObj = (existing.content && typeof existing.content === 'object' && !Array.isArray(existing.content))
      ? existing.content as Record<string, unknown>
      : {};
    const draftData = contentObj._draft as { content?: unknown } | undefined;
    if (draftData && draftData.content) {
      const draftContentObj = draftData.content as Record<string, unknown>;
      const { _draft: _d, _published: _p, ...cleanDraft } = draftContentObj;
      nextContent = cleanDraft as unknown as Prisma.InputJsonValue;
    } else {
      const { _draft: _d, _published: _p, ...clean } = contentObj;
      nextContent = clean as unknown as Prisma.InputJsonValue;
    }
  }

  const entry = await database.cmsEntry.update({
    where: { id: existing.id },
    data: {
      status: input.data.status,
      content: nextContent as Prisma.InputJsonValue,
      publishedAt: input.data.status === 'PUBLISHED' ? new Date() : null
    }
  });
  await database.auditLog.create({ data: { actorId: req.authUser!.id, action: `CMS_${input.data.status}`, entity: entry.type, entityId: entry.id, metadata: { reason: input.data.reason ?? null } } });
  res.json({ entry });
}));

router.post('/admin/:id/discard-draft', authenticate, authorize(...staffRoles), asyncRoute(async (req, res) => {
  const existing = await database.cmsEntry.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw httpError(404, 'Content not found');
  const contentObj = (existing.content && typeof existing.content === 'object' && !Array.isArray(existing.content))
    ? existing.content as Record<string, unknown>
    : {};
  const liveContent = (contentObj._published ?? existing.content) as Record<string, unknown>;
  const { _draft: _d, _published: _p, ...cleanLive } = liveContent && typeof liveContent === 'object' ? liveContent : {};
  const entry = await database.cmsEntry.update({
    where: { id: existing.id },
    data: { content: cleanLive as Prisma.InputJsonValue }
  });
  await database.auditLog.create({ data: { actorId: req.authUser!.id, action: 'CMS_DISCARD_DRAFT', entity: entry.type, entityId: entry.id } });
  res.json({ entry });
}));

router.delete('/admin/:id', authenticate, authorize(...staffRoles), asyncRoute(async (req, res) => {
  const existing = await database.cmsEntry.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!existing) throw httpError(404, 'Content not found');
  await recordRevision(existing, req.authUser!.id);
  const entry = await database.cmsEntry.update({ where: { id: req.params.id, deletedAt: null }, data: { deletedAt: new Date(), status: PublicationStatus.ARCHIVED } });
  await database.auditLog.create({ data: { actorId: req.authUser!.id, action: 'CMS_SOFT_DELETE', entity: entry.type, entityId: entry.id } });
  res.status(204).end();
}));

router.post('/admin/:id/restore', authenticate, authorize(...staffRoles), asyncRoute(async (req, res) => {
  const existing = await database.cmsEntry.findUnique({ where: { id: req.params.id } });
  if (!existing || (!existing.deletedAt && existing.status !== PublicationStatus.ARCHIVED)) throw httpError(404, 'Archived content not found');
  await recordRevision(existing, req.authUser!.id);
  const entry = await database.cmsEntry.update({
    where: { id: existing.id },
    data: { deletedAt: null, status: PublicationStatus.DRAFT, publishedAt: null }
  });
  await database.auditLog.create({ data: { actorId: req.authUser!.id, action: 'CMS_RESTORE', entity: entry.type, entityId: entry.id } });
  res.json({ entry });
}));

router.get('/admin/revisions', authenticate, authorize(...staffRoles), asyncRoute(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
  const entryId = req.query.entryId ? String(req.query.entryId) : undefined;
  const type = req.query.type ? String(req.query.type) : undefined;
  const where: any = {};
  if (entryId) where.entryId = entryId;
  if (type) where.type = type;

  const [revisions, total] = await Promise.all([
    database.cmsRevision.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        author: { select: { id: true, fullName: true, email: true } },
        entry: { select: { id: true, title: true, slug: true, type: true } }
      }
    }),
    database.cmsRevision.count({ where })
  ]);
  res.json({ revisions, total, page, limit });
}));

router.post('/admin/revisions/:revisionId/rollback', authenticate, authorize(...staffRoles), asyncRoute(async (req, res) => {
  const revision = await database.cmsRevision.findUnique({ where: { id: req.params.revisionId } });
  if (!revision) throw httpError(404, 'Content revision not found');
  const existing = await database.cmsEntry.findUnique({ where: { id: revision.entryId } });
  if (!existing) throw httpError(404, 'Associated CMS entry not found');

  await recordRevision(existing, req.authUser!.id);
  const entry = await database.cmsEntry.update({
    where: { id: existing.id },
    data: {
      type: revision.type,
      slug: revision.slug,
      title: revision.title,
      summary: revision.summary,
      content: revision.content as Prisma.InputJsonValue,
      status: revision.status,
      deletedAt: null,
      publishedAt: revision.publishedAt
    }
  });

  await database.auditLog.create({
    data: {
      actorId: req.authUser!.id,
      action: 'CMS_REVISION_ROLLBACK',
      entity: entry.type,
      entityId: entry.id,
      metadata: { revisionNumber: revision.revisionNumber, targetRevisionId: revision.id }
    }
  });

  res.json({ entry, restoredRevisionNumber: revision.revisionNumber });
}));

router.get('/admin/:id/revisions', authenticate, authorize(...staffRoles), asyncRoute(async (req, res) => {
  const revisions = await database.cmsRevision.findMany({ where: { entryId: req.params.id }, orderBy: { revisionNumber: 'desc' } });
  res.json({ revisions });
}));

router.post('/admin/:id/revisions/:revisionId/restore', authenticate, authorize(...staffRoles), asyncRoute(async (req, res) => {
  const revision = await database.cmsRevision.findFirst({ where: { id: req.params.revisionId, entryId: req.params.id } });
  if (!revision) throw httpError(404, 'Content revision not found');
  const existing = await database.cmsEntry.findUnique({ where: { id: req.params.id } });
  if (!existing) throw httpError(404, 'Content not found');
  await recordRevision(existing, req.authUser!.id);
  const entry = await database.cmsEntry.update({
    where: { id: existing.id },
    data: {
      type: revision.type,
      slug: revision.slug,
      title: revision.title,
      summary: revision.summary,
      content: revision.content as Prisma.InputJsonValue,
      status: PublicationStatus.DRAFT,
      deletedAt: null,
      publishedAt: null
    }
  });
  await database.auditLog.create({ data: { actorId: req.authUser!.id, action: 'CMS_REVISION_RESTORE', entity: entry.type, entityId: entry.id, metadata: { revisionNumber: revision.revisionNumber } } });
  res.json({ entry });
}));

  // =========================================================================
  // DEDICATED PAGES API (Supports all 34 public website pages)
  // =========================================================================
  router.get('/pages', asyncRoute(async (_req, res) => {
    const dbPages = await database.cmsEntry.findMany({
      where: { type: 'page', deletedAt: null }
    });

    const map = new Map<string, any>();
    for (const sub of OFFICIAL_WEBSITE_SUBSECTIONS) {
      map.set(sub.slug, {
        slug: sub.slug,
        title: sub.title,
        heading: sub.heading,
        categoryKey: sub.categoryKey,
        categoryTitle: sub.categoryTitle,
        publicPath: sub.publicPath,
        status: 'PUBLISHED',
        published: true
      });
    }
    for (const page of dbPages) {
      map.set(page.slug, {
        id: page.id,
        slug: page.slug,
        title: page.title,
        status: page.status,
        published: page.status === PublicationStatus.PUBLISHED,
        updatedAt: page.updatedAt,
        content: page.content
      });
    }

    res.json({ pages: Array.from(map.values()) });
  }));

  router.get('/pages/:slug', asyncRoute(async (req, res) => {
    const { slug } = req.params;
    const dbEntry = await database.cmsEntry.findFirst({
      where: { type: 'page', slug, deletedAt: null }
    });

    if (dbEntry) {
      const content = (stripInternalCmsFields(dbEntry.content) || {}) as Record<string, unknown>;
      return res.json({
        id: dbEntry.id,
        slug: dbEntry.slug,
        title: dbEntry.title,
        heading: (content.heading as string) || dbEntry.title,
        summary: dbEntry.summary || (content.summary as string) || (content.description as string) || '',
        description: (content.description as string) || dbEntry.summary || '',
        subheading: (content.subheading as string) || '',
        heroBadge: (content.heroBadge as string) || '',
        status: dbEntry.status,
        published: dbEntry.status === PublicationStatus.PUBLISHED,
        updatedAt: dbEntry.updatedAt,
        ...content
      });
    }

    const officialSub = OFFICIAL_WEBSITE_SUBSECTIONS.find(s => s.slug === slug);
    if (officialSub) {
      return res.json({
        slug: officialSub.slug,
        title: officialSub.title,
        heading: officialSub.heading,
        subheading: officialSub.subheading,
        summary: officialSub.description,
        description: officialSub.description,
        categoryKey: officialSub.categoryKey,
        categoryTitle: officialSub.categoryTitle,
        heroBadge: officialSub.categoryTitle,
        publicPath: officialSub.publicPath,
        published: true,
        cta: { label: 'Explore Programme', url: '/contact', variant: 'primary' }
      });
    }

    res.status(404).json({ error: `Page '${slug}' not found` });
  }));

  router.put('/pages/:slug', asyncRoute(async (req, res) => {
    const { slug } = req.params;
    const body = req.body || {};
    const isPublish = body.published !== false;
    const status = isPublish ? PublicationStatus.PUBLISHED : PublicationStatus.DRAFT;
    const title = body.title || body.heading || slug;
    const summary = body.summary || body.description || '';

    const { id: _ignoreId, slug: _ignoreSlug, title: _t, summary: _s, status: _st, published: _p, ...contentData } = body;

    const existing = await database.cmsEntry.findFirst({
      where: { type: 'page', slug, deletedAt: null }
    });

    let savedEntry;
    if (existing) {
      savedEntry = await database.cmsEntry.update({
        where: { id: existing.id },
        data: {
          title,
          summary,
          content: contentData as Prisma.InputJsonValue,
          status,
          publishedAt: isPublish ? (existing.publishedAt || new Date()) : null
        }
      });
    } else {
      const author = await prisma.user.findFirst({ where: { role: Role.OWNER } });
      savedEntry = await database.cmsEntry.create({
        data: {
          type: 'page',
          slug,
          title,
          summary,
          content: contentData as Prisma.InputJsonValue,
          status,
          publishedAt: isPublish ? new Date() : null,
          authorId: author?.id
        }
      });
    }

    res.json({
      id: savedEntry.id,
      slug: savedEntry.slug,
      title: savedEntry.title,
      status: savedEntry.status,
      published: savedEntry.status === PublicationStatus.PUBLISHED,
      updatedAt: savedEntry.updatedAt,
      ...contentData
    });
  }));

  router.get('/:type/:slug', asyncRoute(async (req, res) => {
    try {
      const entry = await database.cmsEntry.findFirst({ where: { type: req.params.type, slug: req.params.slug, status: PublicationStatus.PUBLISHED, deletedAt: null } });
      if (!entry) {
        if (req.params.type === 'page') {
          const officialSub = OFFICIAL_WEBSITE_SUBSECTIONS.find(s => s.slug === req.params.slug);
          if (officialSub) {
            return res.json({
              entry: {
                id: `seeded-${officialSub.slug}`,
                slug: officialSub.slug,
                type: 'page',
                title: officialSub.title,
                summary: officialSub.description,
                status: 'PUBLISHED',
                content: {
                  ...officialSub,
                  published: true
                }
              }
            });
          }
        }
        throw httpError(404, 'Content not found');
      }
      res.json({
        entry: {
          ...entry,
          content: stripInternalCmsFields(entry.content)
        }
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) throw error;
      res.status(404).json({ error: 'Content not found' });
    }
  }));

  router.get('/:type', asyncRoute(async (req, res) => {
    try {
      const entries = await database.cmsEntry.findMany({ where: { type: req.params.type, status: PublicationStatus.PUBLISHED, deletedAt: null }, orderBy: { publishedAt: 'desc' } });
      res.json({
        entries: entries.map(entry => ({
          ...entry,
          content: stripInternalCmsFields(entry.content)
        }))
      });
    } catch {
      res.json({ entries: [] });
    }
  }));

return router;
};

export default createCmsRouter();

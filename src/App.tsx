/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useEffect, useState} from 'react';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Facebook,
  FileText,
  Info,
  LayoutDashboard,
  Mail,
  Music2,
  Shield,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import {motion} from 'motion/react';

import {TikTokDashboard} from './components/TikTokDashboard';
import {useTikTokAuth} from './context/TikTokAuthContext';

type ActiveTab = 'home' | 'privacy' | 'terms' | 'deletion';

const TAB_HASHES: Record<ActiveTab, string> = {
  home: '#home',
  privacy: '#privacy-policy',
  terms: '#terms-of-service',
  deletion: '#data-deletion',
};

function getActiveTabFromHash(hash: string): ActiveTab {
  const normalizedHash = hash.replace(/^#/, '').trim().toLowerCase();

  if (normalizedHash === 'privacy' || normalizedHash === 'privacy-policy') {
    return 'privacy';
  }

  if (normalizedHash === 'terms' || normalizedHash === 'terms-of-service') {
    return 'terms';
  }

  if (normalizedHash === 'deletion' || normalizedHash === 'data-deletion') {
    return 'deletion';
  }

  return 'home';
}

type Permission = {
  name: string;
  desc: string;
  includedIn?: string;
};

type FeatureCardData = {
  description: string;
  icon: LucideIcon;
  key?: React.Key;
  title: string;
};

type WorkflowStep = {
  description: string;
  key?: React.Key;
  step: string;
  title: string;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() =>
    typeof window === 'undefined' ? 'home' : getActiveTabFromHash(window.location.hash),
  );
  const {isConfigured, isConnected, logout, missingValues, session, start} = useTikTokAuth();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncActiveTab = () => {
      setActiveTab(getActiveTabFromHash(window.location.hash));
      window.scrollTo({behavior: 'smooth', top: 0});
    };

    syncActiveTab();
    window.addEventListener('hashchange', syncActiveTab);

    return () => window.removeEventListener('hashchange', syncActiveTab);
  }, []);

  if (isConnected && session) {
    return <TikTokDashboard onLogout={logout} session={session} />;
  }

  const metaPermissions: Permission[] = [
    {name: 'pages_read_engagement', desc: 'Allows the app to read content and engagement data from your Facebook Pages.'},
    {name: 'public_profile', desc: 'Provides access to your basic profile information like name and profile picture.'},
    {name: 'pages_manage_posts', desc: 'Enables the app to create and manage posts on your Facebook Pages.'},
    {name: 'pages_manage_engagement', desc: 'Allows the app to manage comments and engagement on your Page posts.'},
    {name: 'pages_show_list', desc: 'Lets the app see the list of Pages you manage.'},
    {name: 'business_management', desc: 'Allows the app to manage your business assets and settings.'},
  ];

  const tikTokPermissions: Permission[] = [
    {
      name: 'user.info.basic',
      desc: "Read a user's profile info (open id, avatar, display name ...).",
      includedIn: 'Login Kit',
    },
    {
      name: 'video.upload',
      desc: "Share content to a creator's account as a draft to further edit and post in TikTok.",
      includedIn: 'Content Posting API',
    },
  ];

  const features: FeatureCardData[] = [
    {
      icon: LayoutDashboard,
      title: 'Single content workspace',
      description:
        'Keep your publishing workflow, platform connections, and upload status inside one dashboard instead of scattered tools.',
    },
    {
      icon: CalendarDays,
      title: 'Draft-first publishing flow',
      description:
        'Send prepared videos to TikTok as drafts so creators can review, edit, and publish with the final native polish they need.',
    },
    {
      icon: BarChart3,
      title: 'Clear operational visibility',
      description:
        'See what has been connected, what is ready to upload, and what still needs attention before your campaign goes live.',
    },
  ];

  const workflowSteps: WorkflowStep[] = [
    {
      step: '01',
      title: 'Connect TikTok',
      description: 'Start the TikTok authorization flow with the exact scopes required for basic identity and video draft upload.',
    },
    {
      step: '02',
      title: 'Upload prepared content',
      description: 'Move your video into TikTok through Fancambo without leaving the dashboard or juggling extra tools.',
    },
    {
      step: '03',
      title: 'Hand off for final post',
      description: 'TikTok sends the uploaded draft to the creator inbox so the post can be finalized and published natively.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-lg font-black text-white">
              F
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">Fancambo App</p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Social Media Workflow</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <NavItem activeTab={activeTab} href={TAB_HASHES.home} icon={Info} id="home" label="Home" />
            <NavItem activeTab={activeTab} href={TAB_HASHES.terms} icon={FileText} id="terms" label="Terms" />
            <NavItem activeTab={activeTab} href={TAB_HASHES.privacy} icon={Shield} id="privacy" label="Privacy" />
            <NavItem activeTab={activeTab} href={TAB_HASHES.deletion} icon={Trash2} id="deletion" label="Data Deletion" />
          </div>
        </div>
      </nav>

      <main className={`mx-auto px-6 py-12 ${activeTab === 'home' ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {activeTab === 'home' && (
          <motion.div
            id="home"
            animate={{opacity: 1, y: 0}}
            className="space-y-16"
            initial={{opacity: 0, y: 20}}
          >
            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-8 py-10 shadow-sm sm:px-10 sm:py-12 lg:px-12">
              <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%)]" />
              <div className="relative grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
                <div className="space-y-8">
                  <div className="space-y-5">
                    <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                      <Sparkles size={16} />
                      Creator-ready publishing workflow
                    </span>
                    <div className="space-y-4">
                      <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                        Manage social content with a cleaner, faster landing-to-upload flow.
                      </h1>
                      <p className="max-w-2xl text-lg leading-8 text-slate-600">
                        Fancambo App helps businesses and creators connect TikTok, organize publishing access, and move from
                        prepared content to creator-ready draft uploads from one focused workspace.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={start}
                      disabled={!isConfigured}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                    >
                      Start Now
                      <ArrowRight size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById('platform-permissions')?.scrollIntoView({behavior: 'smooth'})}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      View Permissions
                    </button>
                  </div>

                  {!isConfigured ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Missing TikTok config: {missingValues.join(', ')}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium">TikTok scopes: `user.info.basic` + `video.upload`</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium">Draft upload dashboard included</span>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-3">
                    <MetricCard label="Focus" value="TikTok draft uploads" />
                    <MetricCard label="Workflow" value="Single dashboard" />
                    <MetricCard label="Access" value="Permission-ready setup" />
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-200/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-200/80">Preview</p>
                      <h2 className="mt-2 text-2xl font-bold">Fancambo Dashboard</h2>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold text-sky-100">Upload Video</div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Connection</p>
                          <p className="mt-2 text-lg font-bold text-white">TikTok ready</p>
                        </div>
                        <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-300">
                          Active
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        Start auth, capture the account session, and move directly into the upload workflow.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <PreviewTile title="Upload Drafts" value="Chunked TikTok upload flow" />
                      <PreviewTile title="Track Status" value="Processing and handoff states" />
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Publishing Flow</p>
                          <p className="mt-2 text-lg font-bold text-white">Creator inbox delivery</p>
                        </div>
                        <CheckCircle2 className="text-emerald-300" size={22} />
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300" />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        Upload the file, let TikTok process it, then hand it back for final native editing and posting.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-8">
              <SectionIntro
                eyebrow="Why Fancambo"
                title="A standard landing page for a focused social publishing product."
                description="The home page now leads visitors through value, workflow, and permissions in the order most teams expect when evaluating a publishing tool."
              />

              <div className="grid gap-6 lg:grid-cols-3">
                {features.map((feature) => (
                  <FeatureCard key={feature.title} description={feature.description} icon={feature.icon} title={feature.title} />
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
              <SectionIntro
                eyebrow="How It Works"
                title="From connect to creator inbox in three clear steps."
                description="The product flow is intentionally simple so creators and teams can move quickly without getting lost in setup."
              />

              <div className="mt-8 grid gap-5 lg:grid-cols-3">
                {workflowSteps.map((workflowStep) => (
                  <WorkflowCard
                    key={workflowStep.step}
                    description={workflowStep.description}
                    step={workflowStep.step}
                    title={workflowStep.title}
                  />
                ))}
              </div>
            </section>

            <section id="platform-permissions" className="space-y-8">
              <SectionIntro
                eyebrow="Permissions"
                title="Platform permissions are grouped by integration, not buried in the page."
                description="Visitors can now understand what each platform connection is used for and start the TikTok flow from the exact section where it matters."
              />

              <div className="grid gap-6 xl:grid-cols-2">
                <PlatformCard
                  description="These permissions support Facebook Page access, publishing, engagement management, and business asset setup."
                  icon={Facebook}
                  iconClassName="text-blue-600"
                  title="Meta App Review Permissions"
                >
                  <div className="space-y-4">
                    {metaPermissions.map((permission) => (
                      <PermissionCard key={permission.name} permission={permission} tone="meta" />
                    ))}
                  </div>
                </PlatformCard>

                <PlatformCard
                  description="These permissions support TikTok account connection and draft video uploads to the creator inbox workflow."
                  icon={Music2}
                  iconClassName="text-slate-900"
                  title="TikTok Permissions"
                >
                  <div id="tiktok-permissions" className="space-y-4">
                    {tikTokPermissions.map((permission) => (
                      <PermissionCard key={permission.name} permission={permission} tone="tiktok" />
                    ))}
                  </div>

                  <div className="mt-6 rounded-3xl border border-sky-200 bg-sky-50 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Ready To Connect</p>
                        <p className="mt-2 text-base leading-7 text-sky-950">
                          Start the TikTok flow and move directly into the upload dashboard after a successful login.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={start}
                        disabled={!isConfigured}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                      >
                        Start Now
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </PlatformCard>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
              <SectionIntro
                eyebrow="Legal"
                title="Terms of Service and policy pages are linked directly from the homepage."
                description="Review the legal pages TikTok requests before connecting an account. Each link opens a dedicated section with its own shareable URL."
              />

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                <LegalLinkCard
                  description="Read the rules that govern use of Fancambo App, account responsibilities, and platform integrations."
                  href={TAB_HASHES.terms}
                  icon={FileText}
                  title="Terms of Service"
                />
                <LegalLinkCard
                  description="See what data we collect, how we use it, and how we protect information connected through TikTok and Facebook."
                  href={TAB_HASHES.privacy}
                  icon={Shield}
                  title="Privacy Policy"
                />
                <LegalLinkCard
                  description="Follow the steps for removing app activity or requesting manual deletion of account-related data."
                  href={TAB_HASHES.deletion}
                  icon={Trash2}
                  title="Data Deletion"
                />
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'privacy' && (
          <motion.div
            id="privacy-policy"
            animate={{opacity: 1, y: 0}}
            className="space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12"
            initial={{opacity: 0, y: 20}}
          >
            <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
              <Shield className="text-blue-600" size={32} />
              <h2 className="text-3xl font-bold">Privacy Policy</h2>
            </div>

            <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
              <p className="text-sm italic text-slate-500">Last Updated: March 21, 2026</p>

              <section>
                <h3 className="mb-2 text-xl font-bold text-slate-900">1. Information We Collect</h3>
                <p>
                  When you connect Fancambo App with Facebook or TikTok, we collect information necessary to provide our
                  services, including your public profile details, data related to the Facebook Pages you manage, and TikTok
                  profile and account statistics you authorize us to access.
                </p>
              </section>

              <section>
                <h3 className="mb-2 text-xl font-bold text-slate-900">2. How We Use Your Information</h3>
                <p>We use the permissions granted to:</p>
                <ul className="mt-2 list-disc space-y-2 pl-6">
                  <li>Display a list of Facebook Pages and connected TikTok profile details.</li>
                  <li>Schedule and publish posts to your Facebook Pages and TikTok profile.</li>
                  <li>Save TikTok uploads as drafts for further editing and posting.</li>
                  <li>Analyze engagement metrics and account statistics to provide insights.</li>
                </ul>
              </section>

              <section>
                <h3 className="mb-2 text-xl font-bold text-slate-900">3. Data Security</h3>
                <p>
                  We implement industry-standard security measures to protect your data. We do not sell your personal
                  information to third parties. Access to your Facebook and TikTok data is managed via secure OAuth tokens.
                </p>
              </section>

              <section className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
                <h3 className="mb-2 text-lg font-bold text-blue-900">Contact Us</h3>
                <p className="flex items-center gap-2 text-blue-800">
                  <Mail size={18} />
                  support@fancambo-app.baxex.com
                </p>
              </section>
            </div>
          </motion.div>
        )}

        {activeTab === 'terms' && (
          <motion.div
            id="terms-of-service"
            animate={{opacity: 1, y: 0}}
            className="space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12"
            initial={{opacity: 0, y: 20}}
          >
            <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
              <FileText className="text-slate-900" size={32} />
              <h2 className="text-3xl font-bold">Terms of Service</h2>
            </div>

            <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
              <p className="text-sm italic text-slate-500">Last Updated: April 1, 2026</p>

              <section>
                <h3 className="mb-2 text-xl font-bold text-slate-900">1. Acceptance of Terms</h3>
                <p>
                  By accessing or using Fancambo App, you agree to these Terms of Service. If you do not agree, do not use
                  the service.
                </p>
              </section>

              <section>
                <h3 className="mb-2 text-xl font-bold text-slate-900">2. Service Description</h3>
                <p>
                  Fancambo App provides a workflow for connecting approved social platform accounts, managing permissions,
                  and uploading videos to TikTok as drafts for further creator review and publishing.
                </p>
              </section>

              <section>
                <h3 className="mb-2 text-xl font-bold text-slate-900">3. Account and Platform Responsibilities</h3>
                <p>
                  You are responsible for maintaining the security of your connected accounts and for ensuring you have the
                  right to upload, manage, and share any content submitted through the service.
                </p>
              </section>

              <section>
                <h3 className="mb-2 text-xl font-bold text-slate-900">4. Content and Acceptable Use</h3>
                <p>You agree not to use Fancambo App to upload or distribute content that:</p>
                <ul className="mt-2 list-disc space-y-2 pl-6">
                  <li>Violates the terms, policies, or community guidelines of TikTok, Facebook, or any connected platform.</li>
                  <li>Infringes intellectual property, privacy, publicity, or other legal rights.</li>
                  <li>Contains malicious code, attempts unauthorized access, or disrupts the service.</li>
                </ul>
              </section>

              <section>
                <h3 className="mb-2 text-xl font-bold text-slate-900">5. Availability and Changes</h3>
                <p>
                  We may update, suspend, or discontinue parts of the service at any time to improve functionality, maintain
                  security, or comply with platform requirements and applicable law.
                </p>
              </section>

              <section>
                <h3 className="mb-2 text-xl font-bold text-slate-900">6. Limitation of Liability</h3>
                <p>
                  Fancambo App is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the maximum extent allowed by law,
                  we are not liable for indirect, incidental, special, or consequential damages arising from your use of the
                  service.
                </p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="mb-2 text-lg font-bold text-slate-900">Contact Us</h3>
                <p className="flex items-center gap-2 text-slate-700">
                  <Mail size={18} />
                  support@fancambo-app.baxex.com
                </p>
              </section>
            </div>
          </motion.div>
        )}

        {activeTab === 'deletion' && (
          <motion.div
            id="data-deletion"
            animate={{opacity: 1, y: 0}}
            className="space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12"
            initial={{opacity: 0, y: 20}}
          >
            <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
              <Trash2 className="text-red-500" size={32} />
              <h2 className="text-3xl font-bold">User Data Deletion Instructions</h2>
            </div>

            <div className="space-y-6 text-slate-700">
              <p>
                According to Facebook Platform rules, we provide a User Data Deletion Callback URL or Data Deletion
                Instructions. If you want to delete your activities for Fancambo App, you can remove your information by
                following these steps:
              </p>

              <div className="space-y-4">
                {[
                  "Go to your Facebook Account's Settings & Privacy. Click 'Settings'.",
                  "Look for 'Apps and Websites' and you will see all of the apps and websites you linked with your Facebook.",
                  "Search and look for 'Fancambo App' in the search bar.",
                  "Scroll and click 'Remove'.",
                  'Congratulations, you have successfully removed your app activities.',
                ].map((step, index) => (
                  <div key={step} className="flex items-start gap-4">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                      {index + 1}
                    </span>
                    <p className="pt-1">{step}</p>
                  </div>
                ))}
              </div>

              <div className="mt-12 rounded-3xl border border-slate-200 bg-slate-50 p-8">
                <h3 className="mb-4 text-xl font-bold">Request Manual Deletion</h3>
                <p className="mb-4">
                  Alternatively, you can request that we delete all data associated with your account by contacting our
                  support team.
                </p>
                <a
                  href="mailto:support@fancambo-app.baxex.com"
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white transition-colors hover:bg-slate-800"
                >
                  <Mail size={20} />
                  Email Support
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 md:flex-row">
          <div className="text-center md:text-left">
            <p className="text-lg font-bold">Fancambo App</p>
            <p className="text-sm text-slate-500">© 2026 Fancambo. All rights reserved.</p>
          </div>
          <div className="flex gap-6 text-sm font-medium text-slate-600">
            <a className="hover:text-blue-600" href={TAB_HASHES.terms}>Terms of Service</a>
            <a className="hover:text-blue-600" href={TAB_HASHES.privacy}>Privacy Policy</a>
            <a className="hover:text-blue-600" href={TAB_HASHES.deletion}>Data Deletion</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavItem({
  activeTab,
  href,
  icon: Icon,
  id,
  label,
}: {
  activeTab: ActiveTab;
  href: string;
  icon: LucideIcon;
  id: ActiveTab;
  label: string;
}) {
  return (
    <a
      aria-current={activeTab === id ? 'page' : undefined}
      className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-200 ${
        activeTab === id ? 'bg-slate-950 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
      }`}
      href={href}
    >
      <Icon size={18} />
      <span className="font-medium">{label}</span>
    </a>
  );
}

function SectionIntro({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">{eyebrow}</p>
      <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
      <p className="max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">{description}</p>
    </div>
  );
}

function FeatureCard({
  description,
  icon: Icon,
  title,
}: FeatureCardData) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
        <Icon size={22} />
      </div>
      <h3 className="mt-5 text-xl font-bold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </article>
  );
}

function WorkflowCard({
  description,
  step,
  title,
}: WorkflowStep) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
      <div className="text-sm font-black tracking-[0.28em] text-sky-700">{step}</div>
      <h3 className="mt-4 text-xl font-bold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </article>
  );
}

function PlatformCard({
  children,
  description,
  icon: Icon,
  iconClassName,
  title,
}: {
  children: React.ReactNode;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  title: string;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 ${iconClassName}`}>
          <Icon size={22} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function PermissionCard({
  permission,
  tone,
}: {
  key?: React.Key;
  permission: Permission;
  tone: 'meta' | 'tiktok';
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <CheckCircle2 className="mt-1 shrink-0 text-emerald-500" size={20} />
      <div>
        <code className={`text-sm font-bold ${tone === 'meta' ? 'text-blue-700' : 'text-slate-900'}`}>{permission.name}</code>
        <p className="mt-1 text-sm text-slate-600">{permission.desc}</p>
        {permission.includedIn && (
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Included in {permission.includedIn}
          </p>
        )}
      </div>
    </div>
  );
}

function LegalLinkCard({
  description,
  href,
  icon: Icon,
  title,
}: {
  description: string;
  href: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <a
      className="group rounded-[2rem] border border-slate-200 bg-slate-50 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
      href={href}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
        <Icon size={22} />
      </div>
      <h3 className="mt-5 text-xl font-bold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-700">
        Open page
        <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" size={16} />
      </div>
    </a>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-base font-bold text-slate-950">{value}</p>
    </div>
  );
}

function PreviewTile({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <p className="mt-2 text-base font-bold text-white">{value}</p>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Trash2, Mail, ExternalLink, Facebook, Info, CheckCircle2, Music2, Link2, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { useTikTokAuth } from './context/TikTokAuthContext';

type Permission = {
  name: string;
  desc: string;
  includedIn?: string;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'privacy' | 'deletion'>('home');
  const { isConfigured, isConnected, logout, missingValues, session, start } = useTikTokAuth();

  const metaPermissions: Permission[] = [
    { name: 'pages_read_engagement', desc: 'Allows the app to read content and engagement data from your Facebook Pages.' },
    { name: 'public_profile', desc: 'Provides access to your basic profile information like name and profile picture.' },
    { name: 'pages_manage_posts', desc: 'Enables the app to create and manage posts on your Facebook Pages.' },
    { name: 'pages_manage_engagement', desc: 'Allows the app to manage comments and engagement on your Page posts.' },
    { name: 'pages_show_list', desc: 'Lets the app see the list of Pages you manage.' },
    { name: 'business_management', desc: 'Allows the app to manage your business assets and settings.' },
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

  const NavItem = ({ id, label, icon: Icon }: { id: typeof activeTab; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
        activeTab === id 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={18} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              F
            </div>
            <h1 className="text-xl font-bold tracking-tight">Fancambo App</h1>
          </div>
          <div className="flex gap-2">
            <NavItem id="home" label="Home" icon={Info} />
            <NavItem id="privacy" label="Privacy" icon={Shield} />
            <NavItem id="deletion" label="Data Deletion" icon={Trash2} />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {activeTab === 'home' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <section className="text-center space-y-4">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                Manage all your social media content in one place.
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Fancambo App (fancambo-app.baxex.com) helps businesses and creators streamline Facebook and TikTok content
                management, scheduling, publishing, and audience engagement.
              </p>
              <div className="pt-2 flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={start}
                  disabled={!isConfigured}
                  className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                >
                  Start Now
                </button>
                {isConnected && session ? (
                  <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <Link2 size={16} />
                      TikTok connected
                    </span>
                    <span className="text-emerald-600">Open ID: {session.openId || 'Connected'}</span>
                    <button
                      type="button"
                      onClick={logout}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                    >
                      <LogOut size={14} />
                      Disconnect
                    </button>
                  </div>
                ) : !isConfigured ? (
                  <p className="text-sm text-amber-700">
                    Missing TikTok config: {missingValues.join(', ')}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    Start the TikTok authorization flow with <code className="font-mono">user.info.basic</code> and <code className="font-mono">video.upload</code>.
                  </p>
                )}
              </div>
            </section>

            <section id="platform-permissions" className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Info className="text-blue-600" />
                Platform Permissions
              </h3>
              <p className="text-slate-600 mb-8">
                To provide our core services, Fancambo App requests the following permissions from connected Meta and TikTok
                accounts. We use this data strictly to help you manage publishing, account insights, and business assets.
              </p>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-3xl border border-slate-200 p-6 bg-slate-50/70">
                  <div className="flex items-center gap-2 mb-3">
                    <Facebook className="text-blue-600" />
                    <h4 className="text-xl font-bold">Meta App Review Permissions</h4>
                  </div>
                  <p className="text-sm text-slate-600 mb-6">
                    These permissions support Facebook Page access, publishing, engagement management, and business asset setup.
                  </p>
                  <div className="space-y-4">
                    {metaPermissions.map((p) => (
                      <div key={p.name} className="p-4 rounded-2xl bg-white border border-slate-100 flex gap-3">
                        <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={20} />
                        <div>
                          <code className="text-sm font-mono font-bold text-blue-700">{p.name}</code>
                          <p className="text-sm text-slate-600 mt-1">{p.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div id="tiktok-permissions" className="rounded-3xl border border-slate-200 p-6 bg-slate-50/70">
                  <div className="flex items-center gap-2 mb-3">
                    <Music2 className="text-slate-900" />
                    <h4 className="text-xl font-bold">TikTok Permissions</h4>
                  </div>
                  <p className="text-sm text-slate-600 mb-6">
                    These permissions let creators connect TikTok, publish content, save drafts, and view profile and account
                    performance details.
                  </p>
                  <div className="space-y-4">
                    {tikTokPermissions.map((p) => (
                      <div key={p.name} className="p-4 rounded-2xl bg-white border border-slate-100 flex gap-3">
                        <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={20} />
                        <div>
                          <code className="text-sm font-mono font-bold text-slate-900">{p.name}</code>
                          <p className="text-sm text-slate-600 mt-1">{p.desc}</p>
                          {p.includedIn && (
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mt-2">
                              Included in {p.includedIn}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={start}
                      disabled={!isConfigured}
                      className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                    >
                      Start Now
                    </button>
                    {isConnected && session && (
                      <p className="text-sm text-emerald-700">
                        Connected to TikTok with <code className="font-mono">{session.scope.join(', ')}</code>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'privacy' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
              <Shield className="text-blue-600" size={32} />
              <h2 className="text-3xl font-bold">Privacy Policy</h2>
            </div>
            
            <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
              <p className="text-sm text-slate-500 italic">Last Updated: March 21, 2026</p>
              
              <section>
                <h3 className="text-xl font-bold text-slate-900 mb-2">1. Information We Collect</h3>
                <p>
                  When you connect Fancambo App with Facebook or TikTok, we collect information necessary to provide our
                  services, including your public profile details, data related to the Facebook Pages you manage, and TikTok
                  profile and account statistics you authorize us to access.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-slate-900 mb-2">2. How We Use Your Information</h3>
                <p>
                  We use the permissions granted to:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Display a list of Facebook Pages and connected TikTok profile details.</li>
                  <li>Schedule and publish posts to your Facebook Pages and TikTok profile.</li>
                  <li>Save TikTok uploads as drafts for further editing and posting.</li>
                  <li>Analyze engagement metrics and account statistics to provide insights.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-bold text-slate-900 mb-2">3. Data Security</h3>
                <p>
                  We implement industry-standard security measures to protect your data. We do not sell your personal 
                  information to third parties. Access to your Facebook and TikTok data is managed via secure OAuth tokens.
                </p>
              </section>

              <section className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <h3 className="text-lg font-bold text-blue-900 mb-2">Contact Us</h3>
                <p className="text-blue-800 flex items-center gap-2">
                  <Mail size={18} />
                  support@fancambo-app.baxex.com
                </p>
              </section>
            </div>
          </motion.div>
        )}

        {activeTab === 'deletion' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
              <Trash2 className="text-red-500" size={32} />
              <h2 className="text-3xl font-bold">User Data Deletion Instructions</h2>
            </div>

            <div className="space-y-6 text-slate-700">
              <p>
                According to Facebook Platform rules, we provide a User Data Deletion Callback URL or Data Deletion Instructions. 
                If you want to delete your activities for Fancambo App, you can remove your information by following these steps:
              </p>

              <div className="space-y-4">
                {[
                  "Go to your Facebook Account's Settings & Privacy. Click 'Settings'.",
                  "Look for 'Apps and Websites' and you will see all of the apps and websites you linked with your Facebook.",
                  "Search and look for 'Fancambo App' in the search bar.",
                  "Scroll and click 'Remove'.",
                  "Congratulations, you have successfully removed your app activities."
                ].map((step, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <p className="pt-1">{step}</p>
                  </div>
                ))}
              </div>

              <div className="mt-12 p-8 bg-slate-50 rounded-3xl border border-slate-200">
                <h3 className="text-xl font-bold mb-4">Request Manual Deletion</h3>
                <p className="mb-4">
                  Alternatively, you can request that we delete all data associated with your account by contacting our support team.
                </p>
                <a 
                  href="mailto:support@fancambo-app.baxex.com" 
                  className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-colors"
                >
                  <Mail size={20} />
                  Email Support
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <p className="font-bold text-lg">Fancambo App</p>
            <p className="text-slate-500 text-sm">© 2026 Fancambo. All rights reserved.</p>
          </div>
          <div className="flex gap-6 text-sm font-medium text-slate-600">
            <button onClick={() => setActiveTab('privacy')} className="hover:text-blue-600">Privacy Policy</button>
            <button onClick={() => setActiveTab('deletion')} className="hover:text-blue-600">Data Deletion</button>
            <a href="#" className="hover:text-blue-600 flex items-center gap-1">
              Terms of Service <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

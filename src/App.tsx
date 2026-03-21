/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Trash2, Mail, ExternalLink, Facebook, Info, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'privacy' | 'deletion'>('home');

  const permissions = [
    { name: 'pages_read_engagement', desc: 'Allows the app to read content and engagement data from your Facebook Pages.' },
    { name: 'public_profile', desc: 'Provides access to your basic profile information like name and profile picture.' },
    { name: 'pages_manage_posts', desc: 'Enables the app to create and manage posts on your Facebook Pages.' },
    { name: 'pages_manage_engagement', desc: 'Allows the app to manage comments and engagement on your Page posts.' },
    { name: 'pages_show_list', desc: 'Lets the app see the list of Pages you manage.' },
    { name: 'business_management', desc: 'Allows the app to manage your business assets and settings.' },
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
                Manage your Facebook presence with ease.
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Fancambo App (fancambo-app.baxex.com) helps businesses and creators streamline their social media management, 
                content scheduling, and audience engagement.
              </p>
            </section>

            <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Facebook className="text-blue-600" />
                Meta App Review Permissions
              </h3>
              <p className="text-slate-600 mb-8">
                To provide our core services, Fancambo App requests the following permissions. 
                We use this data strictly to help you manage your Pages and Business assets.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {permissions.map((p) => (
                  <div key={p.name} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={20} />
                    <div>
                      <code className="text-sm font-mono font-bold text-blue-700">{p.name}</code>
                      <p className="text-sm text-slate-600 mt-1">{p.desc}</p>
                    </div>
                  </div>
                ))}
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
                  When you use Fancambo App via Facebook Login, we collect information necessary to provide our services, 
                  including your public profile (name, profile picture) and data related to the Facebook Pages you manage.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-slate-900 mb-2">2. How We Use Your Information</h3>
                <p>
                  We use the permissions granted to:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Display a list of Facebook Pages you manage.</li>
                  <li>Schedule and publish posts to your Pages.</li>
                  <li>Analyze engagement metrics (likes, comments, shares) to provide insights.</li>
                  <li>Moderate and respond to comments on your behalf.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-bold text-slate-900 mb-2">3. Data Security</h3>
                <p>
                  We implement industry-standard security measures to protect your data. We do not sell your personal 
                  information to third parties. Access to your Facebook data is managed via secure OAuth tokens.
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

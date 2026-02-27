"use client";

import Link from "next/link";
import { ArrowLeft, Bell, Mail, Smartphone } from "lucide-react";
import { useState } from "react";

export default function NotificationsPage() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(false);
  const [smsNotifs, setSmsNotifs] = useState(true);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link 
          href="/profil" 
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-dark hover:bg-light transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-heading font-bold text-3xl text-dark">Notifications</h1>
          <p className="text-muted text-sm mt-1">Gérez la façon dont nous vous contactons</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-card p-6 md:p-10 space-y-8">
        
        {/* Type de notifications */}
        <div>
          <h2 className="font-heading font-semibold text-xl text-dark mb-6">Canaux de communication</h2>
          <div className="space-y-4">
            {/* Email */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-light hover:border-primary/20 transition-all bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-dark">Email</h3>
                  <p className="text-xs text-muted mt-0.5 max-w-sm leading-relaxed">Recevez vos confirmations de réservation et les offres spéciales par courriel.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={emailNotifs} onChange={(e) => setEmailNotifs(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Push */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-light hover:border-primary/20 transition-all bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-dark">Notifications Push</h3>
                  <p className="text-xs text-muted mt-0.5 max-w-sm leading-relaxed">Alertes en temps réel sur votre navigateur concernant vos voyages.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={pushNotifs} onChange={(e) => setPushNotifs(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* SMS */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-light hover:border-primary/20 transition-all bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-dark">SMS</h3>
                  <p className="text-xs text-muted mt-0.5 max-w-sm leading-relaxed">Messages importants le jour de votre arrivée et rappels urgents.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={smsNotifs} onChange={(e) => setSmsNotifs(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

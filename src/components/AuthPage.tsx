import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Building2 } from 'lucide-react';

export const AuthPage = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="p-8 bg-slate-900 text-white text-center">
                    <div className="mx-auto w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                        <Building2 className="text-white" size={24} />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Mini-World Developer OS</h1>
                    <p className="text-slate-400 text-sm">Sign in to manage your critical path.</p>
                </div>
                <div className="p-8">
                    <Auth
                        supabaseClient={supabase}
                        appearance={{ theme: ThemeSupa }}
                        theme="default"
                        providers={['google', 'github']}
                        redirectTo={window.location.origin}
                    />
                </div>
            </div>
        </div>
    );
};

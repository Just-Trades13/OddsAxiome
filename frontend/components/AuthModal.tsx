import React, { useState, useEffect } from 'react';
import { X, Mail, ShieldCheck, User as UserIcon, Phone, ArrowRight, LoaderCircle, Globe, Key, AlertCircle, Send, CheckCircle2, ChevronLeft } from 'lucide-react';
import { User } from '../types.ts';
import { clsx } from 'clsx';

// Firebase Imports
import { auth } from '../services/firebase.ts';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload
} from 'firebase/auth';
import { syncUser, getMe, updateMe } from '../services/api.ts';

const COUNTRY_DATA = [
  { name: "Afghanistan", code: "+93" },
  { name: "Albania", code: "+355" },
  { name: "Algeria", code: "+213" },
  { name: "Andorra", code: "+376" },
  { name: "Angola", code: "+244" },
  { name: "Antigua and Barbuda", code: "+1-268" },
  { name: "Argentina", code: "+54" },
  { name: "Armenia", code: "+374" },
  { name: "Australia", code: "+61" },
  { name: "Austria", code: "+43" },
  { name: "Azerbaijan", code: "+994" },
  { name: "Bahamas", code: "+1-242" },
  { name: "Bahrain", code: "+973" },
  { name: "Bangladesh", code: "+880" },
  { name: "Barbados", code: "+1-246" },
  { name: "Belarus", code: "+375" },
  { name: "Belgium", code: "+32" },
  { name: "Belize", code: "+501" },
  { name: "Benin", code: "+229" },
  { name: "Bhutan", code: "+975" },
  { name: "Bolivia", code: "+591" },
  { name: "Bosnia and Herzegovina", code: "+387" },
  { name: "Botswana", code: "+267" },
  { name: "Brazil", code: "+55" },
  { name: "Brunei", code: "+673" },
  { name: "Bulgaria", code: "+359" },
  { name: "Burkina Faso", code: "+226" },
  { name: "Burundi", code: "+257" },
  { name: "Cambodia", code: "+855" },
  { name: "Cameroon", code: "+237" },
  { name: "Canada", code: "+1" },
  { name: "Cape Verde", code: "+238" },
  { name: "Central African Republic", code: "+236" },
  { name: "Chad", code: "+235" },
  { name: "Chile", code: "+56" },
  { name: "China", code: "+86" },
  { name: "Colombia", code: "+57" },
  { name: "Comoros", code: "+269" },
  { name: "Congo", code: "+242" },
  { name: "Cook Islands", code: "+682" },
  { name: "Costa Rica", code: "+506" },
  { name: "Croatia", code: "+385" },
  { name: "Cuba", code: "+53" },
  { name: "Cyprus", code: "+357" },
  { name: "Czech Republic", code: "+420" },
  { name: "Denmark", code: "+45" },
  { name: "Djibouti", code: "+253" },
  { name: "Dominica", code: "+1-767" },
  { name: "Dominican Republic", code: "+1-809" },
  { name: "East Timor", code: "+670" },
  { name: "Ecuador", code: "+593" },
  { name: "Egypt", code: "+20" },
  { name: "El Salvador", code: "+503" },
  { name: "Equatorial Guinea", code: "+240" },
  { name: "Eritrea", code: "+291" },
  { name: "Estonia", code: "+372" },
  { name: "Ethiopia", code: "+251" },
  { name: "Fiji", code: "+679" },
  { name: "Finland", code: "+358" },
  { name: "France", code: "+33" },
  { name: "Gabon", code: "+241" },
  { name: "Gambia", code: "+220" },
  { name: "Georgia", code: "+995" },
  { name: "Germany", code: "+49" },
  { name: "Ghana", code: "+233" },
  { name: "Greece", code: "+30" },
  { name: "Grenada", code: "+1-473" },
  { name: "Guatemala", code: "+502" },
  { name: "Guinea", code: "+224" },
  { name: "Guinea-Bissau", code: "+245" },
  { name: "Guyana", code: "+592" },
  { name: "Haiti", code: "+509" },
  { name: "Honduras", code: "+504" },
  { name: "Hong Kong", code: "+852" },
  { name: "Hungary", code: "+36" },
  { name: "Iceland", code: "+354" },
  { name: "India", code: "+91" },
  { name: "Indonesia", code: "+62" },
  { name: "Iran", code: "+98" },
  { name: "Iraq", code: "+964" },
  { name: "Ireland", code: "+353" },
  { name: "Israel", code: "+972" },
  { name: "Italy", code: "+39" },
  { name: "Jamaica", code: "+1-876" },
  { name: "Japan", code: "+81" },
  { name: "Jordan", code: "+962" },
  { name: "Kazakhstan", code: "+7" },
  { name: "Kenya", code: "+254" },
  { name: "Kiribati", code: "+686" },
  { name: "North Korea", code: "+850" },
  { name: "South Korea", code: "+82" },
  { name: "Kuwait", code: "+965" },
  { name: "Kyrgyzstan", code: "+996" },
  { name: "Laos", code: "+856" },
  { name: "Latvia", code: "+371" },
  { name: "Lebanon", code: "+961" },
  { name: "Lesotho", code: "+266" },
  { name: "Liberia", code: "+231" },
  { name: "Libya", code: "+218" },
  { name: "Liechtenstein", code: "+423" },
  { name: "Lithuania", code: "+370" },
  { name: "Luxembourg", code: "+352" },
  { name: "Macau", code: "+853" },
  { name: "Macedonia", code: "+389" },
  { name: "Madagascar", code: "+261" },
  { name: "Malawi", code: "+265" },
  { name: "Malaysia", code: "+60" },
  { name: "Maldives", code: "+960" },
  { name: "Mali", code: "+223" },
  { name: "Malta", code: "+356" },
  { name: "Marshall Islands", code: "+692" },
  { name: "Mauritania", code: "+222" },
  { name: "Mauritius", code: "+230" },
  { name: "Mexico", code: "+52" },
  { name: "Micronesia", code: "+691" },
  { name: "Moldova", code: "+373" },
  { name: "Monaco", code: "+377" },
  { name: "Mongolia", code: "+976" },
  { name: "Montenegro", code: "+382" },
  { name: "Morocco", code: "+212" },
  { name: "Mozambique", code: "+258" },
  { name: "Myanmar", code: "+95" },
  { name: "Namibia", code: "+264" },
  { name: "Nauru", code: "+674" },
  { name: "Nepal", code: "+977" },
  { name: "Netherlands", code: "+31" },
  { name: "New Zealand", code: "+64" },
  { name: "Nicaragua", code: "+505" },
  { name: "Niger", code: "+227" },
  { name: "Nigeria", code: "+234" },
  { name: "Norway", code: "+47" },
  { name: "Oman", code: "+968" },
  { name: "Pakistan", code: "+92" },
  { name: "Palau", code: "+680" },
  { name: "Panama", code: "+507" },
  { name: "Papua New Guinea", code: "+675" },
  { name: "Paraguay", code: "+595" },
  { name: "Peru", code: "+51" },
  { name: "Philippines", code: "+63" },
  { name: "Poland", code: "+48" },
  { name: "Portugal", code: "+351" },
  { name: "Qatar", code: "+974" },
  { name: "Romania", code: "+40" },
  { name: "Russia", code: "+7" },
  { name: "Rwanda", code: "+250" },
  { name: "Saint Kitts and Nevis", code: "+1-869" },
  { name: "Saint Lucia", code: "+1-758" },
  { name: "Saint Vincent and the Grenadines", code: "+1-784" },
  { name: "Samoa", code: "+685" },
  { name: "San Marino", code: "+378" },
  { name: "Sao Tome and Principe", code: "+239" },
  { name: "Saudi Arabia", code: "+966" },
  { name: "Senegal", code: "+221" },
  { name: "Serbia", code: "+381" },
  { name: "Seychelles", code: "+248" },
  { name: "Sierra Leone", code: "+232" },
  { name: "Singapore", code: "+65" },
  { name: "Slovakia", code: "+421" },
  { name: "Slovenia", code: "+386" },
  { name: "Solomon Islands", code: "+677" },
  { name: "Somalia", code: "+252" },
  { name: "South Africa", code: "+27" },
  { name: "Spain", code: "+34" },
  { name: "Sri Lanka", code: "+94" },
  { name: "Sudan", code: "+249" },
  { name: "Suriname", code: "+597" },
  { name: "Swaziland", code: "+268" },
  { name: "Sweden", code: "+46" },
  { name: "Switzerland", code: "+41" },
  { name: "Syria", code: "+963" },
  { name: "Taiwan", code: "+886" },
  { name: "Tajikistan", code: "+992" },
  { name: "Tanzania", code: "+255" },
  { name: "Thailand", code: "+66" },
  { name: "Togo", code: "+228" },
  { name: "Tonga", code: "+676" },
  { name: "Trinidad and Tobago", code: "+1-868" },
  { name: "Tunisia", code: "+216" },
  { name: "Turkey", code: "+90" },
  { name: "Turkmenistan", code: "+993" },
  { name: "Tuvalu", code: "+688" },
  { name: "Uganda", code: "+256" },
  { name: "Ukraine", code: "+380" },
  { name: "United Arab Emirates", code: "+971" },
  { name: "United Kingdom", code: "+44" },
  { name: "United States", code: "+1" },
  { name: "Uruguay", code: "+598" },
  { name: "Uzbekistan", code: "+998" },
  { name: "Vanuatu", code: "+678" },
  { name: "Vatican City", code: "+379" },
  { name: "Venezuela", code: "+58" },
  { name: "Vietnam", code: "+84" },
  { name: "Yemen", code: "+967" },
  { name: "Zambia", code: "+260" },
  { name: "Zimbabwe", code: "+263" }
];

const ALL_COUNTRY_CODES = [
  COUNTRY_DATA.find(c => c.name === "United States")!,
  ...COUNTRY_DATA.filter(c => c.name !== "United States").sort((a, b) => a.name.localeCompare(b.name))
];

interface AuthModalProps {
  onClose: () => void;
  onComplete: (user: User) => void;
  initialStep?: 'lead' | 'verifying' | 'complete';
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onComplete, initialStep = 'lead' }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [step, setStep] = useState<'lead' | 'verifying' | 'complete'>(initialStep);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [ipAddress, setIpAddress] = useState<string>('Detecting...');
  
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    password: '',
    lastName: '',
    zip: '',
    phone: '',
    countryCode: '+1'
  });

  useEffect(() => {
    const fetchIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setIpAddress(data.ip);
      } catch (e) {
        setIpAddress('Hidden/VPN');
      }
    };
    fetchIp();
  }, []);

  // Poll for email verification if in 'verifying' step
  useEffect(() => {
    let interval: number;
    if (step === 'verifying' && auth.currentUser) {
      interval = window.setInterval(async () => {
        try {
          await reload(auth.currentUser!);
          if (auth.currentUser?.emailVerified) {
            setStep('complete');
            clearInterval(interval);
          }
        } catch (e) {
          console.debug("Verification polling suspended (user likely redirecting)");
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [step]);

  const actionCodeSettings = {
    url: window.location.origin,
    handleCodeInApp: true,
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, formData.email, actionCodeSettings);
      setSuccess("Reset link sent! Check your email.");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (authMode === 'signin') {
      try {
        const userCred = await signInWithEmailAndPassword(auth, formData.email, formData.password);

        // Sync with backend
        await syncUser({ first_name: userCred.user.displayName?.split(' ')[0] || 'User' });
        const userData = await getMe() as any;
        const user: User = {
          id: userData.id || userCred.user.uid,
          firstName: userData.first_name || userCred.user.displayName || 'User',
          lastName: userData.last_name,
          email: userData.email || userCred.user.email || '',
          isPaid: userData.tier !== 'free',
          registrationStep: userData.registration_step || 'complete',
          createdAt: userData.created_at ? new Date(userData.created_at).getTime() : Date.now(),
        };

        if (user.registrationStep === 'complete') {
          onComplete(user);
        } else {
          setStep(user.registrationStep as any);
        }
      } catch (err: any) {
        setError(err.message || "Invalid credentials.");
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await updateProfile(userCred.user, { displayName: formData.firstName });
        await sendEmailVerification(userCred.user, actionCodeSettings);

        // Sync new user to backend
        await syncUser({
          first_name: formData.firstName,
        });

        const newUser: User = {
          id: userCred.user.uid,
          firstName: formData.firstName,
          email: formData.email,
          isPaid: false,
          registrationStep: 'verifying',
          createdAt: Date.now(),
          ipAddress: ipAddress
        };
        setStep('verifying');
      } catch (err: any) {
        setError(err.message || "Failed to initiate registration.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResendEmail = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError(null);
    try {
      await sendEmailVerification(auth.currentUser, actionCodeSettings);
      setSuccess("Verification email resent!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    setError(null);

    try {
      await updateMe({
        last_name: formData.lastName,
        zip: formData.zip,
        phone: formData.phone,
        country_code: formData.countryCode,
        registration_step: 'complete'
      });

      const userData = await getMe() as any;
      onComplete({
        id: userData.id || auth.currentUser.uid,
        firstName: userData.first_name || auth.currentUser.displayName || 'User',
        lastName: userData.last_name,
        email: userData.email || auth.currentUser.email || '',
        isPaid: userData.tier !== 'free',
        registrationStep: 'complete',
        createdAt: userData.created_at ? new Date(userData.created_at).getTime() : Date.now(),
      });
    } catch (err: any) {
      setError(err.message || "Failed to finalize profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-[2.5rem] w-full max-w-5xl h-auto min-h-[60vh] md:max-h-[85vh] shadow-[0_0_100px_rgba(16,185,129,0.15)] flex flex-col md:flex-row overflow-hidden relative animate-in fade-in zoom-in-95 duration-300">
        
        <div className={clsx(
          "hidden md:flex md:w-1/3 p-12 flex-col justify-between transition-colors duration-700",
          step === 'complete' ? "bg-indigo-600" : (step === 'verifying' || isForgotPassword) ? "bg-amber-500" : "bg-emerald-500"
        )}>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              {(step === 'verifying' || isForgotPassword) ? (
                <Send className={clsx("w-6 h-6 text-amber-500")} />
              ) : (
                <ShieldCheck className={clsx("w-6 h-6 transition-colors", step === 'complete' ? "text-indigo-600" : "text-emerald-500")} />
              )}
            </div>
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-700">
              <h2 className={clsx("text-3xl font-black leading-tight italic", (step === 'complete' || step === 'verifying' || isForgotPassword) ? "text-white" : "text-slate-950")}>
                {isForgotPassword ? "Reset Access" : step === 'verifying' ? "Verify Email" : step === 'complete' ? "Almost Ready" : "Join the Elite."}
              </h2>
              <p className={clsx("font-bold text-sm leading-relaxed", (step === 'complete' || step === 'verifying' || isForgotPassword) ? "text-white/80" : "text-emerald-950/70")}>
                {isForgotPassword 
                  ? "Lost your credentials? No problem. We'll send a secure link to reset your quant node access."
                  : step === 'verifying' 
                  ? "We've sent a secure magic link to your inbox. Click it to verify your account and unlock Step 2."
                  : step === 'complete'
                  ? "Your email is confirmed. Now, let's finalize your quant node setup."
                  : "Enter the OddsAxiom ecosystem and access cross-platform arbitrage scanning."
                }
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className={clsx("p-4 rounded-2xl border border-white/20 transition-colors", step === 'complete' ? "bg-indigo-700" : (step === 'verifying' || isForgotPassword) ? "bg-amber-600" : "bg-emerald-600")}>
               <p className={clsx("font-black text-[10px] uppercase tracking-widest mb-1", (step === 'complete' || step === 'verifying' || isForgotPassword) ? "text-white/60" : "text-emerald-950")}>Session Trace</p>
               <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-white/60" />
                  <span className="text-xs font-bold text-white font-mono">{ipAddress}</span>
               </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 md:p-16 relative overflow-y-auto bg-slate-900 flex flex-col justify-center">
          <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
          
          <div className="max-w-md mx-auto w-full">
            {step === 'lead' && !isForgotPassword && (
              <form onSubmit={handleLeadSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h3 className="text-4xl font-black text-white tracking-tight">
                    {authMode === 'signup' ? "Access Dashboard" : "Welcome Back"}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-slate-400 font-medium text-sm">
                      {authMode === 'signup' ? "Create your credentials." : "Sign in to your account."}
                    </p>
                    <button 
                      type="button" 
                      onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                      className="text-emerald-400 font-bold hover:underline text-sm"
                    >
                      {authMode === 'signup' ? "Sign In Instead" : "Sign Up Instead"}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">First Name</label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input required type="text" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-4 text-white focus:border-emerald-500 transition-all outline-none" placeholder="First Name"/>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-4 text-white focus:border-emerald-500 transition-all outline-none" placeholder="Email Address"/>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input required type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-4 text-white focus:border-emerald-500 transition-all outline-none" placeholder="Minimum 6 characters"/>
                    </div>
                    {authMode === 'signin' && (
                      <div className="flex justify-end">
                        <button 
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-xs font-bold text-red-500">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">
                  {loading ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <>{authMode === 'signup' ? "Send Magic Link" : "Sign In"} <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            )}

            {isForgotPassword && (
              <form onSubmit={handleForgotPassword} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <button 
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest mb-4"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Sign In
                  </button>
                  <h3 className="text-4xl font-black text-white tracking-tight">Recover Access</h3>
                  <p className="text-slate-400 font-medium text-sm">Enter your email and we'll send you a password reset link.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-4 text-white focus:border-amber-500 transition-all outline-none" placeholder="Email Address"/>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-xs font-bold text-red-500">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <p className="text-xs font-bold text-emerald-500">{success}</p>
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2">
                  {loading ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <>Send Reset Link <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            )}

            {step === 'verifying' && !isForgotPassword && (
              <div className="space-y-8 text-center animate-in zoom-in-95 fade-in duration-500">
                <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-amber-500/5 relative">
                   <Mail className="w-10 h-10 text-amber-400 animate-bounce" />
                   <div className="absolute -top-1 -right-1">
                      <div className="w-4 h-4 bg-amber-500 rounded-full animate-ping"></div>
                   </div>
                </div>
                <div className="space-y-3">
                   <h3 className="text-3xl font-black text-white">Check Your Inbox</h3>
                   <p className="text-slate-400 text-sm leading-relaxed px-4">
                     We've sent a verification link to <span className="text-white font-bold">{formData.email || auth.currentUser?.email}</span>. Click the link in the email to automatically proceed to Step 2.
                   </p>
                </div>
                
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                     <LoaderCircle className="w-3 h-3 animate-spin" />
                     Waiting for verification...
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleResendEmail} 
                      disabled={loading} 
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
                    >
                      {loading ? "Sending..." : "Didn't get the email? Resend link"}
                    </button>
                    {success && (
                      <div className="text-[10px] font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" /> {success}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 'complete' && !isForgotPassword && (
              <form onSubmit={handleFinalSubmit} className="space-y-6 animate-in slide-in-from-right-8 duration-500 pb-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded border border-emerald-500/20 uppercase">Email Verified</div>
                  </div>
                  <h3 className="text-3xl font-black text-white">Final Details</h3>
                  <p className="text-slate-400 text-sm">Welcome to the inner circle. Let's finish your profile.</p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Last Name</label>
                    <input required type="text" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-white focus:border-indigo-500 transition-all outline-none" placeholder="e.g. Smith" />
                  </div>
                  <div className="flex flex-col sm:grid sm:grid-cols-3 gap-5">
                    <div className="sm:col-span-1 space-y-1.5">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Zip Code</label>
                      <input required type="text" value={formData.zip} onChange={(e) => setFormData({...formData, zip: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-white focus:border-indigo-500 transition-all outline-none" placeholder="90210" />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Phone Number</label>
                      <div className="flex bg-slate-950 border border-slate-800 rounded-xl overflow-hidden focus-within:border-indigo-500 transition-all">
                        <select 
                          value={formData.countryCode} 
                          onChange={(e) => setFormData({...formData, countryCode: e.target.value})} 
                          className="bg-slate-800 text-white text-[10px] font-bold px-3 outline-none border-r border-slate-700 appearance-none cursor-pointer hover:bg-slate-700 max-w-[120px]"
                        >
                          {ALL_COUNTRY_CODES.map(c => (
                            <option key={`${c.name}-${c.code}`} value={c.code}>{c.name} {c.code}</option>
                          ))}
                        </select>
                        <input required type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-transparent px-4 py-4 text-white outline-none" placeholder="Number" />
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-xs font-bold text-red-500">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all shadow-xl shadow-indigo-600/20">
                  {loading ? <LoaderCircle className="w-5 h-5 animate-spin mx-auto" /> : "Complete Registration"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
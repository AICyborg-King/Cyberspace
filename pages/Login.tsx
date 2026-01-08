import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Fingerprint, Lock, ShieldCheck } from 'lucide-react';
import { isBiometricsSupported, registerBiometric, verifyBiometric } from '../services/biometrics';

const Login: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [enableBio, setEnableBio] = useState(false);
  const [canUseBio, setCanUseBio] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { login, storedUserExists, loginWithStoredUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkBio = async () => {
      const supported = await isBiometricsSupported();
      setCanUseBio(supported);
    };
    checkBio();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email) {
      setIsProcessing(true);
      
      let bioSuccess = false;
      if (enableBio && canUseBio) {
        bioSuccess = await registerBiometric(email, name);
        if (!bioSuccess) {
           alert("Biometric setup failed, but we'll log you in anyway.");
        }
      }

      // Send data to Formspree (Background)
      try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        fetch("https://formspree.io/f/meeobwng", {
          method: "POST",
          body: formData,
          headers: { 'Accept': 'application/json' }
        }).catch(err => console.log(err)); // Silent fail
      } catch (error) {
        // Ignore
      }

      login(name, email, bioSuccess);
      setIsProcessing(false);
      navigate('/dashboard');
    }
  };

  const handleBiometricLogin = async () => {
    setIsProcessing(true);
    const verified = await verifyBiometric();
    if (verified) {
      loginWithStoredUser();
      navigate('/dashboard');
    } else {
      alert("Verification failed. Please use your name and email.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 md:p-12">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center transform -rotate-6 shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-3xl">E</span>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center text-slate-900 mb-2">Welcome to EDUFLY</h1>
        <p className="text-center text-slate-500 mb-8">Your intelligent study companion.</p>

        {/* Biometric Quick Login */}
        {storedUserExists && canUseBio && (
          <div className="mb-8">
            <button
              onClick={handleBiometricLogin}
              disabled={isProcessing}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-lg"
            >
              {isProcessing ? <span className="animate-pulse">Verifying...</span> : (
                <>
                  <Fingerprint size={24} className="text-emerald-400" />
                  <span>Unlock with Fingerprint</span>
                </>
              )}
            </button>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Or sign in manually</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              placeholder="Student Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              placeholder="student@school.edu"
            />
          </div>

          {canUseBio && (
            <div className="flex items-center p-3 bg-indigo-50 rounded-xl border border-indigo-100 cursor-pointer" onClick={() => setEnableBio(!enableBio)}>
              <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${enableBio ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                {enableBio && <ShieldCheck size={14} className="text-white" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  Enable Fingerprint Login <Fingerprint size={16} className="text-indigo-500" />
                </p>
                <p className="text-xs text-slate-500">Securely log in next time without typing.</p>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 mt-4 shadow-lg shadow-indigo-200"
          >
            <span>{isProcessing ? 'Processing...' : 'Get Started'}</span>
            <ArrowRight size={20} />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
           <div className="flex items-center justify-center space-x-2 text-slate-400 text-sm">
             <BookOpen size={16} />
             <span>Learn smarter, not harder.</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
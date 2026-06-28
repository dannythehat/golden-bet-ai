import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

import { HomeSection } from '@/components/sections/HomeSection';

// Lazy-load non-default sections and modals
const SignUpPromptModal = lazy(() => import('@/components/SignUpPromptModal').then(m => ({ default: m.SignUpPromptModal })));

// Lazy-load non-home sections to reduce initial JS bundle blocking LCP
const AboutSection = lazy(() => import('@/components/sections/AboutSection').then(m => ({ default: m.AboutSection })));

type Section = 'home' | 'about';

const validSections: Section[] = ['home', 'about'];

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Show sign-up prompt for non-authenticated users after a delay
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  
  // Get section from URL hash, default to 'home'
  const getSectionFromHash = useCallback((): Section => {
    const hash = location.hash.replace('#', '');
    return validSections.includes(hash as Section) ? (hash as Section) : 'home';
  }, [location.hash]);

  const [activeSection, setActiveSection] = useState<Section>(() => {
    // Initialize from URL hash on first load
    const hash = (window.location.hash || '').replace('#', '');
    return validSections.includes(hash as Section) ? (hash as Section) : 'home';
  });
  
  // Show sign-up prompt after 30 seconds for non-authenticated users (once per 24h)
  useEffect(() => {
    if (user) return; // Don't show if logged in
    
    // Check if seen in last 24 hours
    const lastSeen = localStorage.getItem('signUpPromptLastSeen');
    if (lastSeen) {
      const hoursSince = (Date.now() - parseInt(lastSeen)) / (1000 * 60 * 60);
      if (hoursSince < 24) return; // Don't show if seen in last 24 hours
    }
    
    const timer = setTimeout(() => {
      setShowSignUpPrompt(true);
      localStorage.setItem('signUpPromptLastSeen', Date.now().toString());
    }, 30000);
    
    return () => clearTimeout(timer);
  }, [user]);

  // Update section when hash changes (e.g., browser back/forward)
  useEffect(() => {
    const newSection = getSectionFromHash();
    // Only update if actually different to avoid unnecessary re-renders
    setActiveSection(prev => prev !== newSection ? newSection : prev);
  }, [getSectionFromHash]);

  // Update URL hash when section changes
  const handleSectionChange = useCallback((section: Section) => {
    const newHash = section === 'home' ? '' : `#${section}`;
    const currentHash = window.location.hash;
    // Only navigate if hash actually changes - prevents refresh loops
    if (currentHash !== newHash) {
      setActiveSection(section);
      navigate(section === 'home' ? '/' : `/#${section}`, { replace: true });
    } else {
      setActiveSection(section);
    }
  }, [navigate]);

  // Scroll to top when section changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-background sparkle-bg relative overflow-hidden flex flex-col">
      {/* Premium background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      <Navigation 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange} 
      />
      
      <main className="relative container mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-24 flex-1">
        <Suspense fallback={<div style={{ minHeight: '60vh' }} className="flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
          {activeSection === 'home' && <HomeSection onNavigate={(section) => handleSectionChange(section as Section)} />}
          {activeSection === 'about' && <AboutSection />}
        </Suspense>
      </main>

      <Footer />
      
      {/* Sign-up prompt modal for non-authenticated users */}
      <Suspense fallback={null}>
        <SignUpPromptModal 
          open={showSignUpPrompt} 
          onOpenChange={setShowSignUpPrompt} 
        />
      </Suspense>
    </div>
  );
};

export default Index;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";

// PROFESSIONAL LUNADX UI - Working Version
const theme = {
  primary: '#0f4c75',
  accent: '#d97706',
  background: '#f8fafc',
  text: '#1e293b',
  textLight: '#64748b',
  white: '#ffffff',
  border: '#e2e8f0'
};

// Navigation Component
function Nav() {
  return (
    <nav style={{ 
      position: 'fixed', 
      top: 0, 
      width: '100%', 
      backgroundColor: 'rgba(255,255,255,0.95)', 
      backdropFilter: 'blur(10px)',
      borderBottom: `1px solid ${theme.border}`,
      zIndex: 50
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: theme.primary, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: '20px' }}>🏥</span>
            </div>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: theme.text }}>LunaDX</span>
          </div>
        </Link>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <button style={{ 
              padding: '8px 16px', 
              backgroundColor: 'transparent', 
              border: 'none', 
              color: theme.textLight,
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              Sign In
            </button>
          </Link>
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <button style={{ 
              padding: '8px 16px', 
              backgroundColor: theme.accent, 
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Get Started →
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, desc }) {
  return (
    <div style={{ 
      backgroundColor: theme.white, 
      padding: '24px', 
      borderRadius: '12px',
      border: `1px solid ${theme.border}`,
      textAlign: 'center'
    }}>
      <div style={{ 
        width: '48px', 
        height: '48px', 
        backgroundColor: `${theme.primary}15`, 
        borderRadius: '12px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        margin: '0 auto 16px'
      }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
      </div>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: theme.text }}>{title}</h3>
      <p style={{ fontSize: '14px', color: theme.textLight, lineHeight: '1.5' }}>{desc}</p>
    </div>
  );
}

// Landing Page
function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.background, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Nav />
      
      {/* Hero Section */}
      <section style={{ paddingTop: '128px', paddingBottom: '80px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '6px 12px', 
            backgroundColor: `${theme.primary}10`, 
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500',
            marginBottom: '24px',
            color: theme.primary
          }}>
            <span>⚡</span> AI-Assisted Clinical Screening
          </div>
          
          <h1 style={{ 
            fontSize: '48px', 
            fontWeight: '800', 
            lineHeight: '1.1',
            marginBottom: '24px',
            color: theme.text
          }}>
            Faster lung disease screening where it matters most
          </h1>
          
          <p style={{ 
            fontSize: '18px', 
            color: theme.textLight, 
            lineHeight: '1.6',
            marginBottom: '32px'
          }}>
            LunaDX helps clinicians in resource-limited settings upload chest X-rays and receive AI-supported risk assessments for tuberculosis and pneumonia — in under 30 seconds.
          </p>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <button style={{ 
                padding: '14px 28px', 
                backgroundColor: theme.accent, 
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                Start Screening →
              </button>
            </Link>
            <button style={{ 
              padding: '14px 28px', 
              backgroundColor: 'white', 
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}>
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '40px 0', borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: theme.primary }}>&lt; 30s</div>
            <div style={{ fontSize: '14px', color: theme.textLight }}>Analysis Time</div>
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: theme.primary }}>95%+</div>
            <div style={{ fontSize: '14px', color: theme.textLight }}>Sensitivity Target</div>
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: theme.primary }}>24/7</div>
            <div style={{ fontSize: '14px', color: theme.textLight }}>Availability</div>
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: theme.primary }}>PDF</div>
            <div style={{ fontSize: '14px', color: theme.textLight }}>Report Export</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', textAlign: 'center', marginBottom: '48px', color: theme.text }}>
            Everything you need for clinical screening
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            <FeatureCard icon="📤" title="X-Ray Upload" desc="Upload chest X-ray images in JPG, PNG, or DICOM format and link them to patient records instantly." />
            <FeatureCard icon="🤖" title="AI-Powered Analysis" desc="Get real-time risk assessments for tuberculosis, pneumonia, and other lung abnormalities." />
            <FeatureCard icon="🗺️" title="Heatmap Visualization" desc="Visual heatmap overlays highlight suspicious lung regions for faster clinical interpretation." />
            <FeatureCard icon="📄" title="Clinical Reports" desc="Auto-generated structured reports with findings, risk classification, and suggested next steps." />
            <FeatureCard icon="👥" title="Patient Management" desc="Create and manage patient profiles, track visit history, and organize screening workflows." />
            <FeatureCard icon="🔒" title="Secure & Compliant" desc="Role-based access control with secure image storage designed for clinical environments." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px 24px', textAlign: 'center', borderTop: `1px solid ${theme.border}` }}>
        <p style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '800px', margin: '0 auto' }}>
          <strong>Disclaimer:</strong> LunaDX is an AI-assisted screening tool and does not provide definitive medical diagnoses. All results must be reviewed by a qualified healthcare professional.
        </p>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '16px' }}>
          © 2026 LunaDX. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

// Login Page
function LoginPage() {
  const navigate = useNavigate();
  
  const handleLogin = (e) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
      <div style={{ backgroundColor: theme.white, padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: theme.primary, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <span style={{ color: 'white', fontSize: '24px' }}>🏥</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: theme.text }}>Welcome to LunaDX</h1>
          <p style={{ color: theme.textLight, marginTop: '8px' }}>Sign in to access the platform</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: theme.text }}>Email</label>
            <input type="email" defaultValue="admin@lunadx.com" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: '6px', fontSize: '14px' }} />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: theme.text }}>Password</label>
            <input type="password" defaultValue="admin123" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: '6px', fontSize: '14px' }} />
          </div>
          <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: theme.accent, color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
            Sign In
          </button>
        </form>
        
        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
          <p style={{ fontSize: '12px', color: '#0369a1', marginBottom: '8px' }}><strong>Demo Accounts:</strong></p>
          <p style={{ fontSize: '12px', color: theme.textLight }}>admin@lunadx.com / admin123</p>
          <p style={{ fontSize: '12px', color: theme.textLight }}>doctor@lunadx.com / doctor123</p>
          <p style={{ fontSize: '12px', color: theme.textLight }}>clinician@lunadx.com / clinician123</p>
        </div>
      </div>
    </div>
  );
}

// Simple Dashboard Placeholder
function DashboardPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.background }}>
      <Nav />
      <div style={{ paddingTop: '80px', padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: theme.text, marginBottom: '24px' }}>Dashboard</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          <div style={{ backgroundColor: theme.white, padding: '24px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
            <h3 style={{ color: theme.textLight, fontSize: '14px' }}>Total Patients</h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: theme.text }}>24</p>
          </div>
          <div style={{ backgroundColor: theme.white, padding: '24px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
            <h3 style={{ color: theme.textLight, fontSize: '14px' }}>Scans Today</h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: theme.text }}>8</p>
          </div>
          <div style={{ backgroundColor: theme.white, padding: '24px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
            <h3 style={{ color: theme.textLight, fontSize: '14px' }}>Pending Review</h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: theme.text }}>3</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

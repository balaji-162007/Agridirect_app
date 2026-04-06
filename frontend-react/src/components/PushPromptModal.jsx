import React from 'react';

const PushPromptModal = ({ isOpen, onAccept, onDecline }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '24px',
        padding: '32px',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        animation: 'modalSlideUp 0.3s ease-out'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔔</div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>
          Don't Miss Out!
        </h3>
        <p style={{ color: 'var(--gray-600)', marginBottom: '24px', lineHeight: '1.6' }}>
          Enable device alerts to get instant updates on your orders and market prices, even when the app is closed.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={onAccept}
            style={{
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--green-600)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'transform 0.2s'
            }}
            onMouseOver={e => e.target.style.transform = 'scale(1.02)'}
            onMouseOut={e => e.target.style.transform = 'scale(1)'}
          >
            Yes, Enable Alerts
          </button>
          <button 
            onClick={onDecline}
            style={{
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid var(--gray-200)',
              background: 'transparent',
              color: 'var(--gray-500)',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Not Now
          </button>
        </div>
      </div>
      <style>{`
        @keyframes modalSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PushPromptModal;

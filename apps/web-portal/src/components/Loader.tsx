import React from 'react';

export default function Loader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '60vh', 
      alignItems: 'center', 
      justifyContent: 'center',
      animation: 'fadeIn 0.3s ease-out forwards'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '4px solid var(--accent-primary-light)',
        borderBottomColor: 'var(--accent-primary)',
        borderRadius: '50%',
        display: 'inline-block',
        boxSizing: 'border-box',
        animation: 'rotation 1s linear infinite',
        marginBottom: '16px'
      }}></div>
      <p style={{ color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>{message}</p>
      <style>{`
        @keyframes rotation {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

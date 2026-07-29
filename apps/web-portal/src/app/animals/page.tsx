export default function Animals() {
  return (
    <div className="animate-fade-in delay-1">
      <header style={{ marginBottom: '32px' }}>
        <h1>Livestock Registry</h1>
        <p style={{ color: 'var(--text-muted)' }}>Track individual animals, their health status, and tags.</p>
      </header>
      
      <div className="glass-panel animate-fade-in delay-2">
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa fa-paw" style={{ fontSize: '3rem', display: 'block', marginBottom: '16px', color: 'var(--accent-primary)' }}></i>
          <h2>Animals Module Coming Soon</h2>
          <p>This module will allow scanning RFID tags and registering new livestock.</p>
        </div>
      </div>
    </div>
  );
}

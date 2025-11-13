'use client';

import { useState } from 'react';

export default function CapsulePage() {
  const [capsule, setCapsule] = useState('');

  return (
    <main>
      <h1>Capsule Viewer</h1>
      <p>Paste a Fireseed capsule payload to inspect its structure.</p>
      <textarea
        value={capsule}
        onChange={(event) => setCapsule(event.target.value)}
        placeholder="Paste capsule JSON here"
        style={{ width: '100%', minHeight: '16rem', padding: '1rem', borderRadius: '0.75rem' }}
      />
      <pre style={{ marginTop: '1.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{capsule}</pre>
    </main>
  );
}

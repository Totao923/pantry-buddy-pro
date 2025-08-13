import React from 'react';

export default function DeploymentTest() {
  const deploymentInfo = {
    version: '1.0.1',
    timestamp: new Date().toISOString(),
    commitHash: 'acf97fc',
    buildDate: '2025-08-13',
    analyticsFixIncluded: true,
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Deployment Test Page</h1>
      <pre>{JSON.stringify(deploymentInfo, null, 2)}</pre>
      <p>If you can see this page with version 1.0.1 and commit acf97fc, the deployment is working.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
    </div>
  );
}
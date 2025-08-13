import React, { useEffect } from 'react';

export default function RedirectCheck() {
  useEffect(() => {
    const currentUrl = window.location.hostname;

    // If we're on the problematic URLs, redirect to the working one
    if (
      currentUrl === 'pantry-buddy-pro.vercel.app' ||
      currentUrl === 'pantry-buddy-pro-git-main-totao923s-projects.vercel.app'
    ) {
      // Find the working deployment URL (you'll need to update this)
      const workingUrl = 'https://pantry-buddy-mcd2ysugg-totao923s-projects.vercel.app';

      // Only redirect if dashboard is not loading
      setTimeout(() => {
        const dashboardElements = document.querySelector('[data-dashboard-loaded]');
        if (!dashboardElements) {
          console.log('Dashboard not loading, redirecting to working URL...');
          window.location.href = workingUrl + window.location.pathname + window.location.search;
        }
      }, 3000);
    }
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Checking Deployment Status</h1>
      <p>Verifying which deployment URL is serving the latest code...</p>
      <p>
        If the dashboard doesn't load within 3 seconds, you'll be redirected to the working
        deployment.
      </p>
      <p>
        Current URL:{' '}
        <code>{typeof window !== 'undefined' ? window.location.hostname : 'Loading...'}</code>
      </p>
    </div>
  );
}

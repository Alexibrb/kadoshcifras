
'use client';
import React from 'react';

// Layout minimalista para o modo offline, sem header ou footer.
export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

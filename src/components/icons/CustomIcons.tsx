import React from 'react';

interface CustomIconProps {
  className?: string;
  size?: number;
}

// Custom medical icons to replace any Lovable branding
export const MedicalIcon: React.FC<CustomIconProps> = ({ className, size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M12 2L2 7v10c0 1.1.9 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2H2C.9 2 2 2.9 2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zM2 4h16v10H2V4h16z" 
      fill="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const BrainIcon: React.FC<CustomIconProps> = ({ className, size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2V7zm0 8h2v2h-2v-2z" 
      fill="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const HeartIcon: React.FC<CustomIconProps> = ({ className, size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M20.84 4.61a5.5 5.5 0 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0 0-7.78 0L4.61 14.59a5.5 5.5 0 0 0 0 0 7.78l1.06 1.06L12 19.34l1.06-1.06a5.5 5.5 0 0 0 0 7.78l7.78-7.78z" 
      fill="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const ShieldIcon: React.FC<CustomIconProps> = ({ className, size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M12 1L3 5v6c0 1.1.9 2 2 2h1v7c0 1.1.9 2 2 2h1v1c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-1h1c1.1 0 2-.9 2-2v-7c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2H4v7c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-1h1c1.1 0 2-.9 2-2v-7c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2H4v7c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-1h1c1.1 0 2-.9 2-2v-7c0-1.1-.9-2-2-2H5z" 
      fill="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const ActivityIcon: React.FC<CustomIconProps> = ({ className, size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M22 12h-4l-3 9L9 3l-3 9H2" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const UploadIcon: React.FC<CustomIconProps> = ({ className, size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const FileTextIcon: React.FC<CustomIconProps> = ({ className, size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4v4a2 2 0 0 0 2 2z" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const UsersIcon: React.FC<CustomIconProps> = ({ className, size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M21 11V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2z" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const AlertTriangleIcon: React.FC<CustomIconProps> = ({ className, size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M10.29 3.86L1.82 18a2 2 0 0 0-1.71 3l8.47-14.14A2 2 0 0 1 12.14 2l8.47 14.14a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9l-2 2h4l-2-2z" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

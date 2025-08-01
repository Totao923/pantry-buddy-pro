import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  height?: string;
  width?: string;
  rounded?: boolean;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  height = 'h-4',
  width = 'w-full',
  rounded = true,
}) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 ${height} ${width} ${
        rounded ? 'rounded' : ''
      } ${className}`}
    />
  );
};

export const RecipeCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden w-full max-w-4xl mx-auto">
      {/* Hero Section Skeleton */}
      <div className="relative bg-gradient-to-r from-gray-300 to-gray-400 p-4 md:p-8">
        <div className="pr-16 md:pr-20">
          <LoadingSkeleton height="h-8" width="w-3/4" className="mb-2" />
          <LoadingSkeleton height="h-5" width="w-full" className="mb-4" />

          <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4">
            <LoadingSkeleton height="h-6" width="w-20" rounded />
            <LoadingSkeleton height="h-6" width="w-24" rounded />
            <LoadingSkeleton height="h-6" width="w-16" rounded />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <LoadingSkeleton key={i} height="h-5" width="w-5" rounded />
              ))}
            </div>
            <LoadingSkeleton height="h-4" width="w-24" />
          </div>
        </div>
      </div>

      {/* Servings Control Skeleton */}
      <div className="px-4 md:px-8 py-4 md:py-6 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <LoadingSkeleton height="h-6" width="w-20" />
            <LoadingSkeleton height="h-10" width="w-32" rounded />
          </div>
          <LoadingSkeleton height="h-12" width="w-32" rounded />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="px-4 md:px-8 py-4 bg-white border-b border-gray-200">
        <div className="flex gap-1">
          {[...Array(4)].map((_, i) => (
            <LoadingSkeleton key={i} height="h-10" width="w-24" rounded />
          ))}
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="px-4 md:px-8 py-6">
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <LoadingSkeleton height="h-4" width="w-4" rounded />
              <LoadingSkeleton height="h-4" width="w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <LoadingSkeleton height="h-6" width="w-3/4" className="mb-2" />
          <LoadingSkeleton height="h-4" width="w-1/2" />
        </div>
        <div className="flex gap-2">
          <LoadingSkeleton height="h-8" width="w-8" rounded />
          <LoadingSkeleton height="h-8" width="w-8" rounded />
        </div>
      </div>

      <LoadingSkeleton height="h-4" width="w-2/3" className="mb-2" />
      <LoadingSkeleton height="h-4" width="w-1/2" className="mb-3" />

      <div className="flex flex-wrap gap-2">
        <LoadingSkeleton height="h-6" width="w-16" rounded />
        <LoadingSkeleton height="h-6" width="w-12" rounded />
      </div>
    </div>
  );
};

export const GridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
};

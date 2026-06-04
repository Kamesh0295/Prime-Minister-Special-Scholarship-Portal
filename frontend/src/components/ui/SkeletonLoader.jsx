import React from 'react';

export const SkeletonCard = () => (
  <div className="card p-5 space-y-4 animate-pulse">
    <div className="skeleton h-4 w-1/3 rounded" />
    <div className="skeleton h-8 w-1/2 rounded" />
    <div className="skeleton h-3 w-full rounded" />
    <div className="skeleton h-3 w-4/5 rounded" />
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="card overflow-hidden">
    <div className="skeleton h-12 w-full rounded-none" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-gray-50">
        <div className="skeleton h-4 w-1/5 rounded" />
        <div className="skeleton h-4 w-1/4 rounded" />
        <div className="skeleton h-4 w-1/6 rounded" />
        <div className="skeleton h-4 w-1/6 rounded" />
        <div className="skeleton h-4 w-20 rounded-full" />
        <div className="skeleton h-4 w-16 rounded" />
      </div>
    ))}
  </div>
);

export const SkeletonStats = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="card p-5 space-y-3 animate-pulse">
        <div className="flex justify-between">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-9 w-9 rounded-xl" />
        </div>
        <div className="skeleton h-8 w-16 rounded" />
        <div className="skeleton h-3 w-32 rounded" />
      </div>
    ))}
  </div>
);

const SkeletonLoader = ({ type = 'card', rows }) => {
  if (type === 'table') return <SkeletonTable rows={rows} />;
  if (type === 'stats') return <SkeletonStats />;
  return <SkeletonCard />;
};

export default SkeletonLoader;

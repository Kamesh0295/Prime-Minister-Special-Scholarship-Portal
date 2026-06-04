import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const StatsCard = ({
  title,
  value,
  icon: Icon,
  iconBg = 'bg-primary-100',
  iconColor = 'text-primary',
  trend,       // number (positive or negative)
  trendLabel,  // e.g. "vs last month"
  onClick,
  className = '',
}) => {
  const trendIcon =
    trend > 0 ? (
      <TrendingUp className="h-3.5 w-3.5 text-green-500" />
    ) : trend < 0 ? (
      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
    ) : (
      <Minus className="h-3.5 w-3.5 text-gray-400" />
    );

  const trendColor =
    trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-400';

  return (
    <div
      className={`card p-5 transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-card-md hover:-translate-y-0.5' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 font-display">{value ?? '—'}</p>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        )}
      </div>

      {(trend !== undefined || trendLabel) && (
        <div className="flex items-center gap-1 mt-3">
          {trend !== undefined && trendIcon}
          <span className={`text-xs font-medium ${trendColor}`}>
            {trend > 0 ? `+${trend}` : trend}
          </span>
          {trendLabel && (
            <span className="text-xs text-gray-400 ml-0.5">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsCard;

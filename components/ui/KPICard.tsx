import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export interface KPICardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ElementType;
  colorClass?: string;
  gradient?: string;
  onClick?: () => void;
  isLoading?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  colorClass = 'bg-blue-500',
  gradient = 'from-blue-500 to-blue-600',
  onClick,
  isLoading = false,
  trend,
  trendValue,
}) => {
  if (isLoading) {
    return (
      <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="w-16 h-6 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="w-24 h-8 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`
        glass-panel p-6 rounded-3xl relative overflow-hidden
        ${onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300' : ''}
      `}
    >
      <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${gradient} opacity-10 blur-3xl rounded-full`} />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          {Icon && (
            <div className={`p-3.5 rounded-2xl ${colorClass} bg-opacity-10 ring-1 ring-inset ring-black/5`}>
              <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
          )}
          {trend && (
            <div className={`flex items-center text-[10px] font-bold px-2 py-1 rounded-full border ${
              trend === 'up'
                ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                : trend === 'down'
                ? 'text-red-600 bg-red-50 border-red-100'
                : 'text-gray-600 bg-gray-50 border-gray-100'
            }`}>
              <ArrowUpRight className={`w-3 h-3 mr-1 ${trend === 'down' ? 'rotate-180' : ''}`} />
              <span>{trendValue || 'Live'}</span>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-3xl font-display font-bold text-gray-900 tracking-tight">
            {value}
          </h3>
          <p className="text-sm font-medium text-gray-500 mt-1">{title}</p>
        </div>

        {subtext && (
          <div className="mt-4 pt-4 border-t border-gray-100/50">
            <span className="text-xs font-semibold text-gray-400">{subtext}</span>
          </div>
        )}
      </div>
    </div>
  );
};

KPICard.displayName = 'KPICard';

export default KPICard;

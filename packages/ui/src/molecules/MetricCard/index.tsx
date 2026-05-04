import { cn } from '../../lib/utils'
import React from 'react'

type Trend = 'up' | 'down' | 'neutral'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: Trend
  className?: string
}

const trendIcon: Record<Trend, React.ReactNode> = {
  up: (
    <svg className="h-3 w-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  ),
  down: (
    <svg className="h-3 w-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  neutral: (
    <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
    </svg>
  ),
}

export const MetricCard = ({ title, value, subtitle, icon, trend, className }: MetricCardProps) => (
  <div className={cn('rounded-xl border border-gray-200 bg-white p-6 shadow-sm', className)}>
    <div className="flex items-start justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {(subtitle || trend) && (
          <div className="flex items-center gap-1">
            {trend && trendIcon[trend]}
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
        )}
      </div>
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
          {icon}
        </div>
      )}
    </div>
  </div>
)

import React from 'react'
import { cn } from '../../lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = ({ className, ...props }: CardProps) => (
  <div
    className={cn('rounded-xl border border-gray-200 bg-white shadow-sm', className)}
    {...props}
  />
)

export const CardHeader = ({ className, ...props }: CardProps) => (
  <div className={cn('flex flex-col gap-1 p-6 pb-4', className)} {...props} />
)

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-base font-semibold text-gray-900', className)} {...props} />
)

export const CardContent = ({ className, ...props }: CardProps) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
)

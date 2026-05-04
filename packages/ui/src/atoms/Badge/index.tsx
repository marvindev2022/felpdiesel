import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'
import React from 'react'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        // Status de OS
        aberta:           'bg-yellow-100 text-yellow-700',
        em_andamento:     'bg-blue-100 text-blue-700',
        aguardando_peca:  'bg-orange-100 text-orange-700',
        pronta:           'bg-green-100 text-green-700',
        entregue:         'bg-gray-100 text-gray-600',
        cancelada:        'bg-red-100 text-red-700',
        // Genéricos
        default:  'bg-gray-100 text-gray-700',
        success:  'bg-green-100 text-green-700',
        warning:  'bg-amber-100 text-amber-700',
        error:    'bg-red-100 text-red-700',
        info:     'bg-blue-100 text-blue-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant, className }))} {...props} />
)

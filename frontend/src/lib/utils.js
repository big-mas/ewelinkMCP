import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatStatus(status) {
  const statusMap = {
    'PENDING': { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    'APPROVED': { label: 'Active', color: 'bg-green-100 text-green-800' },
    'PAUSED': { label: 'Paused', color: 'bg-orange-100 text-orange-800' },
    'SUSPENDED': { label: 'Suspended', color: 'bg-red-100 text-red-800' },
    // Legacy support
    'pending': { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    'active': { label: 'Active', color: 'bg-green-100 text-green-800' },
    'approved': { label: 'Approved', color: 'bg-blue-100 text-blue-800' },
    'suspended': { label: 'Suspended', color: 'bg-red-100 text-red-800' }
  }
  return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
}

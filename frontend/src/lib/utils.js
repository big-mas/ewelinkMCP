import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    return 'Invalid Date';
  }
}

export function formatStatus(status) {
  const statusMap = {
    'APPROVED': { label: 'Active', color: 'bg-green-100 text-green-800' },
    'active': { label: 'Active', color: 'bg-green-100 text-green-800' },
    'PENDING': { label: 'Pending', color: 'bg-orange-100 text-orange-800' },
    'pending': { label: 'Pending', color: 'bg-orange-100 text-orange-800' },
    'SUSPENDED': { label: 'Suspended', color: 'bg-red-100 text-red-800' },
    'suspended': { label: 'Suspended', color: 'bg-red-100 text-red-800' },
    'PAUSED': { label: 'Paused', color: 'bg-yellow-100 text-yellow-800' },
    'paused': { label: 'Paused', color: 'bg-yellow-100 text-yellow-800' },
  };

  return statusMap[status] || { label: status || 'Unknown', color: 'bg-gray-100 text-gray-800' };
}

export function truncateText(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function capitalizeFirstLetter(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}


// Common theme-aware Tailwind classes for consistent styling across the app

export const themeClasses = {
  // Background colors
  bg: {
    primary: 'bg-white dark:bg-gray-900',
    secondary: 'bg-gray-50 dark:bg-gray-800',
    tertiary: 'bg-gray-100 dark:bg-gray-700',
    hover: 'hover:bg-gray-100 dark:hover:bg-gray-700',
  },
  
  // Text colors
  text: {
    primary: 'text-gray-900 dark:text-gray-100',
    secondary: 'text-gray-700 dark:text-gray-300',
    tertiary: 'text-gray-500 dark:text-gray-400',
    muted: 'text-gray-400 dark:text-gray-500',
  },
  
  // Border colors
  border: {
    default: 'border-gray-200 dark:border-gray-700',
    light: 'border-gray-300 dark:border-gray-600',
    focus: 'focus:border-amber-500 dark:focus:border-purple-500',
  },
  
  // Button styles
  button: {
    primary: 'bg-amber-500 dark:bg-purple-600 hover:bg-amber-600 dark:hover:bg-purple-700 text-white',
    secondary: 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100',
    outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
  },
  
  // Card styles
  card: {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg',
    hover: 'hover:shadow-xl transition-shadow duration-200',
  },
  
  // Input styles
  input: {
    default: 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500',
    error: 'border-red-500 focus:ring-red-500',
  },
  
  // Badge/Tag styles
  badge: {
    primary: 'bg-amber-100 dark:bg-purple-900/30 text-amber-800 dark:text-purple-300 border border-amber-300 dark:border-purple-600',
    secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
  },
  
  // Icon colors
  icon: {
    primary: 'text-amber-500 dark:text-purple-400',
    secondary: 'text-gray-500 dark:text-gray-400',
  },
  
  // Link styles
  link: {
    default: 'text-amber-600 dark:text-purple-400 hover:text-amber-700 dark:hover:text-purple-300 underline',
  },
}

// Helper function to combine theme classes
export const cn = (...classes: (string | undefined | false)[]) => {
  return classes.filter(Boolean).join(' ')
}

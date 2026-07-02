export default function LoadingSpinner({ size = 'md' }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return <div className="flex items-center justify-center p-8"><div className={`${sizes[size]} animate-spin rounded-full border-4 border-gray-200 border-t-school-500`} /></div>;
}

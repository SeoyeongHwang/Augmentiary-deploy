import React from 'react'

export default React.forwardRef<HTMLDivElement, {
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void;
  style?: React.CSSProperties;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
}>(function Card(
  {
    children,
    className = '',
    onClick,
    style,
    onMouseEnter,
    onMouseLeave,
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={`bg-white border border-gray-200 rounded-2xl shadow-soft p-6 ${className}`}
      onClick={onClick}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        ...style,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  )
})

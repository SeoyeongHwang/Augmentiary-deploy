import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

const CircleIconButton = ({ children, className = '', ...props }: Props) => (
  <button
    type="button"
    className={`flex h-10 w-10 items-center justify-center rounded-full bg-white drop-shadow-md transition-[background-color,border-color,box-shadow,transform,opacity] duration-150 ease-out enabled:hover:bg-gray-200 enabled:active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default CircleIconButton;

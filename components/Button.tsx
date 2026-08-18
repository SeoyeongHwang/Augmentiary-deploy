export default function Button({
    children,
    onClick,
    className = '',
    type = 'button',
    disabled = false,
    variant = 'default',
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    type?: 'button' | 'submit';
    disabled?: boolean;
    variant?: 'default' | 'stone-primary';
  }) {
    const variantClassName = variant === 'stone-primary'
      ? `rounded-xl text-white transition-[background-color,transform,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 ${
          disabled
            ? 'bg-stone-400 cursor-not-allowed'
            : 'bg-stone-700 hover:bg-stone-800 active:scale-[0.96]'
        }`
      : `rounded-2xl bg-black text-white transition ${
          disabled
            ? 'opacity-50 cursor-not-allowed hover:bg-gray-900'
            : 'hover:bg-gray-900'
        }`

    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`w-fit px-4 py-2 font-semibold shadow-soft ${variantClassName} ${className}`}
      >
        {children}
      </button>
    );
  }

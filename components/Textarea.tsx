import { forwardRef, useRef, useEffect } from 'react';

const Textarea = forwardRef<HTMLTextAreaElement, {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    rows?: number;
    className?: string;
    disabled?: boolean;
  }>(({
    value,
    onChange,
    placeholder,
    rows = 20,
    className = '',
    disabled = false,
  }, ref) => {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    // ref 병합
    const setRefs = (el: HTMLTextAreaElement) => {
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
      innerRef.current = el;
    };

    useEffect(() => {
      const textarea = innerRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }
    }, [value]);

    return (
      <textarea
        ref={setRefs}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        // className={`w-full border border-gray-300 rounded-xl px-6 py-6 text-base leading-8 antialiased font-serif font-normal text-black focus:ring-2 focus:ring-highlight focus:border-highlight transition resize-none placeholder:text-muted scroll-smooth caret-stone-900 ${className}`}
        className={`w-full h-fit p-6 min-h-[60vh] overflow-hidden max-h-none text-base leading-10 antialiased font-serif font-normal text-black focus:outline-none transition resize-none placeholder:text-muted caret-stone-900 ${className}`}
        style={{
          fontFamily: `'Bitter', -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Apple SD Gothic Neo", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", serif`,
        }}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
  
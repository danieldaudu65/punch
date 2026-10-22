import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string;
}

/**
 * Label, input, hint and error wired together for screen readers:
 * the input points at its hint and error with aria-describedby.
 * Password fields get a show/hide toggle.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, type = 'text', className, ...rest },
  ref,
) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const isPassword = type === 'password';
  const [showPassword, setShowPassword] = useState(false);

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={clsx('field', className)}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <input
          ref={ref}
          id={id}
          type={isPassword && showPassword ? 'text' : type}
          className={clsx('field__input', isPassword && 'field__input--with-trailing')}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            className="field__trailing"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error ? (
        <p className="field__error" id={errorId}>
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && (
          <p className="field__hint" id={hintId}>
            {hint}
          </p>
        )
      )}
    </div>
  );
});

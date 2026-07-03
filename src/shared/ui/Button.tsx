import { useFacetState, useFacetUnwrap } from "@react-facet/core";
import type { ButtonHTMLAttributes, PointerEvent, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: ReactNode;
}

export function Button({
  children,
  className = "",
  variant = "primary",
  icon,
  disabled,
  onPointerDown,
  onPointerLeave,
  onPointerUp,
  ...props
}: ButtonProps) {
  const [pressedFacet, setPressed] = useFacetState(false);
  const isPressed = useFacetUnwrap(pressedFacet);

  function press(event: PointerEvent<HTMLButtonElement>) {
    if (!disabled) setPressed(true);
    onPointerDown?.(event);
  }

  function release(event: PointerEvent<HTMLButtonElement>) {
    setPressed(false);
    onPointerUp?.(event);
  }

  function leave(event: PointerEvent<HTMLButtonElement>) {
    setPressed(false);
    onPointerLeave?.(event);
  }

  return (
    <button
      className={`button button--${variant} ${className}`}
      data-ore-pressed={isPressed ? "true" : undefined}
      disabled={disabled}
      onPointerDown={press}
      onPointerLeave={leave}
      onPointerUp={release}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

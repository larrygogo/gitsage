import { type JSX, type Component, Show, splitProps } from "solid-js";
import styles from "./Button.module.css";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  onClick?: (e: MouseEvent) => void;
  children?: JSX.Element;
  fullWidth?: boolean;
  icon?: JSX.Element;
  class?: string;
  type?: "button" | "submit" | "reset";
}

const Button: Component<ButtonProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "variant",
    "size",
    "disabled",
    "loading",
    "onClick",
    "children",
    "fullWidth",
    "icon",
    "class",
    "type",
  ]);

  const variant = () => local.variant ?? "primary";
  const size = () => local.size ?? "md";
  const isDisabled = () => local.disabled || local.loading;

  const classList = () => {
    const classes = [styles.button, styles[variant()], styles[size()]];
    if (local.fullWidth) classes.push(styles.fullWidth);
    if (local.class) classes.push(local.class);
    return classes.filter(Boolean).join(" ");
  };

  return (
    <button
      type={local.type ?? "button"}
      class={classList()}
      disabled={isDisabled()}
      onClick={(e) => {
        if (!isDisabled() && local.onClick) {
          local.onClick(e);
        }
      }}
    >
      <Show when={local.loading}>
        <span class={styles.spinner} />
      </Show>
      <Show when={!local.loading && local.icon}>
        <span class={styles.icon}>{local.icon}</span>
      </Show>
      <Show when={local.children}>
        {local.children}
      </Show>
    </button>
  );
};

export default Button;

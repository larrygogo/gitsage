import { type JSX, type Component, Show, splitProps } from "solid-js";
import styles from "./Input.module.css";

export interface InputProps {
  type?: string;
  value?: string;
  onInput?: (value: string, e: InputEvent) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  prefix?: JSX.Element;
  suffix?: JSX.Element;
  class?: string;
  id?: string;
  name?: string;
  autofocus?: boolean;
  readonly?: boolean;
}

const Input: Component<InputProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "type",
    "value",
    "onInput",
    "placeholder",
    "label",
    "error",
    "disabled",
    "prefix",
    "suffix",
    "class",
    "id",
    "name",
    "autofocus",
    "readonly",
  ]);

  const containerClassList = () => {
    const classes = [styles.inputContainer];
    if (local.error) classes.push(styles.hasError);
    if (local.disabled) classes.push(styles.disabled);
    return classes.join(" ");
  };

  const wrapperClassList = () => {
    const classes = [styles.wrapper];
    if (local.class) classes.push(local.class);
    return classes.join(" ");
  };

  return (
    <div class={wrapperClassList()}>
      <Show when={local.label}>
        <label class={styles.label} for={local.id}>
          {local.label}
        </label>
      </Show>
      <div class={containerClassList()}>
        <Show when={local.prefix}>
          <span class={styles.prefix}>{local.prefix}</span>
        </Show>
        <input
          class={styles.input}
          type={local.type ?? "text"}
          id={local.id}
          name={local.name}
          value={local.value ?? ""}
          placeholder={local.placeholder}
          disabled={local.disabled}
          readonly={local.readonly}
          autofocus={local.autofocus}
          onInput={(e) => {
            local.onInput?.(e.currentTarget.value, e as InputEvent);
          }}
        />
        <Show when={local.suffix}>
          <span class={styles.suffix}>{local.suffix}</span>
        </Show>
      </div>
      <Show when={local.error}>
        <span class={styles.error}>{local.error}</span>
      </Show>
    </div>
  );
};

export default Input;

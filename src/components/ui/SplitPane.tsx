import {
  type JSX,
  type Component,
  createSignal,
  createEffect,
  onCleanup,
  children as resolveChildren,
  For,
  Show,
} from "solid-js";
import styles from "./SplitPane.module.css";

export interface SplitPaneProps {
  /** 分割方向：水平（左右）或垂直（上下） */
  direction?: "horizontal" | "vertical";
  /** 各面板初始尺寸百分比，总和应为 100 */
  initialSizes?: number[];
  /** 面板最小尺寸（px） */
  minSize?: number;
  /** 子元素，每个子元素会被放入独立的面板中 */
  children?: JSX.Element;
  /** 尺寸变化回调，参数为各面板百分比数组 */
  onResize?: (sizes: number[]) => void;
  /** 容器自定义 class */
  class?: string;
}

const SplitPane: Component<SplitPaneProps> = (props) => {
  const direction = () => props.direction ?? "horizontal";
  const minSize = () => props.minSize ?? 50;

  // 将 children 解析为数组
  const resolved = resolveChildren(() => props.children);
  const childArray = () => {
    const c = resolved();
    return Array.isArray(c) ? c.filter(Boolean) : c ? [c] : [];
  };

  // 面板尺寸（百分比）
  const getInitialSizes = (): number[] => {
    const count = childArray().length;
    if (count === 0) return [];
    if (props.initialSizes && props.initialSizes.length === count) {
      return [...props.initialSizes];
    }
    // 均等分配
    const avg = 100 / count;
    return Array.from({ length: count }, () => avg);
  };

  const [sizes, setSizes] = createSignal<number[]>(getInitialSizes());
  const [dragging, setDragging] = createSignal<number | null>(null);

  let containerRef: HTMLDivElement | undefined;

  // 当 children 数量变化时，重新计算初始尺寸
  createEffect(() => {
    const count = childArray().length;
    const currentSizes = sizes();
    if (count !== currentSizes.length) {
      setSizes(getInitialSizes());
    }
  });

  // 通知外部 resize
  createEffect(() => {
    const currentSizes = sizes();
    props.onResize?.(currentSizes);
  });

  /**
   * 获取容器在拖拽方向上的总像素长度
   */
  const getContainerSize = (): number => {
    if (!containerRef) return 0;
    return direction() === "horizontal"
      ? containerRef.clientWidth
      : containerRef.clientHeight;
  };

  /**
   * 获取鼠标在拖拽方向上的坐标
   */
  const getMousePos = (e: MouseEvent): number => {
    return direction() === "horizontal" ? e.clientX : e.clientY;
  };

  /**
   * 开始拖拽
   * @param index 被拖拽的分割线索引（第 index 条分割线位于第 index 和 index+1 面板之间）
   */
  const handleMouseDown = (index: number, e: MouseEvent) => {
    e.preventDefault();
    setDragging(index);

    const startPos = getMousePos(e);
    const containerSize = getContainerSize();
    const startSizes = [...sizes()];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = getMousePos(moveEvent) - startPos;
      const deltaPct = (delta / containerSize) * 100;

      const newSizes = [...startSizes];
      const minPct = (minSize() / containerSize) * 100;

      // 调整相邻两个面板的尺寸
      let newLeft = startSizes[index] + deltaPct;
      let newRight = startSizes[index + 1] - deltaPct;

      // 限制最小尺寸
      if (newLeft < minPct) {
        newLeft = minPct;
        newRight = startSizes[index] + startSizes[index + 1] - minPct;
      }
      if (newRight < minPct) {
        newRight = minPct;
        newLeft = startSizes[index] + startSizes[index + 1] - minPct;
      }

      newSizes[index] = newLeft;
      newSizes[index + 1] = newRight;

      setSizes(newSizes);
    };

    const handleMouseUp = () => {
      setDragging(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // 清理：组件卸载时确保不会遗留事件
  onCleanup(() => {
    setDragging(null);
  });

  const containerClass = () => {
    const classes = [styles.container, styles[direction()]];
    if (props.class) classes.push(props.class);
    return classes.filter(Boolean).join(" ");
  };

  return (
    <div ref={containerRef} class={containerClass()}>
      {/* 拖拽中的全屏遮罩，防止 iframe 等捕获鼠标事件 */}
      <Show when={dragging() !== null}>
        <div
          class={`${styles.overlay} ${styles[direction()]}`}
        />
      </Show>

      <For each={childArray()}>
        {(child, i) => {
          const isLast = () => i() === childArray().length - 1;
          const paneStyle = (): JSX.CSSProperties => {
            const s = sizes();
            const pct = s[i()] ?? 0;
            if (direction() === "horizontal") {
              return { width: `${pct}%`, height: "100%" };
            }
            return { height: `${pct}%`, width: "100%" };
          };

          return (
            <>
              <div class={styles.pane} style={paneStyle()}>
                {child}
              </div>
              <Show when={!isLast()}>
                <div
                  class={`${styles.divider} ${dragging() === i() ? styles.dividerActive : ""}`}
                  onMouseDown={(e) => handleMouseDown(i(), e)}
                />
              </Show>
            </>
          );
        }}
      </For>
    </div>
  );
};

export default SplitPane;

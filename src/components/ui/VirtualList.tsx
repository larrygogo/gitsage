import {
  type JSX,
  type Component,
  createSignal,
  createEffect,
  createMemo,
  onMount,
  onCleanup,
  For,
} from "solid-js";
import styles from "./VirtualList.module.css";

export interface VirtualListProps<T> {
  /** 数据列表 */
  items: T[];
  /** 每行固定高度（px） */
  itemHeight: number;
  /** 上下额外渲染的行数，用于平滑滚动 */
  overscan?: number;
  /** 渲染单行的函数 */
  renderItem: (item: T, index: number) => JSX.Element;
  /** 容器高度，支持数字（px）或 CSS 字符串 */
  containerHeight?: number | string;
  /** 容器自定义 class */
  class?: string;
}

export interface VirtualListHandle {
  /** 滚动到指定索引的条目 */
  scrollToIndex: (index: number, align?: "start" | "center" | "end") => void;
}

/**
 * 创建 VirtualList 组件。
 * 因为 Solid.js 中泛型组件无法直接用 Component<T> 声明，
 * 所以这里使用工厂函数的方式暴露泛型，同时通过 ref 回调暴露 scrollToIndex 方法。
 */
function VirtualList<T>(
  props: VirtualListProps<T> & {
    ref?: (handle: VirtualListHandle) => void;
  },
): JSX.Element {
  const overscan = () => props.overscan ?? 5;

  const [scrollTop, setScrollTop] = createSignal(0);

  let containerRef: HTMLDivElement | undefined;

  // 容器高度解析为像素值
  const [containerPx, setContainerPx] = createSignal(0);

  const updateContainerPx = () => {
    if (containerRef) {
      setContainerPx(containerRef.clientHeight);
    }
  };

  onMount(() => {
    updateContainerPx();

    // 暴露句柄给父组件
    props.ref?.({
      scrollToIndex,
    });
  });

  // 监听容器尺寸变化
  let resizeObserver: ResizeObserver | undefined;
  onMount(() => {
    if (containerRef && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateContainerPx();
      });
      resizeObserver.observe(containerRef);
    }
  });

  onCleanup(() => {
    resizeObserver?.disconnect();
  });

  // 总高度
  const totalHeight = createMemo(() => props.items.length * props.itemHeight);

  // 可见范围计算
  const visibleRange = createMemo(() => {
    const st = scrollTop();
    const viewH = containerPx();
    const ih = props.itemHeight;
    const total = props.items.length;
    const os = overscan();

    if (total === 0 || ih === 0) {
      return { startIndex: 0, endIndex: 0, offsetY: 0 };
    }

    const rawStart = Math.floor(st / ih);
    const rawEnd = Math.ceil((st + viewH) / ih);

    const startIndex = Math.max(0, rawStart - os);
    const endIndex = Math.min(total, rawEnd + os);
    const offsetY = startIndex * ih;

    return { startIndex, endIndex, offsetY };
  });

  // 可见条目切片
  const visibleItems = createMemo(() => {
    const { startIndex, endIndex } = visibleRange();
    return props.items.slice(startIndex, endIndex).map((item, i) => ({
      item,
      index: startIndex + i,
    }));
  });

  // 滚动处理
  const handleScroll = (e: Event) => {
    const target = e.currentTarget as HTMLDivElement;
    setScrollTop(target.scrollTop);
  };

  /**
   * 滚动到指定索引
   */
  const scrollToIndex = (
    index: number,
    align: "start" | "center" | "end" = "start",
  ) => {
    if (!containerRef) return;
    const ih = props.itemHeight;
    const viewH = containerPx();
    const clamped = Math.max(0, Math.min(index, props.items.length - 1));

    let targetScrollTop: number;
    switch (align) {
      case "center":
        targetScrollTop = clamped * ih - viewH / 2 + ih / 2;
        break;
      case "end":
        targetScrollTop = clamped * ih - viewH + ih;
        break;
      case "start":
      default:
        targetScrollTop = clamped * ih;
        break;
    }

    targetScrollTop = Math.max(
      0,
      Math.min(targetScrollTop, totalHeight() - viewH),
    );
    containerRef.scrollTop = targetScrollTop;
    setScrollTop(targetScrollTop);
  };

  // 容器样式
  const containerStyle = (): JSX.CSSProperties => {
    const h = props.containerHeight;
    if (typeof h === "number") {
      return { height: `${h}px` };
    }
    if (typeof h === "string") {
      return { height: h };
    }
    return { height: "100%" };
  };

  const containerClass = () => {
    const classes = [styles.container];
    if (props.class) classes.push(props.class);
    return classes.filter(Boolean).join(" ");
  };

  return (
    <div
      ref={containerRef}
      class={containerClass()}
      style={containerStyle()}
      onScroll={handleScroll}
    >
      <div
        class={styles.sentinel}
        style={{ height: `${totalHeight()}px` }}
      >
        <div
          class={styles.viewport}
          style={{ transform: `translateY(${visibleRange().offsetY}px)` }}
        >
          <For each={visibleItems()}>
            {(entry) => (
              <div
                class={styles.item}
                style={{ height: `${props.itemHeight}px` }}
              >
                {props.renderItem(entry.item, entry.index)}
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

export default VirtualList;

import { type Component, createSignal, Show, For, onMount } from "solid-js";
import { Button } from "@/components/ui";
import { useGitHub } from "@/stores/github";
import * as githubService from "@/services/github";
import { logger } from "@/utils/logger";
import type { LabelInfo } from "@/types";

export interface LabelSelectorProps {
  prNumber: number;
  onClose: () => void;
}

/** 根据标签背景色计算可读的文字颜色 */
function getLabelTextColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(0, 2), 16);
  const g = parseInt(hexColor.slice(2, 4), 16);
  const b = parseInt(hexColor.slice(4, 6), 16);
  // 相对亮度 (ITU-R BT.709)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance > 0.4) {
    // 浅色/中色 → 大幅加深确保可读
    const factor = luminance > 0.7 ? 0.3 : 0.5;
    const darken = (v: number) => Math.round(v * factor);
    const dr = darken(r).toString(16).padStart(2, "0");
    const dg = darken(g).toString(16).padStart(2, "0");
    const db = darken(b).toString(16).padStart(2, "0");
    return `#${dr}${dg}${db}`;
  }
  return `#${hexColor}`;
}

export const LabelSelector: Component<LabelSelectorProps> = (props) => {
  const [ghState, ghActions] = useGitHub();
  const [repoLabels, setRepoLabels] = createSignal<LabelInfo[]>([]);
  const [selectedLabels, setSelectedLabels] = createSignal<Set<string>>(new Set());
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    const ghRepo = ghState.ghRepo;
    if (!ghRepo) return;

    try {
      const labels = await githubService.listLabels(ghRepo.owner, ghRepo.repo);
      setRepoLabels(labels);

      // Pre-select current PR labels
      const currentLabels = ghState.currentPull?.labels ?? [];
      setSelectedLabels(new Set(currentLabels.map((l) => l.name)));
    } catch (err) {
      logger.error("LabelSelector", "加载标签失败:", err);
    } finally {
      setLoading(false);
    }
  });

  const toggleLabel = (name: string) => {
    setSelectedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleApply = async () => {
    const ghRepo = ghState.ghRepo;
    if (!ghRepo) return;

    try {
      const currentLabels = new Set((ghState.currentPull?.labels ?? []).map((l) => l.name));
      const selected = selectedLabels();

      // Add new labels
      const toAdd = [...selected].filter((l) => !currentLabels.has(l));
      if (toAdd.length > 0) {
        await githubService.addLabels(ghRepo.owner, ghRepo.repo, props.prNumber, toAdd);
      }

      // Remove deselected labels
      const toRemove = [...currentLabels].filter((l) => !selected.has(l));
      for (const label of toRemove) {
        await githubService.removeLabel(ghRepo.owner, ghRepo.repo, props.prNumber, label);
      }

      // Refresh PR detail
      await ghActions.loadPullDetail(props.prNumber);
      props.onClose();
    } catch (err) {
      logger.error("LabelSelector", "更新标签失败:", err);
    }
  };

  return (
    <div
      style={{
        "margin-top": "8px",
        padding: "12px",
        "background-color": "var(--gs-bg-primary)",
        border: "1px solid var(--gs-border-secondary)",
        "border-radius": "6px",
      }}
    >
      <Show when={loading()}>
        <div style={{ "font-size": "12px", color: "var(--gs-text-muted)" }}>加载标签中...</div>
      </Show>

      <Show when={!loading()}>
        <div style={{ display: "flex", "flex-wrap": "wrap", gap: "6px", "margin-bottom": "10px" }}>
          <For each={repoLabels()}>
            {(label) => {
              const isSelected = () => selectedLabels().has(label.name);
              const textColor = getLabelTextColor(label.color);
              return (
                <button
                  style={{
                    display: "inline-flex",
                    "align-items": "center",
                    gap: "4px",
                    padding: "2px 8px",
                    "border-radius": "10px",
                    "font-size": "11px",
                    border: `1px solid #${label.color}${isSelected() ? "" : "60"}`,
                    "background-color": isSelected() ? `#${label.color}35` : `#${label.color}18`,
                    color: textColor,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    "font-weight": isSelected() ? "600" : "400",
                    opacity: isSelected() ? "1" : "0.75",
                  }}
                  onClick={() => toggleLabel(label.name)}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      "border-radius": "50%",
                      "background-color": `#${label.color}`,
                      "flex-shrink": "0",
                    }}
                  />
                  {label.name}
                </button>
              );
            }}
          </For>
        </div>

        <div style={{ display: "flex", gap: "6px", "justify-content": "flex-end" }}>
          <Button variant="ghost" size="sm" onClick={props.onClose}>
            取消
          </Button>
          <Button variant="primary" size="sm" onClick={handleApply}>
            应用
          </Button>
        </div>
      </Show>
    </div>
  );
};

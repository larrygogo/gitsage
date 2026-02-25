import { type Component, createSignal, Show, For, onMount } from "solid-js";
import { useGitHub } from "@/stores/github";
import * as githubService from "@/services/github";
import type { PrFile } from "@/types";

export interface PrFileChangesProps {
  prNumber: number;
}

export const PrFileChanges: Component<PrFileChangesProps> = (props) => {
  const [ghState] = useGitHub();
  const [files, setFiles] = createSignal<PrFile[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [expandedFiles, setExpandedFiles] = createSignal<Set<string>>(new Set());

  onMount(async () => {
    const ghRepo = ghState.ghRepo;
    if (!ghRepo) return;

    setLoading(true);
    try {
      const result = await githubService.listFiles(ghRepo.owner, ghRepo.repo, props.prNumber);
      setFiles(result);
    } catch (err) {
      console.error("[PrFileChanges] 加载失败:", err);
    } finally {
      setLoading(false);
    }
  });

  const toggleFile = (filename: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "added": return { text: "A", color: "#1a7f37" };
      case "removed": return { text: "D", color: "#cf222e" };
      case "modified": return { text: "M", color: "#9a6700" };
      case "renamed": return { text: "R", color: "#0969da" };
      default: return { text: "?", color: "#656d76" };
    }
  };

  const parsePatch = (patch: string) => {
    return patch.split("\n").map((line) => {
      let type: "add" | "del" | "context" | "header" = "context";
      if (line.startsWith("@@")) type = "header";
      else if (line.startsWith("+")) type = "add";
      else if (line.startsWith("-")) type = "del";
      return { line, type };
    });
  };

  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "4px" }}>
      <Show when={loading()}>
        <div style={{ "font-size": "13px", color: "var(--gs-text-muted)", "text-align": "center", padding: "16px" }}>
          加载文件变更中...
        </div>
      </Show>

      {/* 文件统计 */}
      <Show when={!loading()}>
        <div style={{ "font-size": "12px", color: "var(--gs-text-muted)", "margin-bottom": "8px" }}>
          {files().length} 个文件变更
        </div>
      </Show>

      <For each={files()}>
        {(file) => {
          const icon = statusIcon(file.status);
          const isExpanded = () => expandedFiles().has(file.filename);
          return (
            <div style={{
              border: "1px solid var(--gs-border-secondary)",
              "border-radius": "6px",
              overflow: "hidden",
            }}>
              {/* 文件头 */}
              <div
                style={{
                  display: "flex",
                  "align-items": "center",
                  gap: "8px",
                  padding: "8px 12px",
                  "background-color": "var(--gs-bg-secondary)",
                  cursor: "pointer",
                  "user-select": "none",
                }}
                onClick={() => toggleFile(file.filename)}
              >
                <span style={{ "font-size": "12px", "font-weight": "600", color: icon.color }}>
                  {icon.text}
                </span>
                <span style={{ "font-size": "13px", "font-family": "monospace", flex: "1", color: "var(--gs-text-primary)" }}>
                  {file.filename}
                </span>
                <span style={{ "font-size": "11px", color: "#1a7f37" }}>+{file.additions}</span>
                <span style={{ "font-size": "11px", color: "#cf222e" }}>-{file.deletions}</span>
                <span style={{ "font-size": "12px", color: "var(--gs-text-muted)" }}>
                  {isExpanded() ? "\u25B2" : "\u25BC"}
                </span>
              </div>

              {/* Diff 内容 */}
              <Show when={isExpanded() && file.patch}>
                <div style={{
                  "font-family": "monospace",
                  "font-size": "12px",
                  "line-height": "1.5",
                  overflow: "auto",
                }}>
                  <For each={parsePatch(file.patch!)}>
                    {(item) => (
                      <div style={{
                        padding: "0 12px",
                        "white-space": "pre-wrap",
                        "word-break": "break-all",
                        "background-color":
                          item.type === "add" ? "var(--gs-diff-added-bg, #e6ffec)" :
                          item.type === "del" ? "var(--gs-diff-deleted-bg, #ffebe9)" :
                          item.type === "header" ? "var(--gs-bg-tertiary)" :
                          "transparent",
                        color:
                          item.type === "header" ? "var(--gs-text-muted)" :
                          "var(--gs-text-primary)",
                      }}>
                        {item.line}
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          );
        }}
      </For>
    </div>
  );
};

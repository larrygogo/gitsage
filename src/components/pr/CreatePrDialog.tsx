import { type Component, createSignal, Show, For, onMount, onCleanup } from "solid-js";
import { Dynamic } from "solid-js/web";
import GitPullRequest from "lucide-solid/icons/git-pull-request";
import GitBranch from "lucide-solid/icons/git-branch";
import ArrowRight from "lucide-solid/icons/arrow-right";
import ChevronsUpDown from "lucide-solid/icons/chevrons-up-down";
import CircleDot from "lucide-solid/icons/circle-dot";
import Target from "lucide-solid/icons/target";
import Search from "lucide-solid/icons/search";
import Check from "lucide-solid/icons/check";
import Plus from "lucide-solid/icons/plus";
import XIcon from "lucide-solid/icons/x";
import { useGitHub } from "@/stores/github";
import { useRepo } from "@/stores/repo";
import * as githubService from "@/services/github";
import type { BranchInfo, LabelInfo, UserInfo } from "@/types";
import styles from "./CreatePrDialog.module.css";

export interface CreatePrDialogProps {
  onClose: () => void;
}

/** 自定义分支选择下拉框 */
const BranchPicker: Component<{
  branches: BranchInfo[];
  value: string;
  onChange: (name: string) => void;
  placeholder: string;
  label: string;
  labelIcon: Component<{ size: number }>;
  iconColor: string;
}> = (props) => {
  const [open, setOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let containerRef!: HTMLDivElement;
  let searchRef!: HTMLInputElement;

  const filtered = () => {
    const q = search().toLowerCase();
    if (!q) return props.branches;
    return props.branches.filter((b) => b.name.toLowerCase().includes(q));
  };

  const handleSelect = (name: string) => {
    props.onChange(name);
    setOpen(false);
    setSearch("");
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (open() && containerRef && !containerRef.contains(e.target as Node)) {
      setOpen(false);
      setSearch("");
    }
  };

  onMount(() => document.addEventListener("mousedown", handleClickOutside));
  onCleanup(() => document.removeEventListener("mousedown", handleClickOutside));

  const toggleOpen = () => {
    const next = !open();
    setOpen(next);
    if (next) {
      setSearch("");
      requestAnimationFrame(() => searchRef?.focus());
    }
  };

  return (
    <div class={styles.branchPicker} ref={containerRef}>
      <div
        class={`${styles.branchTrigger} ${open() ? styles.branchTriggerOpen : ""}`}
        onClick={toggleOpen}
      >
        {/* Label row */}
        <div class={styles.branchTriggerLabel}>
          <span style={{ display: "inline-flex", color: props.iconColor }}>
            <Dynamic component={props.labelIcon} size={10} />
          </span>
          <span class={styles.branchTriggerLabelText}>{props.label}</span>
        </div>

        {/* Value row */}
        <div class={styles.branchTriggerValue}>
          <span class={styles.branchTriggerName}>
            <span class={styles.branchTriggerIcon} style={{ color: props.iconColor }}>
              <GitBranch size={14} />
            </span>
            <span class={`${styles.branchTriggerText} ${!props.value ? styles.branchTriggerPlaceholder : ""}`}>
              {props.value || props.placeholder}
            </span>
          </span>
          <span class={styles.branchTriggerChevron}>
            <ChevronsUpDown size={12} />
          </span>
        </div>
      </div>

      <Show when={open()}>
        <div class={styles.branchDropdown}>
          <div class={styles.branchSearchBox}>
            <span class={styles.branchSearchIcon}>
              <Search size={14} />
            </span>
            <input
              ref={searchRef}
              class={styles.branchSearchInput}
              placeholder="Search branches..."
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
          </div>
          <div class={styles.branchList}>
            <Show
              when={filtered().length > 0}
              fallback={<div class={styles.branchEmpty}>No branches found</div>}
            >
              <For each={filtered()}>
                {(b) => {
                  const isActive = () => b.name === props.value;
                  return (
                    <div
                      class={`${styles.branchRow} ${isActive() ? styles.branchRowActive : ""}`}
                      onClick={() => handleSelect(b.name)}
                    >
                      <span class={styles.branchRowIcon}>
                        <GitBranch size={14} />
                      </span>
                      <span class={styles.branchRowText}>{b.name}</span>
                      <Show when={isActive()}>
                        <span class={styles.branchRowCheck}>
                          <Check size={12} />
                        </span>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
};

/** 标签文字颜色计算 */
function getLabelTextColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(0, 2), 16);
  const g = parseInt(hexColor.slice(2, 4), 16);
  const b = parseInt(hexColor.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance > 0.4) {
    const factor = luminance > 0.7 ? 0.3 : 0.5;
    const darken = (v: number) => Math.round(v * factor);
    return `#${darken(r).toString(16).padStart(2, "0")}${darken(g).toString(16).padStart(2, "0")}${darken(b).toString(16).padStart(2, "0")}`;
  }
  return `#${hexColor}`;
}

export const CreatePrDialog: Component<CreatePrDialogProps> = (props) => {
  const [ghState, ghActions] = useGitHub();
  const [repoState] = useRepo();
  const [title, setTitle] = createSignal("");
  const [body, setBody] = createSignal("");
  const [head, setHead] = createSignal("");
  const [base, setBase] = createSignal("");
  const [draft, setDraft] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Labels
  const [availableLabels, setAvailableLabels] = createSignal<LabelInfo[]>([]);
  const [selectedLabels, setSelectedLabels] = createSignal<LabelInfo[]>([]);
  const [showLabelPicker, setShowLabelPicker] = createSignal(false);

  // Reviewers
  const [collaborators, setCollaborators] = createSignal<UserInfo[]>([]);
  const [selectedReviewers, setSelectedReviewers] = createSignal<UserInfo[]>([]);
  const [showReviewerPicker, setShowReviewerPicker] = createSignal(false);

  const localBranches = () => repoState.branches.filter((b) => !b.is_remote);

  onMount(async () => {
    setHead(repoState.currentBranch || "");
    const defaultBase = localBranches().find((b) => b.name === "main" || b.name === "master");
    if (defaultBase) setBase(defaultBase.name);

    // 加载可选的 labels 和 collaborators
    const ghRepo = ghState.ghRepo;
    if (ghRepo) {
      try {
        const [labels, collabs] = await Promise.all([
          githubService.listLabels(ghRepo.owner, ghRepo.repo),
          githubService.listCollaborators(ghRepo.owner, ghRepo.repo),
        ]);
        setAvailableLabels(labels);
        setCollaborators(collabs);
      } catch {
        // 加载失败不阻止创建 PR
      }
    }
  });

  const toggleLabel = (label: LabelInfo) => {
    setSelectedLabels((prev) => {
      const exists = prev.some((l) => l.id === label.id);
      return exists ? prev.filter((l) => l.id !== label.id) : [...prev, label];
    });
  };

  const removeLabel = (labelId: number) => {
    setSelectedLabels((prev) => prev.filter((l) => l.id !== labelId));
  };

  const toggleReviewer = (user: UserInfo) => {
    setSelectedReviewers((prev) => {
      const exists = prev.some((r) => r.login === user.login);
      return exists ? prev.filter((r) => r.login !== user.login) : [...prev, user];
    });
  };

  const removeReviewer = (login: string) => {
    setSelectedReviewers((prev) => prev.filter((r) => r.login !== login));
  };

  const handleCreate = async () => {
    const ghRepo = ghState.ghRepo;
    if (!ghRepo) return;

    if (!title().trim()) {
      setError("标题不能为空");
      return;
    }
    if (!head() || !base()) {
      setError("请选择源分支和目标分支");
      return;
    }
    if (head() === base()) {
      setError("源分支和目标分支不能相同");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const pr = await githubService.createPull(ghRepo.owner, ghRepo.repo, {
        title: title().trim(),
        body: body().trim() || undefined,
        head: head(),
        base: base(),
        draft: draft() || undefined,
      });

      // 创建成功后添加 labels 和 reviewers
      const labelNames = selectedLabels().map((l) => l.name);
      const reviewerLogins = selectedReviewers().map((r) => r.login);

      await Promise.allSettled([
        labelNames.length > 0
          ? githubService.addLabels(ghRepo.owner, ghRepo.repo, pr.number, labelNames)
          : Promise.resolve(),
        reviewerLogins.length > 0
          ? githubService.requestReviewers(ghRepo.owner, ghRepo.repo, pr.number, reviewerLogins)
          : Promise.resolve(),
      ]);

      await ghActions.loadPulls();
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) props.onClose();
  };

  return (
    <div class={styles.overlay} onClick={handleOverlayClick}>
      <div class={styles.card}>
        {/* Header */}
        <div class={styles.header}>
          <div class={styles.headerLeft}>
            <span class={styles.headerIcon}>
              <GitPullRequest size={16} />
            </span>
            <span class={styles.headerTitle}>Create Pull Request</span>
          </div>
          <button class={styles.closeBtn} onClick={props.onClose}>
            <XIcon size={16} />
          </button>
        </div>

        {/* Branch Section (outside scroll area so dropdowns aren't clipped) */}
        <div class={styles.branchSection}>
          <BranchPicker
            branches={localBranches()}
            value={head()}
            onChange={setHead}
            placeholder="Select branch"
            label="Source"
            labelIcon={CircleDot}
            iconColor="#10B981"
          />

          <span class={styles.arrowCircle}>
            <ArrowRight size={14} />
          </span>

          <BranchPicker
            branches={localBranches()}
            value={base()}
            onChange={setBase}
            placeholder="Select branch"
            label="Target"
            labelIcon={Target}
            iconColor="#FF8400"
          />
        </div>

        {/* Scrollable body */}
        <div class={styles.body}>
          {/* Form Body */}
          <div class={styles.formBody}>
            <div class={styles.fieldGroup}>
              <label class={styles.fieldLabel}>Title</label>
              <input
                class={styles.titleInput}
                placeholder="PR title"
                value={title()}
                onInput={(e) => setTitle(e.currentTarget.value)}
              />
            </div>

            <div class={styles.fieldGroup}>
              <label class={styles.fieldLabel}>Description</label>
              <textarea
                class={styles.descInput}
                placeholder="Describe your changes..."
                value={body()}
                onInput={(e) => setBody(e.currentTarget.value)}
              />
            </div>
          </div>

          <Show when={error()}>
            <div class={styles.error}>{error()}</div>
          </Show>
        </div>

        {/* Meta Section: outside scroll area so dropdowns aren't clipped */}
        <div class={styles.metaSection}>
            {/* Labels */}
            <div class={styles.metaGroup}>
              <span class={styles.metaLabel}>Labels</span>
              <div class={styles.metaRow}>
                <Show when={selectedLabels().length === 0}>
                  <span class={styles.metaEmpty}>No labels</span>
                </Show>
                <For each={selectedLabels()}>
                  {(label) => (
                    <span
                      class={styles.labelPill}
                      style={{
                        "background-color": `#${label.color}18`,
                        color: getLabelTextColor(label.color),
                      }}
                      onClick={() => removeLabel(label.id)}
                    >
                      <span
                        class={styles.labelPillDot}
                        style={{ "background-color": `#${label.color}` }}
                      />
                      {label.name}
                    </span>
                  )}
                </For>
                <div style={{ position: "relative" }}>
                  <button
                    class={styles.metaAddBtn}
                    onClick={() => setShowLabelPicker(!showLabelPicker())}
                  >
                    <Plus size={12} />
                  </button>
                  <Show when={showLabelPicker()}>
                    <DropdownPicker
                      items={availableLabels()}
                      selected={selectedLabels().map((l) => l.name)}
                      onToggle={(item) => toggleLabel(item as LabelInfo)}
                      onClose={() => setShowLabelPicker(false)}
                      renderItem={(item) => {
                        const label = item as LabelInfo;
                        return (
                          <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                "border-radius": "50%",
                                "flex-shrink": "0",
                                "background-color": `#${label.color}`,
                              }}
                            />
                            <span>{label.name}</span>
                          </div>
                        );
                      }}
                      getKey={(item) => (item as LabelInfo).name}
                      emptyText="No labels in repo"
                    />
                  </Show>
                </div>
              </div>
            </div>

            {/* Reviewers */}
            <div class={styles.metaGroup}>
              <span class={styles.metaLabel}>Reviewers</span>
              <div class={styles.metaRow}>
                <Show when={selectedReviewers().length === 0}>
                  <span class={styles.metaEmpty}>No reviewers</span>
                </Show>
                <For each={selectedReviewers()}>
                  {(reviewer) => (
                    <span class={styles.reviewerChip} onClick={() => removeReviewer(reviewer.login)}>
                      <img
                        class={styles.reviewerAvatar}
                        src={reviewer.avatar_url}
                        alt={reviewer.login}
                      />
                      <span class={styles.reviewerName}>{reviewer.login}</span>
                    </span>
                  )}
                </For>
                <div style={{ position: "relative" }}>
                  <button
                    class={styles.metaAddBtn}
                    onClick={() => setShowReviewerPicker(!showReviewerPicker())}
                  >
                    <Plus size={14} />
                  </button>
                  <Show when={showReviewerPicker()}>
                    <DropdownPicker
                      items={collaborators()}
                      selected={selectedReviewers().map((r) => r.login)}
                      onToggle={(item) => toggleReviewer(item as UserInfo)}
                      onClose={() => setShowReviewerPicker(false)}
                      renderItem={(item) => {
                        const user = item as UserInfo;
                        return (
                          <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                            <img
                              src={user.avatar_url}
                              alt={user.login}
                              style={{
                                width: "18px",
                                height: "18px",
                                "border-radius": "50%",
                                "flex-shrink": "0",
                              }}
                            />
                            <span>{user.login}</span>
                          </div>
                        );
                      }}
                      getKey={(item) => (item as UserInfo).login}
                      emptyText="No collaborators"
                    />
                  </Show>
                </div>
              </div>
            </div>
          </div>

        {/* Footer */}
        <div class={styles.footer}>
          <div class={styles.draftOption} onClick={() => setDraft(!draft())}>
            <button class={`${styles.toggle} ${draft() ? styles.toggleActive : ""}`}>
              <span class={styles.toggleDot} />
            </button>
            <span class={styles.draftText}>Create as draft</span>
          </div>

          <div class={styles.buttonGroup}>
            <button class={styles.cancelBtn} onClick={props.onClose}>
              Cancel
            </button>
            <button
              class={styles.createBtn}
              onClick={handleCreate}
              disabled={submitting()}
            >
              <GitPullRequest size={14} />
              {submitting() ? "Creating..." : "Create Pull Request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** 通用下拉选择器 */
const DropdownPicker: Component<{
  items: unknown[];
  selected: string[];
  onToggle: (item: unknown) => void;
  onClose: () => void;
  renderItem: (item: unknown) => any;
  getKey: (item: unknown) => string;
  emptyText: string;
}> = (props) => {
  let ref!: HTMLDivElement;

  const handleClickOutside = (e: MouseEvent) => {
    if (ref && !ref.contains(e.target as Node)) {
      props.onClose();
    }
  };

  onMount(() => {
    // 延迟绑定，避免当前点击立即触发关闭
    requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClickOutside);
    });
  });
  onCleanup(() => document.removeEventListener("mousedown", handleClickOutside));

  return (
    <div class={styles.metaDropdown} ref={ref}>
      <Show
        when={props.items.length > 0}
        fallback={<div class={styles.branchEmpty}>{props.emptyText}</div>}
      >
        <For each={props.items}>
          {(item) => {
            const key = props.getKey(item);
            const isSelected = () => props.selected.includes(key);
            return (
              <div
                class={`${styles.metaDropdownItem} ${isSelected() ? styles.metaDropdownItemActive : ""}`}
                onClick={() => props.onToggle(item)}
              >
                {props.renderItem(item)}
                <Show when={isSelected()}>
                  <Check size={12} style={{ "flex-shrink": "0", color: "#FF8400" }} />
                </Show>
              </div>
            );
          }}
        </For>
      </Show>
    </div>
  );
};

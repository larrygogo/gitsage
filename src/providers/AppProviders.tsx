import { type Component, type JSX } from "solid-js";
import { RepoContext, type RepoStore } from "@/stores/repo";
import { GitHubContext, type GitHubStore } from "@/stores/github";
import { SettingsContext, type SettingsStore } from "@/stores/settings";
import { UiContext, type UiStore } from "@/stores/ui";
import { UpdaterContext, type UpdaterStore } from "@/stores/updater";
import { I18nContext, type I18n } from "@/i18n";

interface AppProvidersProps {
  settings: SettingsStore;
  i18n: I18n;
  ui: UiStore;
  updater: UpdaterStore;
  repo: RepoStore;
  github: GitHubStore;
  children: JSX.Element;
}

const AppProviders: Component<AppProvidersProps> = (props) => {
  return (
    <SettingsContext.Provider value={props.settings}>
      <I18nContext.Provider value={props.i18n}>
        <UiContext.Provider value={props.ui}>
          <UpdaterContext.Provider value={props.updater}>
            <RepoContext.Provider value={props.repo}>
              <GitHubContext.Provider value={props.github}>{props.children}</GitHubContext.Provider>
            </RepoContext.Provider>
          </UpdaterContext.Provider>
        </UiContext.Provider>
      </I18nContext.Provider>
    </SettingsContext.Provider>
  );
};

export default AppProviders;

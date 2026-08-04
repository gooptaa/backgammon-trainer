export const DEFAULT_LEARNER_PROFILE_STORAGE_KEY = "backgammon-trainer.learner-profile.v1";

export interface LearnerProfileStorage {
  load(): string | null;
  save(value: string): void;
  clear(): void;
}

export const createLocalLearnerProfileStorage = (
  storageKey: string = DEFAULT_LEARNER_PROFILE_STORAGE_KEY
): LearnerProfileStorage => {
  return {
    load: () => {
      return window.localStorage.getItem(storageKey);
    },
    save: (value) => {
      window.localStorage.setItem(storageKey, value);
    },
    clear: () => {
      window.localStorage.removeItem(storageKey);
    }
  };
};

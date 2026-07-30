export const DEFAULT_GAME_STORAGE_KEY = "backgammon-trainer.game-snapshot.v1";

export interface GameStorage {
  load(): string | null;
  save(value: string): void;
  clear(): void;
}

export const createLocalGameStorage = (
  storageKey: string = DEFAULT_GAME_STORAGE_KEY
): GameStorage => {
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

// Auth token lives in memory only, for the lifetime of this task pane session
// — never persisted to localStorage/cookies inside the add-in (per work item
// 6.1, the token is re-obtained via the sign-in dialog on the next session).
let token: string | null = null;

export const getToken = (): string | null => token;
export const setToken = (value: string | null): void => {
  token = value;
};

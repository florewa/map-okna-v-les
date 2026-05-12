declare global {
  interface Window {
    API_URL: string;
    INACTIVITY_TIMEOUT: number;
    EXITER_PIN: number;
    EXITER_TIMER: number;
    EXITER_URL: string;
  }
}

export {};

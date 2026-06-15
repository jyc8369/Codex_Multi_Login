export type Locale = "en" | "ko";
export type ThemeMode = "auto" | "vscode" | "dark" | "light";

const messages = {
  en: {
    appName: "Codex Multi Login",
    dashboardTitle: "Account dashboard",
    dashboardSubtitle: "Card view for accounts, quota, limits, and credits. Active accounts are highlighted.",
    addAccount: "Add Account",
    importExportJson: "Import / Export JSON",
    refreshAll: "Refresh All",
    theme: "Theme",
    language: "Language",
    auto: "Auto",
    vscode: "VS Code",
    dark: "Dark",
    light: "Light",
    english: "English",
    korean: "Korean",
    savedAccounts: "Saved Accounts",
    activeAccounts: "Active Accounts",
    accountsInWorkspace: "Accounts in this workspace.",
    activeHint: "Cards highlighted as active.",
    noAccounts: "No accounts yet. Use Add Account or Import JSON to get started.",
    switchAccount: "Switch Account",
    refresh: "Refresh",
    delete: "Delete",
    showAdditionalLimits: "Show additional limits",
    noDataReturned: "No data returned.",
    notProvidedFree: "Not provided on the Free plan.",
    notProvidedPlus: "Not provided on the Plus plan.",
    codeReviewUnavailable: "Code review usage is not available for this account.",
    apply: "Apply",
    cancel: "Cancel",
    creditsNone: "- Credits",
    creditsUnlimited: "Unlimited Credits",
    creditsAvailable: "Credits available"
  },
  ko: {
    appName: "Codex Multi Login",
    dashboardTitle: "계정 대시보드",
    dashboardSubtitle: "계정, 쿼터, 리밋, 크레딧을 카드로 보여줍니다. 활성 계정은 강조됩니다.",
    addAccount: "계정 추가",
    importExportJson: "JSON 가져오기 / 내보내기",
    refreshAll: "전체 새로고침",
    theme: "테마",
    language: "언어",
    auto: "자동",
    vscode: "VS Code",
    dark: "다크",
    light: "라이트",
    english: "영어",
    korean: "한국어",
    savedAccounts: "저장된 계정",
    activeAccounts: "활성 계정",
    accountsInWorkspace: "이 작업 영역에 저장된 계정 수입니다.",
    activeHint: "활성 계정 카드입니다.",
    noAccounts: "아직 계정이 없습니다. 계정 추가 또는 JSON 가져오기를 사용하세요.",
    switchAccount: "계정 전환",
    refresh: "새로고침",
    delete: "삭제",
    showAdditionalLimits: "추가 리밋 보기",
    noDataReturned: "가져온 데이터 없음",
    notProvidedFree: "무료 플랜에서는 제공되지 않습니다.",
    notProvidedPlus: "플러스 플랜에서는 제공되지 않습니다.",
    codeReviewUnavailable: "이 계정에서는 코드 리뷰 사용량을 제공하지 않습니다.",
    apply: "적용",
    cancel: "취소",
    creditsNone: "- 크레딧",
    creditsUnlimited: "무제한 크레딧",
    creditsAvailable: "사용 가능 크레딧"
  }
} as const;

export function normalizeLocale(value: unknown): Locale {
  return value === "ko" ? "ko" : "en";
}

export function t(locale: Locale, key: keyof typeof messages.en): string {
  return messages[locale][key];
}

const strings = {
  ja: {
    // General
    appName: "音量ブースター",
    manageSettings: "すべての設定を管理",
    // Popup
    currentTab: "現在のタブのみ",
    siteWide: "サイト全体",
    accountSpecific: (name) => `アカウント (${name})`,
    active: "適用中",
    reset: "設定を削除",
    resetDomain: "サイト全体の設定を削除",
    resetAccount: "アカウントの設定を削除",
    resetTemp: "現在のタブの設定をリセット",
    noSettingsToReset: "すべてデフォルト設定です",
    statusUnsupported: "このページでは使用できません。",
    // Options
    optionsTitle: "音量ブースター設定",
    accountSettings: "アカウント別設定",
    domainPlaceholder: "youtube.com",
    add: "追加",
    headerDomain: "ドメイン",
    headerAccount: "アカウント名",
    headerBoost: "ブースト率",
    headerAction: "操作",
    deleteAction: "削除",
    resetAction: "リセット",
    editAction: "編集",
    deleteConfirm: (domain) => `${domain} の設定を削除しますか？`,
    alertDomain: "ドメイン名を入力してください。",
    alertBoost: "ブースト率には0から600までの数値を入力してください。",
    resetAllSettings: "すべての設定をリセット",
    resetConfirm: "すべての設定をリセットしてもよろしいですか？この操作は元に戻せません。",
    // Tooltips
    tooltipDomain: "このサイト全体の音量を設定します (保存されます)",
    tooltipAccount: "このアカウントの音量を設定します (保存されます)",
    tooltipTemp: "現在のタブの音量のみ一時的に変更します",
    // New Settings
    generalSettings: "一般設定",
    youtubeLiveSettings: "YouTube Live設定",
    enableYoutubeLiveLowering: "YouTubeライブで音量を変更する",
    targetVolume: "目標音量",
    // Auto Volume Settings
    youtubeAutoSettings: "YouTube自動音量設定",
    enableYoutubeAuto: "YouTubeを開いた時に音量を自動設定する",
    defaultVolume: "既定の音量",
    // Scroll Settings
    mouseWheelSettings: "マウスホイール音量設定",
    youtubeScrollSettings: "YouTube",
    twitchScrollSettings: "Twitch",
    enableYoutubeScroll: "YouTubeでホイール音量調整を有効にする",
    enableTwitchScroll: "Twitchでホイール音量調整を有効にする",
    scrollStep: "ホイール1目盛りの変化量 (%)"
  },
  en: {
    // General
    appName: "Volume Booster",
    manageSettings: "Manage All Settings",
    // Popup
    currentTab: "Current Tab Only",
    siteWide: "Site-wide",
    accountSpecific: (name) => `Account (${name})`,
    active: "Active",
    reset: "Remove Setting",
    resetDomain: "Remove Site-wide Setting",
    resetAccount: "Remove Account Setting",
    resetTemp: "Reset Current Tab Setting",
    noSettingsToReset: "All settings are default",
    statusUnsupported: "Not available on this page.",
    // Tooltips
    tooltipDomain: "Set volume for this entire site (Saved)",
    tooltipAccount: "Set volume for this account (Saved)",
    tooltipTemp: "Temporarily change volume for current tab only",
    // Options
    optionsTitle: "Volume Booster Settings",
    accountSettings: "Account Settings",
    domainPlaceholder: "youtube.com",
    add: "Add",
    headerDomain: "Domain",
    headerAccount: "Account Name",
    headerBoost: "Boost %",
    headerAction: "Action",
    deleteAction: "Delete",
    resetAction: "Reset",
    editAction: "Edit",
    deleteConfirm: (domain) => `Are you sure you want to delete the setting for ${domain}?`,
    alertDomain: "Please enter a domain name.",
    alertBoost: "Please enter a boost value between 0 and 600.",
    resetAllSettings: "Reset All Settings",
    resetConfirm: "Are you sure you want to reset all settings? This cannot be undone.",
    // New Settings
    generalSettings: "General Settings",
    youtubeLiveSettings: "YouTube Live Settings",
    enableYoutubeLiveLowering: "Change volume on YouTube Live",
    targetVolume: "Target Volume",
    // Auto Volume Settings
    youtubeAutoSettings: "YouTube Auto Volume Settings",
    enableYoutubeAuto: "Automatically set volume when opening YouTube",
    defaultVolume: "Default Volume",
    // Scroll Settings
    mouseWheelSettings: "Mouse Wheel Volume Settings",
    youtubeScrollSettings: "YouTube",
    twitchScrollSettings: "Twitch",
    enableYoutubeScroll: "Adjust volume via mouse wheel on YouTube",
    enableTwitchScroll: "Adjust volume via mouse wheel on Twitch",
    scrollStep: "Volume change per step (%)"
  }
};

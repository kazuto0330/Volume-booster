const strings = {
  ja: {
    // General
    appName: "音量ブースター",
    manageSettings: "すべての設定を管理",
    // Popup
    currentTab: "現在のタブのみ",
    siteWide: "サイト全体",
    statusUnsupported: "このページでは使用できません。",
    // Options
    optionsTitle: "音量ブースター設定",
    domainPlaceholder: "youtube.com",
    add: "追加",
    headerDomain: "ドメイン",
    headerBoost: "ブースト率",
    headerAction: "操作",
    deleteAction: "削除",
    editAction: "編集",
    deleteConfirm: (domain) => `${domain} の設定を削除しますか？`,
    alertDomain: "ドメイン名を入力してください。",
    alertBoost: "ブースト率には0から600までの数値を入力してください。",
    resetAllSettings: "すべての設定をリセット",
    resetConfirm: "すべての設定をリセットしてもよろしいですか？この操作は元に戻せません。",
    // New Settings
    generalSettings: "一般設定",
    youtubeLiveSettings: "YouTube Live設定",
    enableYoutubeLiveLowering: "YouTubeライブでは音量を下げる",
    targetVolume: "目標音量"
  },
  en: {
    // General
    appName: "Volume Booster",
    manageSettings: "Manage All Settings",
    // Popup
    currentTab: "Current Tab Only",
    siteWide: "Site-wide",
    statusUnsupported: "Not available on this page.",
    // Options
    optionsTitle: "Volume Booster Settings",
    domainPlaceholder: "youtube.com",
    add: "Add",
    headerDomain: "Domain",
    headerBoost: "Boost %",
    headerAction: "Action",
    deleteAction: "Delete",
    editAction: "Edit",
    deleteConfirm: (domain) => `Are you sure you want to delete the setting for ${domain}?`,
    alertDomain: "Please enter a domain name.",
    alertBoost: "Please enter a boost value between 0 and 600.",
    resetAllSettings: "Reset All Settings",
    resetConfirm: "Are you sure you want to reset all settings? This cannot be undone.",
    // New Settings
    generalSettings: "General Settings",
    youtubeLiveSettings: "YouTube Live Settings",
    enableYoutubeLiveLowering: "Lower volume on YouTube Live",
    targetVolume: "Target Volume"
  }
};

# プライバシーポリシー / Privacy Policy (Volume Booster)

最終更新日 / Last Updated: 2026-10-18

---

## 日本語 (Japanese)

本プライバシーポリシーは、Chrome拡張機能「音量ブースター (Volume Booster)」（以下「本拡張機能」）におけるユーザー情報の取り扱い方針を説明するものです。

### 1. 収集する情報とその利用目的
本拡張機能は、**ユーザーの個人情報、閲覧履歴、ログイン情報、パスワード、入力内容などのプライバシー情報を一切収集、保存、追跡、外部送信しません**。

本拡張機能が利用するデータは以下の通りであり、すべてユーザーのブラウザ内（ローカル環境）でのみ管理されます：
- **音量設定データ:** サイトごと、URLパスごと、YouTubeチャンネルごとの音量設定値（10%〜600%）。
- **ユーザー設定:** テーマ（ライト/ダーク）、言語設定（日本語/英語）、アコーディオン開閉状態。
- **一時的音量状態:** 現在開いているタブ限定の一時的な音量設定値。

これらのデータは、Google Chrome の提供する標準API（`chrome.storage.sync` および `chrome.storage.session`）を利用してブラウザ内に安全に保存され、ユーザーが次回該当サイトを開いた際に以前の設定を復元・適用する目的のみに使用されます。外部サーバーへの通信・データ送信は一切行いません。

### 2. 使用する権限とその必要性 (Permissions)
本拡張機能は、Chrome Web Storeの「最小権限の原則 (Least Privilege)」を遵守し、機能実現に必要な最小限の権限のみを要求します：
- **`storage`**: ユーザーが設定した音量やUI設定（テーマ・言語）をブラウザ内に保存・同期するために使用します。
- **`scripting`**: Webページ上のメディア要素（動画・音声）に対して音量ブースト処理を安全に適用するために使用します。
- **`tabCapture`**: クロスオリジン（CORS）制限によって通常のDOM接続で無音化するリスクのあるメディア（TwitchクリップやSNS動画など）の音声を高音質でブーストするために使用します。
- **`offscreen`**: Manifest V3 のセキュリティ仕様に準拠し、バックグラウンドで安全に Web Audio API（AudioContext）を実行するために使用します。
- **`<all_urls>` (ホスト権限)**: ユーザーが訪問する任意のWebサイトにおいて、動画や音声の音量を直感的に増幅・調整できるようにするために必要です。ユーザーの閲覧履歴やWebページのコンテンツを収集することはありません。

### 3. データの共有および第三者への提供
本拡張機能は、ユーザーのデータをいかなる第三者（広告事業者、データブローカー等）にも販売、貸与、譲渡、共有しません。また、いかなる外部サーバーへのテレメトリ（利用状況追跡）送信も行いません。

### 4. プライバシーポリシーの変更
本拡張機能の機能追加やChrome Web Storeポリシーの改定に伴い、本プライバシーポリシーを改定することがあります。改定があった場合は、本ページにて最新の内容を速やかに公開します。

### 5. お問い合わせ
本プライバシーポリシーに関するご質問やお問い合わせは、本拡張機能の公開サポートページ（GitHubリポジトリのIssueなど）までお願いいたします。

---

## English

This Privacy Policy explains how the "Volume Booster" Chrome extension ("the Extension") handles user information and data.

### 1. Information Collection and Usage
The Extension **DOES NOT collect, store, track, transmit, or share any personally identifiable information (PII), browsing history, login credentials, or user inputs**.

The Extension only processes the following operational configuration data locally within your browser:
- **Volume Settings:** Volume boost percentages (10% to 600%) saved per website domain, URL path, or YouTube creator channel.
- **User Preferences:** Theme selection (Light/Dark), display language (English/Japanese), and accordion UI state.
- **Temporary State:** Volume boost levels applied temporarily to the current tab only.

All settings are stored locally on your device via Google Chrome's standard APIs (`chrome.storage.sync` and `chrome.storage.session`) solely to restore your chosen volume levels when visiting those sites. No data is ever transmitted to external servers.

### 2. Permissions and Justifications
In accordance with the Chrome Web Store's Least Privilege Policy, the Extension only requests the minimum necessary permissions required for its functionality:
- **`storage`**: Required to store user volume preferences and UI settings locally across browser sessions.
- **`scripting`**: Required to inject audio processing scripts into web pages to control audio/video elements.
- **`tabCapture`**: Required to capture and boost audio from CORS-restricted cross-origin media (e.g., Twitch clips, Twitter/X videos) without muting or distortion.
- **`offscreen`**: Required by Manifest V3 standards to run Web Audio API processing (`AudioContext`) safely in the background.
- **`<all_urls>` (Host Permissions)**: Required to allow users to boost and control audio playback on any website they visit. The Extension never tracks, logs, or reads browsing activity or page contents.

### 3. Data Sharing and Sale
The Extension does not sell, rent, trade, or transfer any user data to third parties, advertising networks, or data brokers. It contains no analytics, telemetry, or tracking scripts.

### 4. Changes to This Policy
We may update this Privacy Policy from time to time to reflect functional improvements or changes in Chrome Web Store policies. Any updates will be posted directly to this document.

### 5. Contact
If you have any questions or feedback regarding this Privacy Policy, please reach out via our GitHub repository support/issues page.

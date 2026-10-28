# WWB_deckeditor

鳴潮：対決 (Wuthering Waves TCG) 的組牌器，以 WIXOSS_deckeditor 為基礎改寫（與 ANGE_UNITE_deckeditor 同架構）。

## 使用方式
直接用瀏覽器開啟 `index.html`。

- 右側搜尋結果點一下 → 加入牌組；牌組中點一下 → 移除；牌組中右鍵 → 再加一張同卡
- 滑鼠移到卡片上顯示大圖與效果；按住 ALT 可鎖定預覽
- Deck Code：匯出／匯入牌組代碼、下載 CSV、存到 Deck List (localStorage)
- Deck View／Card List：檢視整副牌組
- Comment：每張卡可寫備註，可匯出／匯入 JSON
- 「キャラデッキのキャラで使えるカードのみ表示」：只顯示共通卡＋目前キャラデッキ角色的專用卡

## 加卡限制
- 不做構築規則檢查，只在加卡時擋張數上限
- キャラデッキ：15 枚、同カード番號 1 枚
- アクションデッキ：40 枚、同カード番號 3 枚
- 禁止・制限：目前官方無公告（`js/card_info.js` 的 `BAN_LIST`／`LIMIT_LIST` 留空）

## 資料
- 卡片資料・卡圖：[鳴潮：対決 公式カードリスト](https://wwcg.ucp-jp.com/jp/card)（2026-10-28 取得）
  - スターターデッキ01／02、ブースターパック01：198 筆 → 123 個カード番號
  - 同番號的異圖（★★／★★★★／★★★★★／PR★★）不另收，以最低稀有度版本為準，收錄商品合併顯示
  - 官方資料中的「散华」（簡體）統一為「散華」
- 卡圖直接外連官方 COS 圖床；讀不到時自動改用文字卡圖
- 更新資料：`tools/scrape_wwcg_console.js`（在官網卡片頁的 Console 執行，產生 cardData 行）

## Release note
20261028 v1.00
1. First release.

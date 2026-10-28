/*
	鳴潮：対決 card data scraper
	使い方:
	  1. ブラウザで https://wwcg.ucp-jp.com/jp/card を開く
	  2. DevTools の Console にこのファイルの中身を貼り付けて実行
	  3. 完成後、cardData の行がクリップボードにコピーされる (copy() が使えない場合は Console に出力)
	  4. js/card_info.js の `const cardData = [ ... ];` の中身を置き換える
	     新しい商品がある場合は PRODUCT_LIST / CHARA_ORDER も更新する

	- API: https://mc-api.ucp-jp.com/api/web/card/list , /web/card/info (header x-lang: ja-jp)
	- 同じカード番号の異圖 (★★ / ★★★★ / ★★★★★ / PR★★) は最低レアリティ版を代表にし、収録商品だけ合併
	- 公式データの「散华」(簡体字) は「散華」に統一
*/
(async function() {
	const API = 'https://mc-api.ucp-jp.com/api/web/card/';
	const H = { headers: { 'x-lang': 'ja-jp' } };
	const IMG_BASE = 'https://mc-file01-1309577691.cos.ap-hongkong.myqcloud.com/kapai/kpupimg/compressed/';
	const RR = { '★': 1, '★★': 2, '★★★': 3, '★★★★': 4, '★★★★★': 5, 'PR★★': 9 };

	let list = [];
	for(let p = 1; p < 50; p++)
	{
		const l = await fetch(API + 'list?page=' + p + '&size=100', H).then(r => r.json());
		list = list.concat(l.data.list);
		if(!l.data.has_more) break;
	}
	console.log('list:', list.length);

	const infos = [];
	for(let i = 0; i < list.length; i += 10)
	{
		const chunk = await Promise.all(list.slice(i, i + 10).map(x =>
			fetch(API + 'info?id=' + x.id, H).then(r => r.json()).then(j => j.data)));
		infos.push(...chunk);
	}
	console.log('info:', infos.length);

	const fixName = s => String(s || '').replace(/散华/g, '散華');
	const clean = s => (s == null || s === '-') ? '' : String(s);
	const g = {};
	infos.forEach(x => { (g[x.code] = g[x.code] || []).push(x); });

	const rows = [];
	for(const code in g)
	{
		const vs = g[code].slice().sort((a, b) => (RR[a.rarity_name] || 8) - (RR[b.rarity_name] || 8));
		const b = vs[0];
		const prods = new Set();
		vs.forEach(v => {
			if(!v.obtain) prods.add('PR');
			else v.obtain.split('、').forEach(p => prods.add(p.trim()));
		});
		const isC = b.type_id == 3;
		let img = String(b.img || '');
		if(img.indexOf(IMG_BASE) === 0) img = img.slice(IMG_BASE.length);
		rows.push([
			code, fixName(b.name), isC ? 'キャラ' : 'アクション',
			isC ? clean(b.level) : '',
			isC ? '' : clean(b.color_name),
			isC ? '' : fixName(clean(b.character_name)),
			isC ? '' : clean(b.fee),
			isC ? '' : clean(b.speed),
			isC ? '' : clean(b.damage),
			clean(b.attr_name), clean(b.weapon_type_name), clean(b.force_name), clean(b.feature_name),
			b.rarity_name, [...prods].join(','),
			String(b.info || '').replace(/\r?\n/g, '<br>'),
			img
		]);
	}

	const out = rows.map(r => '\t' + JSON.stringify(r) + ',').join('\n');
	try { copy(out); console.log('copied ' + rows.length + ' rows to clipboard'); }
	catch(e) { console.log(out); }
})();

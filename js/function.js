/*
	鳴潮：対決 Deck Builder
	based on WIXOSS_deckeditor (ANGE_UNITE_deckeditor と同じ構成)

	加卡時只限制張數上限 (構築ルールのチェックはしない)
	- キャラデッキ: 15枚まで、同じカード番号は1枚まで
	- アクションデッキ: 40枚まで、同じカード番号は3枚まで
*/

const CHARA_MAX = 15;
const CHARA_KINDS = 3;
const ACTION_MAX = 40;
const SAME_ID_ACTION = 3;
const PAGE_SIZE = 10;

const DECK_LIST_KEY = "WWBDeckNameList";
const DECK_KEY_PREFIX = "WWB_deck_";
const COMMENT_SUFFIX = "_WWBcomment";
const DARK_KEY = "wwb_dark_mode";

const COLOR_ORDER = ["赤", "青", "緑"];
const COLOR_HEX = { "赤": "#e04848", "青": "#3f8fe0", "緑": "#3daa55", "": "#8a8a8a" };
const COLOR_CHECK = { "赤": "c_red", "青": "c_blue", "緑": "c_green" };
const COMMON = "共通";

var cardById = {};
var rdeckArr = [];
var page = 0;

var charaArr = [];
var actionArr = [];

var deckNamelist = [];

var costobj = null, colorobj = null, charaobj = null;

/* ========================================================= */
/*  Init                                                      */
/* ========================================================= */

// function.js is loaded before jQuery, so wait for DOMContentLoaded instead of $(document).ready
window.addEventListener('DOMContentLoaded', function() {
	for(var i = 0; i < cardData.length; i++)
	{
		cardById[cardData[i][ID]] = cardData[i];
	}

	buildFilterControls();
	buildDeckSlots();
	buildResultSlots();
	buildCharts();
	showInfotable(null);

	document.getElementById('fileinput').addEventListener('change', readSingleFile, false);
	document.getElementById('commentFileinput').addEventListener('change', readSingleCommentFile, false);

	$("#textsearch").keydown(function(event) {
		if(event.keyCode == 13) search();
	});
	$("#selectChara, #selectAttr, #selectTag, #selectProduct").change(search);

	onloaddeck();
	search();
	showAlldeck();
	updateDarkModeButton();
	applyDarkModeImages();
});

function hideInfo()
{
	$('#cardinformation').css('visibility', 'hidden');
}

function escapeHtml(s)
{
	return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function isChara(c) { return c[TYPE] == "キャラ"; }

// キャラカードは「カード名」、アクションカードは「専用キャラ」
function ownerName(c) { return isChara(c) ? c[NAME] : c[CHARA]; }

function tagList(c) { return c[TAG] ? c[TAG].split(",") : []; }

function buildFilterControls()
{
	var i, str;

	// 専用キャラ / キャラ名
	var charas = CHARA_ORDER.slice();
	for(i = 0; i < cardData.length; i++)
	{
		var n = ownerName(cardData[i]);
		if(n && n != COMMON && charas.indexOf(n) == -1) charas.push(n);
	}
	str = "<option value=\"0\">--All キャラ--</option>";
	for(i = 0; i < charas.length; i++)
	{
		str += "<option value=\"" + escapeHtml(charas[i]) + "\">" + escapeHtml(charas[i]) + "</option>";
	}
	str += "<option value=\"" + COMMON + "\">" + COMMON + " (アクション)</option>";
	$("#selectChara").html(str);

	// 属性 (キャラ)
	var attrs = [];
	for(i = 0; i < cardData.length; i++)
	{
		if(cardData[i][ATTR] && attrs.indexOf(cardData[i][ATTR]) == -1) attrs.push(cardData[i][ATTR]);
	}
	str = "<option value=\"0\">--All 属性--</option>";
	for(i = 0; i < attrs.length; i++) str += "<option value=\"" + escapeHtml(attrs[i]) + "\">" + escapeHtml(attrs[i]) + "</option>";
	$("#selectAttr").html(str);

	// タグ (アクション)
	var tags = [];
	for(i = 0; i < cardData.length; i++)
	{
		var ts = tagList(cardData[i]);
		for(var k = 0; k < ts.length; k++) if(tags.indexOf(ts[k]) == -1) tags.push(ts[k]);
	}
	str = "<option value=\"0\">--All タグ--</option>";
	for(i = 0; i < tags.length; i++) str += "<option value=\"" + escapeHtml(tags[i]) + "\">＜" + escapeHtml(tags[i]) + "＞</option>";
	$("#selectTag").html(str);

	// 商品
	str = "<option value=\"0\">--All Product--</option>";
	for(i = 0; i < PRODUCT_LIST.length; i++)
	{
		str += "<option value=\"" + PRODUCT_LIST[i][0] + "\">" + escapeHtml(productLabel(PRODUCT_LIST[i][0])) + "</option>";
	}
	$("#selectProduct").html(str);
}

function productLabel(code)
{
	for(var i = 0; i < PRODUCT_LIST.length; i++)
	{
		if(PRODUCT_LIST[i][0] == code) return "[" + code + "] " + PRODUCT_LIST[i][1];
	}
	return code;
}

/* ========================================================= */
/*  Slots                                                     */
/* ========================================================= */

function slotImg(zone, idx, w, h)
{
	return "<img id=\"" + zone + "_" + idx + "\" class=\"deck-slot\" width=\"" + w + "px\" height=\"" + h + "px\" src=\"img/empty.jpg\" alt=\"\"" +
		" onmouseover=\"onmouseShow(this, 'deck');\"" +
		" onclick=\"delDeck('" + zone + "', " + idx + ");\"" +
		" oncontextmenu=\"addDeck(this); return false;\">";
}

function buildDeckSlots()
{
	var i, str;

	str = "";
	for(i = 0; i < CHARA_MAX; i++)
	{
		str += slotImg("chara", i, 86, 120);
		if(i == 9) str += "<br>";
	}
	$("#charaZone").html(str);

	str = "";
	for(i = 0; i < ACTION_MAX; i++)
	{
		str += slotImg("action", i, 86, 120);
		if(i % 10 == 9 && i != ACTION_MAX - 1) str += "<br>";
	}
	$("#actionZone").html(str);
}

function buildResultSlots()
{
	var i, s0 = "", s1 = "";
	for(i = 0; i < PAGE_SIZE; i++)
	{
		var tag = "<img id=\"rdeck_" + i + "\" onmouseover=\"onmouseShow(this, 'search');\" onclick=\"addDeck(this)\" oncontextmenu=\"return false;\" alt=\"\" height=\"172px\" width=\"123px\" src=\"img/empty.jpg\" style=\"cursor: pointer;\"> ";
		if(i < PAGE_SIZE / 2) s0 += tag; else s1 += tag;
	}
	$("#resultRow0").html(s0);
	$("#resultRow1").html(s1);
}

/* ========================================================= */
/*  Card image (text placeholder when the image cannot load)  */
/* ========================================================= */

var placeholderCache = {};
var failedSrc = {};

function cardImgSrc(card)
{
	if(!card) return "img/empty.jpg";
	if(card[SRC] && !failedSrc[card[SRC]]) return card[SRC];
	return makePlaceholder(card);
}

// 官網圖片讀取失敗時 (離線 / 被擋) 改用文字版卡圖
document.addEventListener('error', function(e) {
	var img = e.target;
	if(!img || img.tagName !== 'IMG') return;
	var src = img.getAttribute('src') || "";
	if(src.indexOf(IMG_BASE) != 0) return;
	failedSrc[src] = true;
	var c = null;
	for(var i = 0; i < cardData.length; i++) if(cardData[i][SRC] == src) { c = cardData[i]; break; }
	if(c) img.setAttribute('src', makePlaceholder(c));
}, true);

function makePlaceholder(card)
{
	if(placeholderCache[card[ID]]) return placeholderCache[card[ID]];

	var bg = isChara(card) ? "#5a4b8a" : (COLOR_HEX[card[COLOR]] || "#8a8a8a");
	var name = card[NAME];
	var stat, stat2;
	if(isChara(card))
	{
		stat = "キャラ  Lv." + card[LEVEL];
		stat2 = [card[ATTR], card[WEAPON]].filter(function(s){ return s; }).join(" / ");
	}
	else
	{
		stat = "アクション  " + card[COLOR] + "  【" + card[CHARA] + "】";
		stat2 = "COST " + card[COST] + " / SPD " + (card[SPEED] || "-") + " / DMG " + card[DAMAGE];
	}
	var esc = function(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
	var fs = Math.min(48, Math.floor(480 / Math.max(name.length, 1)));
	var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='573' height='800' viewBox='0 0 573 800'>" +
		"<rect width='573' height='800' rx='30' fill='#1e1e28'/>" +
		"<rect x='18' y='18' width='537' height='764' rx='22' fill='" + bg + "' opacity='0.85'/>" +
		"<rect x='40' y='150' width='493' height='420' rx='14' fill='#ffffff' opacity='0.85'/>" +
		"<text x='286' y='80' font-size='44' font-family='sans-serif' font-weight='bold' text-anchor='middle' fill='#fff'>" + esc(card[ID]) + "</text>" +
		"<text x='286' y='330' font-size='" + fs + "' font-family='sans-serif' font-weight='bold' text-anchor='middle' fill='#222'>" + esc(name) + "</text>" +
		"<text x='286' y='470' font-size='30' font-family='sans-serif' text-anchor='middle' fill='#444'>" + (card[SRC] ? "IMAGE NOT LOADED" : "NO IMAGE") + "</text>" +
		"<text x='286' y='650' font-size='34' font-family='sans-serif' text-anchor='middle' fill='#fff'>" + esc(stat) + "</text>" +
		"<text x='286' y='705' font-size='30' font-family='sans-serif' text-anchor='middle' fill='#fff'>" + esc(stat2) + "</text>" +
		"</svg>";
	var uri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
	placeholderCache[card[ID]] = uri;
	return uri;
}

/* ========================================================= */
/*  Search                                                    */
/* ========================================================= */

function deckCharaNames()
{
	var res = [];
	for(var i = 0; i < charaArr.length; i++)
	{
		if(res.indexOf(charaArr[i][NAME]) == -1) res.push(charaArr[i][NAME]);
	}
	return res;
}

function search()
{
	var i;
	var keywords = $("#textsearch").val().replace(/　/g, " ").trim().toLowerCase().split(/\s+/).filter(function(s){ return s != ""; });
	var chara = $("#selectChara").val();
	var attr = $("#selectAttr").val();
	var tag = $("#selectTag").val();
	var product = $("#selectProduct").val();
	var onlyDeck = $("#onlyDeckChara").prop("checked");
	var names = deckCharaNames();

	rdeckArr = [];

	for(i = 0; i < cardData.length; i++)
	{
		var c = cardData[i];

		if(isChara(c))
		{
			if(!$("#t_chara").prop("checked")) continue;
			if(!$("#lv_" + c[LEVEL]).prop("checked")) continue;
			if(attr != "0" && c[ATTR] != attr) continue;
			if(tag != "0") continue;
			if(onlyDeck && names.length >= CHARA_KINDS && names.indexOf(c[NAME]) == -1) continue;
		}
		else
		{
			if(!$("#t_action").prop("checked")) continue;
			if(!$("#" + COLOR_CHECK[c[COLOR]]).prop("checked")) continue;
			var cost = parseInt(c[COST], 10);
			if(!$("#cost_" + Math.min(cost, 3)).prop("checked")) continue;
			if(attr != "0" && tagList(c).indexOf(attr) == -1) continue;
			if(tag != "0" && tagList(c).indexOf(tag) == -1) continue;
			if(onlyDeck && c[CHARA] != COMMON && names.indexOf(c[CHARA]) == -1) continue;
		}

		if(chara != "0" && ownerName(c) != chara) continue;

		if(product != "0" && c[PRODUCT].split(",").indexOf(product) == -1) continue;

		if(keywords.length > 0)
		{
			var hay = (c[ID] + " " + c[NAME] + " " + c[TEXT].replace(/<br>/g, " ") + " " + c[TAG] + " " + c[CHARA] + " " + c[TYPE] + " " + c[ATTR] + " " + c[WEAPON] + " " + c[FORCE]).toLowerCase();
			var ok = true;
			for(var k = 0; k < keywords.length; k++)
			{
				if(hay.indexOf(keywords[k]) == -1) { ok = false; break; }
			}
			if(!ok) continue;
		}

		rdeckArr.push(c);
	}

	var sortMode = $("#selectSort").val();
	if(sortMode == "1")
	{
		rdeckArr.sort(function(a, b) { return typeIdx(a) - typeIdx(b) || charaIdx(a) - charaIdx(b) || lvNum(a) - lvNum(b) || colorIdx(a) - colorIdx(b) || costNum(a) - costNum(b) || cmpId(a, b); });
	}
	else if(sortMode == "2")
	{
		rdeckArr.sort(function(a, b) { return typeIdx(a) - typeIdx(b) || costNum(a) - costNum(b) || colorIdx(a) - colorIdx(b) || cmpId(a, b); });
	}
	else if(sortMode == "3")
	{
		rdeckArr.sort(function(a, b) { return typeIdx(a) - typeIdx(b) || numOf(b, SPEED) - numOf(a, SPEED) || cmpId(a, b); });
	}
	else if(sortMode == "4")
	{
		rdeckArr.sort(function(a, b) { return typeIdx(a) - typeIdx(b) || numOf(b, DAMAGE) - numOf(a, DAMAGE) || cmpId(a, b); });
	}
	else
	{
		rdeckArr.sort(cmpId);
	}

	page = 0;
	showrdeck();
}

function checkall()
{
	$("input[type=checkbox]").prop("checked", true);
	$("#onlyDeckChara").prop("checked", false);
}

function uncheckall()
{
	$("input[type=checkbox]").prop("checked", false);
}

function clickSpan(x)
{
	var cb = $(x).prev("input[type=checkbox]");
	cb.prop("checked", !cb.prop("checked"));
}

function showrdeck()
{
	var i;
	for(i = 0; i < PAGE_SIZE; i++)
	{
		var idx = page * PAGE_SIZE + i;
		if(idx < rdeckArr.length)
		{
			$("#rdeck_" + i).attr("src", cardImgSrc(rdeckArr[idx])).attr("alt", rdeckArr[idx][ID]);
		}
		else
		{
			$("#rdeck_" + i).attr("src", "img/empty.jpg").attr("alt", "");
		}
	}
	applyDarkModeImages();

	$("#totalCard").html(rdeckArr.length);
	if(rdeckArr.length == 0) $("#page").html("0 / 0");
	else $("#page").html((page + 1) + " / " + Math.ceil(rdeckArr.length / PAGE_SIZE));
}

function changePage(x)
{
	var maxPage = Math.max(0, Math.ceil(rdeckArr.length / PAGE_SIZE) - 1);
	if(x == "back") page = (page > 0) ? page - 1 : maxPage;
	else page = (page < maxPage) ? page + 1 : 0;
	showrdeck();
}

/* ========================================================= */
/*  Sort helpers                                              */
/* ========================================================= */

function colorIdx(c) { var i = COLOR_ORDER.indexOf(c[COLOR]); return i == -1 ? 9 : i; }
function typeIdx(c) { return isChara(c) ? 0 : 1; }
function lvNum(c) { return c[LEVEL] === "" ? 99 : parseInt(c[LEVEL], 10); }
function costNum(c) { return c[COST] === "" ? 99 : parseInt(c[COST], 10); }
function numOf(c, col) { return c[col] === "" ? -1 : parseInt(c[col], 10); }
function charaIdx(c)
{
	var n = ownerName(c);
	if(n == COMMON) return 98;
	var i = CHARA_ORDER.indexOf(n);
	return i == -1 ? 97 : i;
}
function idKey(c)
{
	var id = c[ID];
	// SD01 → SD02 → BP01 の順 (発売順)
	var order = { "SD": "0", "BP": "1" };
	return (order[id.substr(0, 2)] || "9") + id;
}
function cmpId(a, b) { var x = idKey(a), y = idKey(b); return x < y ? -1 : (x > y ? 1 : 0); }

function sortChara()
{
	// キャラごとにまとめ、デッキに入れた順を保つ → 同キャラ内は Lv 順
	var order = deckCharaNames();
	charaArr.sort(function(a, b) {
		return order.indexOf(a[NAME]) - order.indexOf(b[NAME]) || lvNum(a) - lvNum(b) || cmpId(a, b);
	});
}

function sortAction()
{
	var order = deckCharaNames();
	actionArr.sort(function(a, b) {
		var ia = a[CHARA] == COMMON ? 90 : order.indexOf(a[CHARA]);
		var ib = b[CHARA] == COMMON ? 90 : order.indexOf(b[CHARA]);
		if(ia < 0) ia = 80;
		if(ib < 0) ib = 80;
		return ia - ib || colorIdx(a) - colorIdx(b) || costNum(a) - costNum(b) || cmpId(a, b);
	});
}

/* ========================================================= */
/*  Add / Delete                                              */
/* ========================================================= */

function countById(arr, id)
{
	var n = 0;
	for(var i = 0; i < arr.length; i++) if(arr[i][ID] == id) n++;
	return n;
}

var toastTimer = null;
function toast(msg)
{
	var el = document.getElementById("wwbToast");
	if(!el)
	{
		el = document.createElement("div");
		el.id = "wwbToast";
		el.style.cssText = "position:fixed;left:50%;top:18px;transform:translateX(-50%);background:rgba(40,40,40,0.92);color:#fff;padding:8px 16px;border-radius:8px;z-index:3000;font-size:14px;pointer-events:none;transition:opacity .2s;";
		document.body.appendChild(el);
	}
	el.textContent = msg;
	el.style.opacity = "1";
	clearTimeout(toastTimer);
	toastTimer = setTimeout(function(){ el.style.opacity = "0"; }, 2400);
}

function addDeck(x)
{
	var id = x.alt;
	if(!id) return;
	var c = cardById[id];
	if(!c) return;

	if(isChara(c))
	{
		if(charaArr.length >= CHARA_MAX) { toast("キャラデッキは15枚までです"); return; }
		if(countById(charaArr, c[ID]) >= 1) { toast("キャラデッキに同じカード番号は1枚までです"); return; }
		charaArr.push(c);
		sortChara();
	}
	else
	{
		if(actionArr.length >= ACTION_MAX) { toast("アクションデッキは40枚までです"); return; }
		if(BAN_LIST.indexOf(c[ID]) != -1) { toast("禁止カードです"); return; }
		var limit = LIMIT_LIST.indexOf(c[ID]) != -1 ? 1 : SAME_ID_ACTION;
		if(countById(actionArr, c[ID]) >= limit) { toast("同じカード番号のアクションカードは" + limit + "枚までです"); return; }
		actionArr.push(c);
		sortAction();
	}

	showAlldeck();
}

function delDeck(zone, idx)
{
	var arr = zone == "chara" ? charaArr : actionArr;
	if(idx >= arr.length) return;
	arr.splice(idx, 1);
	if(zone == "chara") { sortChara(); sortAction(); }
	showAlldeck();

	// keep preview in sync with what is now under the cursor
	var img = document.getElementById(zone + "_" + idx);
	if(img) onmouseShow(img, 'deck');
}

function cleardeck()
{
	if(!confirm("It will clear current deck. Are you sure?")) return;
	dataInit();
}

function dataInit()
{
	charaArr = [];
	actionArr = [];
	showAlldeck();
}

/* ========================================================= */
/*  Render deck                                               */
/* ========================================================= */

function renderZone(zone, arr, max)
{
	for(var i = 0; i < max; i++)
	{
		var img = $("#" + zone + "_" + i);
		if(i < arr.length)
		{
			img.attr("src", cardImgSrc(arr[i])).attr("alt", arr[i][ID]);
		}
		else
		{
			img.attr("src", "img/empty.jpg").attr("alt", "");
		}
	}
}

function setCount(sel, n, okFn)
{
	$(sel).removeClass("ok ng").addClass(okFn(n) ? "ok" : "");
}

function showAlldeck()
{
	renderZone("chara", charaArr, CHARA_MAX);
	renderZone("action", actionArr, ACTION_MAX);

	$("#charaCount").text(charaArr.length + " / " + CHARA_MAX);
	setCount("#charaCount", charaArr.length, function(n) { return n == CHARA_MAX; });
	$("#actionCount").text(actionArr.length + " / " + ACTION_MAX);
	setCount("#actionCount", actionArr.length, function(n) { return n == ACTION_MAX; });

	// キャラ内訳: 名前 (Lv0/Lv1/Lv2)
	var names = deckCharaNames();
	var parts = [];
	for(var i = 0; i < names.length; i++)
	{
		var lv = [0, 0, 0];
		for(var j = 0; j < charaArr.length; j++) if(charaArr[j][NAME] == names[i]) lv[parseInt(charaArr[j][LEVEL], 10)]++;
		parts.push(names[i] + " (" + lv.join("/") + ")");
	}
	$("#charaDetail").text(parts.length ? parts.join("　") : "");

	applyDarkModeImages();
	updatechart();

	if($("#onlyDeckChara").prop("checked")) search();
}

/* ========================================================= */
/*  Charts                                                    */
/* ========================================================= */

const CHARA_COLORS = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac"];

function getLegendColor()
{
	return document.body.classList.contains('dark-mode') ? '#e6e6e6' : 'rgb(0, 0, 0)';
}

function makeDoughnut(id, labels, colors)
{
	return new Chart(document.getElementById(id), {
		type: 'doughnut',
		data: {
			labels: labels,
			datasets: [{ data: labels.map(function(){ return 0; }), backgroundColor: colors, hoverOffset: 4 }]
		},
		options: {
			plugins: {
				legend: { display: true, labels: { color: getLegendColor(), font: { size: 11 }, boxWidth: 12 } }
			}
		}
	});
}

function buildCharts()
{
	costobj = makeDoughnut('costChart', ['COST 0', 'COST 1', 'COST 2', 'COST 3'],
		['#e0e0e0', '#b0b0b0', '#808080', '#505050']);
	colorobj = makeDoughnut('colorChart', COLOR_ORDER,
		COLOR_ORDER.map(function(c) { return COLOR_HEX[c]; }));
	charaobj = makeDoughnut('charaChart', ['キャラ1', 'キャラ2', 'キャラ3', COMMON, 'その他'],
		[CHARA_COLORS[0], CHARA_COLORS[1], CHARA_COLORS[2], '#c9cbcf', '#ff6384']);
}

function updatechart()
{
	if(!costobj) return;
	var cost = [0, 0, 0, 0];
	var col = COLOR_ORDER.map(function(){ return 0; });
	var names = deckCharaNames();
	var labels = [names[0] || 'キャラ1', names[1] || 'キャラ2', names[2] || 'キャラ3', COMMON, 'その他'];
	var ch = [0, 0, 0, 0, 0];

	for(var i = 0; i < actionArr.length; i++)
	{
		var c = actionArr[i];
		cost[Math.min(costNum(c), 3)]++;
		var ci = COLOR_ORDER.indexOf(c[COLOR]);
		if(ci >= 0) col[ci]++;
		if(c[CHARA] == COMMON) ch[3]++;
		else
		{
			var ni = names.indexOf(c[CHARA]);
			ch[ni >= 0 && ni < 3 ? ni : 4]++;
		}
	}

	costobj.data.datasets[0].data = cost; costobj.update();
	colorobj.data.datasets[0].data = col; colorobj.update();
	charaobj.data.labels = labels;
	charaobj.data.datasets[0].data = ch; charaobj.update();
}

function updateChartsTheme()
{
	var color = getLegendColor();
	[costobj, colorobj, charaobj].forEach(function(obj) {
		if(obj) { obj.options.plugins.legend.labels.color = color; obj.update(); }
	});
}

/* ========================================================= */
/*  Card preview                                              */
/* ========================================================= */

var bigPicLocked = false;
(function setupBigPicAltLock(){
	function setLocked(v) {
		if(v === bigPicLocked) return;
		bigPicLocked = v;
		window.bigPicLocked = v;
		document.body.classList.toggle('bigpic-locked', v);
	}
	function sync(e) { setLocked(!!e.altKey); }
	window.addEventListener('keydown', function(e) {
		if((e.key === 'Alt' || e.keyCode === 18) && !e.ctrlKey && !e.shiftKey && !e.metaKey) e.preventDefault();
		sync(e);
	}, true);
	window.addEventListener('keyup', sync, true);
	window.addEventListener('mousemove', sync, true);
	window.addEventListener('mouseover', sync, true);
	window.addEventListener('mousedown', sync, true);
	window.addEventListener('blur', function() { setLocked(false); });
})();

function onmouseShow(x, source)
{
	if(bigPicLocked) return;

	if(source == 'search') $('#cardinformation').css('margin', '150px 0px 0px 40px');
	else $('#cardinformation').css('margin', '150px 0px 0px 960px');

	var c = x.alt ? cardById[x.alt] : null;
	if(!c)
	{
		$("#cardinformation").css("visibility", "hidden");
		return;
	}

	$("#cardinformation").css("visibility", "visible");
	$("#big_pic").attr("src", cardImgSrc(c)).attr("alt", c[ID]);
	showInfotable(c);
}

function infoRow(label, value)
{
	return "<tr><td class='label'>" + label + "</td><td>" + value + "</td></tr>";
}

function showInfotable(c)
{
	var str = "";
	if(!c)
	{
		str += infoRow("カード番号", "");
		str += infoRow("カード名", "");
		str += infoRow("種類", "");
		$("#infoTable").html(str);
		return;
	}

	str += infoRow("カード番号", escapeHtml(c[ID]));
	str += infoRow("カード名", escapeHtml(c[NAME]));
	str += infoRow("種類", escapeHtml(c[TYPE]) + "カード");

	if(isChara(c))
	{
		str += infoRow("レベル", "Lv." + escapeHtml(c[LEVEL]));
		if(c[ATTR]) str += infoRow("属性", escapeHtml(c[ATTR]));
		if(c[WEAPON]) str += infoRow("武器", escapeHtml(c[WEAPON]));
		if(c[FORCE]) str += infoRow("所属", escapeHtml(c[FORCE]));
	}
	else
	{
		str += infoRow("色", "<i class='color-chip' style='background:" + COLOR_HEX[c[COLOR]] + "'></i>" + escapeHtml(c[COLOR]));
		str += infoRow("専用キャラ", c[CHARA] == COMMON ? "共通アクションカード" : "【" + escapeHtml(c[CHARA]) + "】");
		str += infoRow("コスト", escapeHtml(c[COST]));
		str += infoRow("スピード", escapeHtml(c[SPEED] === "" ? "-" : c[SPEED]));
		str += infoRow("ダメージ", escapeHtml(c[DAMAGE]));
		if(c[TAG]) str += infoRow("タグ", tagList(c).map(function(t) { return "＜" + escapeHtml(t) + "＞"; }).join(""));
	}

	var limitNote = [];
	if(BAN_LIST.indexOf(c[ID]) != -1) limitNote.push("禁止カード");
	if(LIMIT_LIST.indexOf(c[ID]) != -1) limitNote.push("制限カード (1枚)");
	if(limitNote.length) str += infoRow("<span style='color:#c62828;margin-top:0px;'>制限</span>", escapeHtml(limitNote.join(" / ")));

	if(c[TEXT]) str += "<tr><td colspan='2'>" + formatText(c[TEXT]) + "</td></tr>";

	var comment = "";
	try { comment = localStorage.getItem(c[ID] + COMMENT_SUFFIX) || ""; } catch(e) {}
	str += "<tr><td colspan='2'><textarea id='comment' placeholder='Comment' style='width: 96%; height: 40px; resize: vertical;' onchange=\"setComment('" + c[ID] + "')\">" + escapeHtml(comment) + "</textarea></td></tr>";

	$("#infoTable").html(str);
}

function formatText(t)
{
	// t uses <br>; escape everything else
	return t.split("<br>").map(function(line) {
		var s = escapeHtml(line);
		s = s.replace(/(【(?:リーダースキル|リーダー|優勢)】)/g, "<b style='color:#c2185b'>$1</b>");
		s = s.replace(/(【(?:対抗|判定|連撃|登場|レベルアップ|切り替え)】)/g, "<b style='color:#1565c0'>$1</b>");
		s = s.replace(/(【追撃\d+】)/g, "<b style='color:#2e7d32'>$1</b>");
		s = s.replace(/(【[^】]*(?:時|開始時|終了時)】)/g, "<b>$1</b>");
		return s;
	}).join("<br>");
}

function setComment(id)
{
	try {
		var v = $("#comment").val();
		if(v != "") localStorage.setItem(id + COMMENT_SUFFIX, v);
		else localStorage.removeItem(id + COMMENT_SUFFIX);
	} catch(e) {}
}

/* ========================================================= */
/*  Popup windows                                             */
/* ========================================================= */

function showPopup(containerId)
{
	var el = document.getElementById(containerId);
	el.style.display = "block";
	window.onmousedown = function(e) {
		if(e.target == el) el.style.display = "none";
	};
}

function openWindow(x)
{
	if(x == "view")
	{
		showDeckView();
		showPopup("window-container");
	}
	else
	{
		showList();
		showPopup("window-container-list");
	}
}

function viewRow(title, arr, w, h)
{
	var s = "<div class='view-row'><span class='view-title'>" + title + " (" + arr.length + ")</span>";
	for(var i = 0; i < arr.length; i++)
	{
		s += "<img width='" + w + "px' height='" + h + "px' src='" + cardImgSrc(arr[i]) + "' alt='' title='" + escapeHtml(arr[i][ID] + " " + arr[i][NAME]) + "'>";
	}
	return s + "</div>";
}

function showDeckView()
{
	var str = "";
	var title = $("#selectDeck").val() || "";
	if(title) str += "<div style='font-size:20px;font-weight:bold;margin-bottom:8px;'>" + escapeHtml(title) + "</div>";
	str += viewRow("キャラデッキ", charaArr, 143, 200);
	str += viewRow("アクションデッキ", actionArr, 115, 160);
	$("#deckView").html(str);
}

function groupList(arr)
{
	var list = [];
	for(var i = 0; i < arr.length; i++)
	{
		var found = false;
		for(var j = 0; j < list.length; j++)
		{
			if(list[j][0][ID] == arr[i][ID]) { list[j][1]++; found = true; break; }
		}
		if(!found) list.push([arr[i], 1]);
	}
	return list;
}

function listTable(title, arr)
{
	var g = groupList(arr);
	var s = "<br><b>" + title + " (" + arr.length + ")</b><br><br><table>";
	for(var i = 0; i < g.length; i++)
	{
		var c = g[i][0];
		var info = isChara(c) ? ("Lv." + c[LEVEL]) : (c[COLOR] + " C" + c[COST]);
		var owner = isChara(c) ? "" : (c[CHARA] == COMMON ? "共通" : "【" + c[CHARA] + "】");
		s += "<tr><td style='width: 30px;'>" + g[i][1] + "</td><td style='width: 90px;'>" + escapeHtml(c[ID]) + "</td><td style='width: 60px;'>" + escapeHtml(info) + "</td><td>" + escapeHtml(c[NAME]) + "</td><td style='padding-left: 10px; color: #888;'>" + escapeHtml(owner) + "</td></tr>";
	}
	return s + "</table>";
}

function showList()
{
	var str = "<table><tr><td style='vertical-align: top;'>";
	str += listTable("キャラデッキ", charaArr);
	str += "</td><td style='vertical-align: top; padding-left: 60px;'>";
	str += listTable("アクションデッキ", actionArr);
	str += "</td></tr></table>";
	$("#decklist").html(str);
}

/* ========================================================= */
/*  Deck code / save / load                                   */
/* ========================================================= */

function buildCode()
{
	var ids = function(arr) { return arr.map(function(c) { return c[ID]; }); };
	return ["chara"].concat(ids(charaArr)).join(",") + "\n" +
		["action"].concat(ids(actionArr)).join(",");
}

function parseCode(text)
{
	var ch = [], ac = [], unknown = [];
	var lines = String(text || "").replace(/\r/g, "").split("\n");
	for(var i = 0; i < lines.length; i++)
	{
		var parts = lines[i].split(",").map(function(x) { return x.trim(); }).filter(function(x) { return x != ""; });
		if(parts.length == 0) continue;
		if(!cardById[parts[0]]) parts.shift();	// header (chara / action)
		for(var j = 0; j < parts.length; j++)
		{
			var c = cardById[parts[j].toUpperCase()];
			if(!c) { unknown.push(parts[j]); continue; }
			if(isChara(c)) ch.push(c); else ac.push(c);
		}
	}
	return { chara: ch, action: ac, unknown: unknown };
}

function applyCode(text)
{
	var r = parseCode(text);
	charaArr = r.chara.slice(0, CHARA_MAX);
	actionArr = r.action.slice(0, ACTION_MAX);
	sortChara(); sortAction();
	showAlldeck();
	if(r.unknown.length) toast("不明なカード番号: " + r.unknown.join(", "));
}

function openCodeWindow()
{
	$("#textCode").val(buildCode());
	$("#deckTitle").val($("#selectDeck").val() || $("#deckTitle").val() || "Simple Deck");
	$("#deckStr").html("&emsp;");
	showPopup("window-container-code");
}

function loadFromCode()
{
	applyCode($("#textCode").val());
	$("#deckStr").html("Deck code loaded.");
}

function downloadDeck()
{
	var content = buildCode();
	$("#textCode").val(content);
	var blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
	var a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.setAttribute('download', ($("#deckTitle").val() || "deck") + ".csv");
	a.click();
}

function readSingleFile(evt)
{
	var f = evt.target.files[0];
	if(!f) { alert("Failed to load file"); return; }
	$("#deckTitle").val(f.name.replace(/\.(csv|txt)$/i, ""));
	var r = new FileReader();
	r.onload = function(e) {
		$("#textCode").val(e.target.result);
		applyCode(e.target.result);
		$("#deckStr").html("Deck file loaded.");
	};
	r.readAsText(f);
	$("#fileinput").val("");
}

function copyClipboard()
{
	var t = document.querySelector('#textCode');
	t.select();
	try {
		if(navigator.clipboard) navigator.clipboard.writeText(t.value);
		else document.execCommand('copy');
	} catch(e) { document.execCommand('copy'); }
	$("#deckStr").html("Deck code copied!");
}

function saveDeckNameList()
{
	try { localStorage.setItem(DECK_LIST_KEY, JSON.stringify(deckNamelist)); } catch(e) {}
}

function onloaddeck()
{
	try {
		deckNamelist = JSON.parse(localStorage.getItem(DECK_LIST_KEY)) || [];
	} catch(e) {
		deckNamelist = [];
	}
	updateDecklist("");
}

function updateDecklist(select)
{
	var str = "<option value=''>--Select Deck--</option>";
	for(var i = 0; i < deckNamelist.length; i++)
	{
		var n = escapeHtml(deckNamelist[i]);
		str += "<option value='" + n + "'" + (select == deckNamelist[i] ? " selected" : "") + ">" + n + "</option>";
	}
	$("#selectDeck").html(str);
}

function selectDeck()
{
	var deck = $("#selectDeck").val();
	if(!deck) { dataInit(); return; }
	var code = "";
	try { code = localStorage.getItem(DECK_KEY_PREFIX + deck) || ""; } catch(e) {}
	applyCode(code);
}

function addDecklist()
{
	var title = $.trim($("#deckTitle").val());
	if(title == "") { alert("Do not set empty string as title."); return; }

	var exists = deckNamelist.indexOf(title) != -1;
	if(exists && !confirm("Deck exist. Do you want to overwrite it?")) return;

	applyCode($("#textCode").val());
	try { localStorage.setItem(DECK_KEY_PREFIX + title, buildCode()); } catch(e) { alert("Failed to save deck."); return; }
	if(!exists) deckNamelist.push(title);
	saveDeckNameList();
	updateDecklist(title);
	$("#deckStr").html("Deck has been added.");
}

function deletedecklist()
{
	var deck = $("#selectDeck").val();
	if(!deck) return;
	if(!confirm("It will delete this deck. Are you sure?")) return;
	try { localStorage.removeItem(DECK_KEY_PREFIX + deck); } catch(e) {}
	var idx = deckNamelist.indexOf(deck);
	if(idx != -1) deckNamelist.splice(idx, 1);
	saveDeckNameList();
	updateDecklist("");
	dataInit();
}

function resetAllDecks()
{
	if(!confirm("Delete ALL saved decks? This cannot be undone.")) return;
	for(var i = 0; i < deckNamelist.length; i++)
	{
		try { localStorage.removeItem(DECK_KEY_PREFIX + deckNamelist[i]); } catch(e) {}
	}
	deckNamelist = [];
	saveDeckNameList();
	updateDecklist("");
	$("#deckStr").html("All saved decks were deleted.");
}

/* ========================================================= */
/*  Comment manager                                           */
/* ========================================================= */

function collectCurrentComments()
{
	var obj = {};
	try {
		for(var i = 0; i < localStorage.length; i++)
		{
			var k = localStorage.key(i);
			if(k && k.length > COMMENT_SUFFIX.length && k.slice(-COMMENT_SUFFIX.length) == COMMENT_SUFFIX)
			{
				obj[k.slice(0, -COMMENT_SUFFIX.length)] = localStorage.getItem(k);
			}
		}
	} catch(e) {}
	return obj;
}

function openCommentManager()
{
	$("#textCommentCode").val(JSON.stringify(collectCurrentComments(), null, 2));
	$("#commentStr").html("&emsp;");
	showPopup("window-container-comment");
}

function applyCommentText()
{
	var obj;
	try { obj = JSON.parse($("#textCommentCode").val()); } catch(e) { $("#commentStr").html("Invalid JSON."); return; }
	var n = 0;
	for(var k in obj)
	{
		if(!cardById[k]) continue;
		try {
			if(obj[k]) localStorage.setItem(k + COMMENT_SUFFIX, String(obj[k]));
			else localStorage.removeItem(k + COMMENT_SUFFIX);
			n++;
		} catch(e) {}
	}
	$("#commentStr").html(n + " comment(s) applied.");
}

function downloadCommentBlob()
{
	var content = JSON.stringify(collectCurrentComments(), null, 2);
	var blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
	var a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.setAttribute('download', "wwb_comment.json");
	a.click();
}

function copyCommentClipboard()
{
	var t = document.querySelector('#textCommentCode');
	t.select();
	try {
		if(navigator.clipboard) navigator.clipboard.writeText(t.value);
		else document.execCommand('copy');
	} catch(e) { document.execCommand('copy'); }
	$("#commentStr").html("Comment copied!");
}

function readSingleCommentFile(evt)
{
	var f = evt.target.files[0];
	if(!f) return;
	var r = new FileReader();
	r.onload = function(e) {
		$("#textCommentCode").val(e.target.result);
		applyCommentText();
	};
	r.readAsText(f);
	$("#commentFileinput").val("");
}

function resetAllComments()
{
	if(!confirm("Delete ALL comments? This cannot be undone.")) return;
	var obj = collectCurrentComments();
	for(var k in obj)
	{
		try { localStorage.removeItem(k + COMMENT_SUFFIX); } catch(e) {}
	}
	$("#textCommentCode").val("{}");
	$("#commentStr").html("All comments were deleted.");
}

/* ========================================================= */
/*  Dark mode                                                 */
/* ========================================================= */

function updateDarkModeButton()
{
	var btn = document.getElementById('darkModeToggle');
	if(btn) btn.textContent = document.body.classList.contains('dark-mode') ? '☀ Light' : '🌙 Dark';
}

function swapImageForDarkMode(img, isDark)
{
	var src = img.getAttribute('src');
	if(!src || src.indexOf("img/") != 0) return;
	var pairs = [["empty.jpg", "empty_black.jpg"], ["cancel_icon.png", "cancel_icon_black.png"], ["larrow.png", "larrow_black.png"], ["rarrow.png", "rarrow_black.png"]];
	for(var i = 0; i < pairs.length; i++)
	{
		if(isDark && src == "img/" + pairs[i][0]) { img.setAttribute('src', "img/" + pairs[i][1]); return; }
		if(!isDark && src == "img/" + pairs[i][1]) { img.setAttribute('src', "img/" + pairs[i][0]); return; }
	}
}

function applyDarkModeImages()
{
	var isDark = document.body.classList.contains('dark-mode');
	var imgs = document.getElementsByTagName('img');
	for(var i = 0; i < imgs.length; i++) swapImageForDarkMode(imgs[i], isDark);
}

function toggleDarkMode()
{
	document.body.classList.toggle('dark-mode');
	var isDark = document.body.classList.contains('dark-mode');
	try { localStorage.setItem(DARK_KEY, isDark ? '1' : '0'); } catch(e) {}
	updateDarkModeButton();
	updateChartsTheme();
	applyDarkModeImages();
}

/* ========================================================= */
/*  About                                                     */
/* ========================================================= */

function showVersion()
{
	var str = "";
	str += "鳴潮：対決 Deck Builder\n";
	str += "(based on WIXOSS_deckeditor by ZZZ)\n";
	str += "\n";
	str += "20261028 v1.00\n";
	str += "1.First release.\n";
	str += "2.收錄 スターターデッキ01／02、ブースターパック01 (123 種カード番号；★★以上・PR 異圖不另收)\n";
	str += "3.加卡上限：キャラデッキ 15 枚・同番號1枚；アクションデッキ 40 枚・同番號3枚 (不做構築規則檢查)\n";
	str += "\n";
	str += "資料・卡圖來源: 鳴潮：対決 トレーディングカードゲーム 公式サイト\n";

	alert(str);
}

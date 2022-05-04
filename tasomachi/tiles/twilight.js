function sliderX() {
	document.getElementById('side').classList.toggle("panelHidden"),
	document.getElementById('slider').classList.toggle("slider")
}

function sliderM() {
	document.getElementById('side').classList.toggle("panelHiddenM"),
	document.getElementById('sliderM').classList.toggle("sliderMx")
}

var SW = L.latLng( - 305, -120),
NE = L.latLng(135, 487),
bounds = L.latLngBounds(SW, NE);

var map = L.map('lmap', {
	crs: L.CRS.Simple,
	minZoom: 1,
	maxZoom: 4,
	maxNativeZoom: 4,
	maxBounds: bounds,
	zoom: 3,
	tap: false,
	doubleClickZoom: true,
	center: new L.latLng( - 27, 51)
});

var opt = {
	tileSize: L.point(192, 192)
};
shiokaze = L.tileLayer('shiokaze/tiles/{z}/{x}/{y}.webp', opt);
futago = L.tileLayer('futago/tiles/{z}/{x}/{y}.webp', opt);
gengetsu = L.tileLayer('gengetsu/tiles/{z}/{x}/{y}.webp', opt);

shiokaze.addTo(map);

map.setView([ - 93, 135], 2);

map.zoomControl.setPosition('bottomleft');

var customPopup = {
	'maxWidth': '300',
	'className': 'customPopup'
},
 contentPopup = "";

var shioKensaku = new L.layerGroup(), 
futaKensaku = new L.layerGroup(),
genKensaku = new L.layerGroup(),
mkS = 40,
mkC = mkS / 2 - 3.5,
mkP = -mkS - 2,
shioMKe = [],
shioMKf = [],
shioMKc = [],
shioMKn = [],
shioMKco = [],
futaMKe = [],
futaMKf = [],
futaMKc = [],
futaMKn = [],
futaMKco = [],
genMKe = [],
genMKf = [],
genMKn = [],
genMKco = [],
genMKc = [];

for (i = 0; i < itemData.shioItems.length; i++) {
	let j = itemData.shioItems[i],
	icon = L.icon({
		iconUrl: 'tiles/Sprite/icon/' + j.locationCategory + '.png',
		iconSize: [40, ],
		iconAnchor: [mkC, mkS],
		shadowSize: [0, 0],
		popupAnchor: [0, mkP],
	});

	let mkShio = new L.marker(new L.latLng([ - j.h, j.s]), {
		icon: icon,
		title: j.name
	}).bindPopup("<h3>" + j.name + "</h3><br>" + j.content, customPopup);
	shioKensaku.addLayer(mkShio);

	switch (j.locationCategory) {
	case "shio-earth-src":
		shioMKe.push(mkShio);
		break;
	case "shio-fur":
		shioMKf.push(mkShio);
		break;
	case "shio-costume":
		shioMKc.push(mkShio);
		break;
	case "shio-note":
		shioMKn.push(mkShio);
		break;
	case "shio-corrupt":
		shioMKco.push(mkShio);
		break;
	}
}

for (i = 0; i < itemData.futaItems.length; i++) {
	let j = itemData.futaItems[i],
	icon = L.icon({
		iconUrl: 'tiles/Sprite/icon/' + j.locationCategory + '.png',
		iconSize: [40, ],
		iconAnchor: [mkC, mkS],
		shadowSize: [0, 0],
		popupAnchor: [0, mkP],
	});

	let mkFuta = new L.marker(new L.latLng([ - j.h, j.s]), {
		icon: icon,
		title: j.name
	}).bindPopup("<h3>" + j.name + "</h3><br>" + j.content, customPopup);
	futaKensaku.addLayer(mkFuta);

	switch (j.locationCategory) {

	case "futa-earth-src":
		futaMKe.push(mkFuta);
		break;
	case "futa-fur":
		futaMKf.push(mkFuta);
		break;
	case "futa-costume":
		futaMKc.push(mkFuta);
		break;
	case "futa-note":
		futaMKn.push(mkFuta);
		break;
	case "futa-corrupt":
		futaMKco.push(mkFuta);
		break;

	}
}

for (i = 0; i < itemData.genItems.length; i++) {
	let j = itemData.genItems[i],
	icon = L.icon({
		iconUrl: 'tiles/Sprite/icon/' + j.locationCategory + '.png',
		iconSize: [40, ],
		iconAnchor: [mkC, mkS],
		shadowSize: [0, 0],
		popupAnchor: [0, mkP],
	});

	let mkGen = new L.marker(new L.latLng([ - j.h, j.s]), {
		icon: icon,
		title: j.name
	}).bindPopup("<h3>" + j.name + "</h3><br>" + j.content, customPopup);
	genKensaku.addLayer(mkGen);

	switch (j.locationCategory) {
	case "gen-earth-src":
		genMKe.push(mkGen);
		break;
	case "gen-fur":
		genMKf.push(mkGen);
		break;
	case "gen-costume":
		genMKc.push(mkGen);
		break;
	case "gen-note":
		genMKn.push(mkGen);
		break;
	case "gen-corrupt":
		genMKco.push(mkGen);
		break;

	}
}

var she = L.layerGroup(shioMKe),
shc = L.layerGroup(shioMKc),
shf = L.layerGroup(shioMKf),
shn = L.layerGroup(shioMKn),
sho = L.layerGroup(shioMKco),
sh = [she, shc, shf, shn, sho],

gee = L.layerGroup(genMKe),
gec = L.layerGroup(genMKc),
gef = L.layerGroup(genMKf),
gen = L.layerGroup(genMKn),
geo = L.layerGroup(genMKco),
ge = [gee, gec, gef, gen, geo],

fue = L.layerGroup(futaMKe),
fuc = L.layerGroup(futaMKc),
fun = L.layerGroup(futaMKn),
fuo = L.layerGroup(futaMKco),
fuf = L.layerGroup(futaMKf),
fu = [fue, fuc, fun, fuo, fuf];

function sideSwiper() {
	if (window.screen.width < 1300) {
		sliderM()
	}
}



var shioKensakuCtrl = new L.Control.Search({
	position: 'topleft',
	container: 'kensaku',
	textPlaceholder: '请输入物品名称后按回车搜索1....',
	textErr: '未搜索到相关内容',
	layer: shioKensaku,
	initial: false,
	zoom: 4,
	delayType: 40,
	collapsed: false,
	marker: false
})

map.addControl(shioKensakuCtrl);
shioKensakuCtrl.on('search:locationfound',
function(e) {
	e.layer.openPopup();
	sideSwiper();

});
var futaKensakuCtrl = new L.Control.Search({
	position: 'topleft',
	container: 'kensaku',
	textPlaceholder: '请输入物品名称后按回车搜索2....',
	textErr: '未搜索到相关内容',
	layer: futaKensaku,
	initial: false,
	zoom: 4,
	delayType: 40,
	collapsed: false,
	marker: false
})
futaKensakuCtrl.on('search:locationfound',
function(e) {
	e.layer.openPopup();
	sideSwiper();
});

var genKensakuCtrl = new L.Control.Search({
	position: 'topleft',
	container: 'kensaku',
	textPlaceholder: '请输入物品名称后按回车搜索3....',
	textErr: '未搜索到相关内容',
	layer: genKensaku,
	initial: false,
	zoom: 4,
	delayType: 40,
	collapsed: false,
	marker: false
})
genKensakuCtrl.on('search:locationfound',
function(e) {
	e.layer.openPopup();
	sideSwiper();
});

for (u = 0; u < sh.length; u++) {
	map.addLayer(sh[u])
}

function kensakuSweeper() {
	map.removeControl(shioKensakuCtrl);
	map.removeControl(futaKensakuCtrl);
	map.removeControl(genKensakuCtrl);
}

function sweeper(x) {
	if (x === 'shio') {
		shiokaze.addTo(map);
		futago.removeFrom(map);
		gengetsu.removeFrom(map);
		for (u = 0; u < sh.length; u++) {
			map.addLayer(sh[u]);
			fu[u].removeFrom(map);
			ge[u].removeFrom(map)
		}
	} else if (x === 'futa') {
		futago.addTo(map);
		shiokaze.removeFrom(map);
		gengetsu.removeFrom(map);
		for (u = 0; u < fu.length; u++) {
			map.addLayer(fu[u]);
			sh[u].removeFrom(map);
			ge[u].removeFrom(map)
		}
	} else if (x === 'gen') {
		gengetsu.addTo(map);
		shiokaze.removeFrom(map);
		futago.removeFrom(map);
		for (u = 0; u < ge.length; u++) {
			map.addLayer(ge[u]);
			sh[u].removeFrom(map);
			fu[u].removeFrom(map)
		}
	}
}

function mapShow(x) {
	let s = document.querySelector("#groupShio"),
	f = document.querySelector("#groupFu"),
	g = document.querySelector("#groupGen"),
	sx = document.getElementsByName('shiokaze'),
	fx = document.getElementsByName('futago'),
	gx = document.getElementsByName('gen'),
	sy = document.getElementsByName('shiokazeSQ'),
	fy = document.getElementsByName('futagoSQ'),
	gy = document.getElementsByName('genSQ');

	switch (x) {
	case "shio":
		sweeper('shio');

		s.setAttribute('style', 'display:block');
		f.setAttribute('style', 'display:none');
		g.setAttribute('style', 'display:none');
		for (u = 0; u < sx.length; u++) {
			sx[u].setAttribute("value", "show");
			sx[u].classList.remove('transprt');
			sy[u].classList.remove('displayNone')
		};

		kensakuSweeper();
		map.addControl(shioKensakuCtrl);

		break;

	case "futa":

		sweeper('futa');

		s.setAttribute('style', 'display:none');
		f.setAttribute('style', 'display:block');
		g.setAttribute('style', 'display:none');
		for (u = 0; u < fx.length; u++) {
			fx[u].setAttribute("value", "show");
			fx[u].classList.remove('transprt');
			fy[u].classList.remove('displayNone')
		};

		kensakuSweeper();
		map.addControl(futaKensakuCtrl);

		break;

	case "gen":
		sweeper('gen');
		s.setAttribute('style', 'display:none');
		f.setAttribute('style', 'display:none');
		g.setAttribute('style', 'display:block');
		for (u = 0; u < gx.length; u++) {
			gx[u].setAttribute("value", "show");
			gx[u].classList.remove('transprt');
			gy[u].classList.remove('displayNone')
		};
		kensakuSweeper();
		map.addControl(genKensakuCtrl);
		break;
	}
}


function henkanki(z) {

	let xa = document.getElementById(z);
	xb = document.getElementById(z + 'SQ');
	x = xa.getAttribute("value");
	y = eval(z);

	switch (x) {
	case "hidden":
		y.addTo(map);
		xa.setAttribute("value", "show");
		xb.classList.remove('displayNone');
		xa.classList.remove('transprt');
		break;

	case "show":
		y.removeFrom(map);
		xa.setAttribute("value", "hidden");
		xa.classList.add('transprt');
		xb.classList.add('displayNone');
		break;
	}
}


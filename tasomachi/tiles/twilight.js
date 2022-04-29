
function sliderX() {
    document.getElementById('side').classList.toggle("panelHidden"),
    document.getElementById('slider').classList.toggle("slider")
}
 
function sliderM() {
    document.getElementById('side').classList.toggle("panelHiddenM"),
    document.getElementById('sliderM').classList.toggle("sliderMx")
}
 

//设定边界范围
var   SW = L.latLng(-305,-120),
       NE = L.latLng(135, 487),
       bounds = L.latLngBounds(SW, NE);

//定义地图
var map = L.map('lmap', {
    crs: L.CRS.Simple,
    minZoom: 1,
    maxZoom:4,
    maxNativeZoom: 4, 
    maxBounds: bounds, //最大边界
    zoom:3,
    tap: false, 
    doubleClickZoom: true,
    center:new L.latLng(-27,51)});

//读取瓦片
var opt = {tileSize: L.point(192, 192)};
shiokaze=L.tileLayer('shiokaze/tiles/{z}/{x}/{y}.png', opt);
futago=L.tileLayer('futago/tiles/{z}/{x}/{y}.png', opt);
gengetsu=L.tileLayer('gengetsu/tiles/{z}/{x}/{y}.png', opt);
 
shiokaze.addTo(map);

map.setView([-93,135], 2);

//设定缩放按钮属性
map.zoomControl.setPosition('bottomleft');


//获取坐标
function showCood(i) {
    document.getElementById("coodL").innerHTML = "当前坐标---" + i.latlng};
    map.on('click', showCood);

var customPopup =
        {
            'maxWidth': '300',
            'className': 'customPopup'            
        }
var contentPopup = "" 

//---------------pre search-------------------
var shioKensaku =new L.layerGroup(); //定义搜索组
      futaKensaku =new L.layerGroup(); 
      genKensaku =new L.layerGroup(); 

//map.addLayer(shioKensaku); //将搜索组添加到地图
//map.addLayer(genKensaku);
//map.addLayer(futaKensaku);


//-----------------------create markers-----------------------------
    //marker icon setting
    var MarkerIconSize = 40,
        MarkerIconCenter = MarkerIconSize / 2 -3.5,
        MarkerPopPosition = -MarkerIconSize - 2,

        shiokazeMKe=[], 
        shiokazeMKf=[],
        shiokazeMKc=[],
        shiokazeMKn=[],
        shiokazeMKco=[],
        futagoMKe=[], 
        futagoMKf=[],
        futagoMKc=[],
        futagoMKn=[],
        futagoMKco=[],
        gengetsuMKe=[], 
        gengetsuMKf=[],
        gengetsuMKn=[], 
        gengetsuMKco=[],
        gengetsuMKc=[];
        
//--------------------shiomk创建------------------------
    for (i = 0; i < itemData.shioItems.length; i++) {
//往各marker组内填充数据

let j = itemData.shioItems[i],
            icon = L.icon({
                iconUrl: 'tiles/Sprite/icon/' + j.locationCategory + '.png',
                iconSize: [40, ],
                iconAnchor: [MarkerIconCenter, MarkerIconSize],
                shadowSize: [0, 0],
                popupAnchor: [0, MarkerPopPosition],
            });
                
        let  mkShio =  new L.marker(new L.latLng([-j.h, j.s]),{icon: icon,title:j.name}).bindPopup(
            "<h3>" + j.name + "</h3><br>" + j.content, customPopup);
       shioKensaku.addLayer(mkShio);

//marker图层分组
           switch(j.locationCategory){
                case "shiokaze-earth-src":
                    shiokazeMKe.push(mkShio);
                    break;
                case "shiokaze-fur":
                    shiokazeMKf.push(mkShio);
                    break;
                case "shiokaze-costume":
                    shiokazeMKc.push(mkShio);
                    break;
                case "shiokaze-note":
                        shiokazeMKn.push(mkShio);
                        break;
                case "shiokaze-corrupt":
                        shiokazeMKco.push(mkShio);
                        break;
            }
    }
   
    //---------------------FUTA MKS---------------

    for (i = 0; i < itemData.futaItems.length; i++) {
        //往各marker组内填充数据
        
        let j = itemData.futaItems[i],
                    icon = L.icon({
                        iconUrl: 'tiles/Sprite/icon/' + j.locationCategory + '.png',
                        iconSize: [40, ],
                        iconAnchor: [MarkerIconCenter, MarkerIconSize],
                        shadowSize: [0, 0],
                        popupAnchor: [0, MarkerPopPosition],
                    });
                        
                let  mkFuta =  new L.marker(new L.latLng([-j.h, j.s]),{icon: icon,title:j.name}).bindPopup(
                    "<h3>" + j.name + "</h3><br>" + j.content, customPopup);
               futaKensaku.addLayer(mkFuta);
        
                   switch(j.locationCategory){
                    
                            case "futago-earth-src":
                                futagoMKe.push(mkFuta);
                                break;
                            case "futago-fur":
                                futagoMKf.push(mkFuta);
                                break;
                            case "futago-costume":
                                futagoMKc.push(mkFuta);
                                break;
                             case "futago-note":
                        futagoMKn.push(mkFuta);
                        break;
                        case "futago-corrupt":
                        futagoMKco.push(mkFuta);
                        break;
                                      
                    }
            }

//----------------------------gen MKS---------------------

for (i = 0; i < itemData.genItems.length; i++) {
    //往各marker组内填充数据
    
    let j = itemData.genItems[i],
                icon = L.icon({
                    iconUrl: 'tiles/Sprite/icon/' + j.locationCategory + '.png',
                    iconSize: [40, ],
                    iconAnchor: [MarkerIconCenter, MarkerIconSize],
                    shadowSize: [0, 0],
                    popupAnchor: [0, MarkerPopPosition],
                });
                    
            let  mkGen =  new L.marker(new L.latLng([-j.h, j.s]),{icon: icon,title:j.name}).bindPopup(
                "<h3>" + j.name + "</h3><br>" + j.content, customPopup);
           genKensaku.addLayer(mkGen);
    
               switch(j.locationCategory){                  
                            case "gengetsu-earth-src":
                                gengetsuMKe.push(mkGen);
                                break;
                            case "gengetsu-fur":
                                gengetsuMKf.push(mkGen);
                                break;
                            case "gengetsu-costume":
                                gengetsuMKc.push(mkGen);
                                break;
                            case "gengetsu-note":
                                    gengetsuMKn.push(mkGen);
                                    break;
                            case "gengetsu-corrupt":
                                    gengetsuMKco.push(mkGen);
                                    break;
                    
                }
        }


    //将marker分组
    var    she=L.layerGroup(shiokazeMKe),
            shc=L.layerGroup(shiokazeMKc),
            shf=L.layerGroup(shiokazeMKf),
            shn=L.layerGroup(shiokazeMKn),
            sho=L.layerGroup(shiokazeMKco),
            sh=[she,shc,shf,shn,sho],
            
            gee=L.layerGroup(gengetsuMKe),
            gec=L.layerGroup(gengetsuMKc),
            gef=L.layerGroup(gengetsuMKf),
            gen=L.layerGroup(gengetsuMKn),
            geo=L.layerGroup(gengetsuMKco),
         //   ge=L.layerGroup(gengetsuMKc.concat(gengetsuMKe,gengetsuMKf)),

            fue=L.layerGroup(futagoMKe),
            fuc=L.layerGroup(futagoMKc),
            fun=L.layerGroup(futagoMKn),
            fuo=L.layerGroup(futagoMKco),
            fuf=L.layerGroup(futagoMKf);

       // all=L.layerGroup(shiokazeMKc.concat(shiokazeMKe,shiokazeMKf,gengetsuMKc,gengetsuMKe,gengetsuMKf,futagoMKc,futagoMKe,futagoMKf));

         //   

           
//-----------------------deploy markers-----------------------------
          // all.addTo(map);
  //      const jr=[she,shc,shf,gee,gec,gef,fue,fuc,fuf,sh,ge,sh];
  //      for (u = 0; u < jr.length; u++){
  //          map.addLayer(jr[u])};
        
   //         all.removeFrom(map);
//搜索完自动关闭侧栏菜单函数
function sideSwiper(){
    if (window.screen.width<1300){
        sliderM()
    }

}



//------------------------------------------搜索
//SHIO搜索控件
var shioKensakuCtrl = new L.Control.Search({
    position:'topleft',		
    container:'kensaku',
    textPlaceholder: '请输入物品名称后按回车搜索1....',
    textErr: '未搜索到相关内容',
    layer: shioKensaku,
    initial: false, 
    zoom: 4, 
    delayType:40, 
    collapsed:false, //控制搜索框默认是否折叠
    marker: false})

map.addControl(shioKensakuCtrl);
shioKensakuCtrl.on('search:locationfound', function(e) {    
	e.layer.openPopup();
    sideSwiper();



});     //搜索完成后移动到相应位置

//futa搜索控件
var futaKensakuCtrl = new L.Control.Search({
    position:'topleft',		
    container:'kensaku',
    textPlaceholder: '请输入物品名称后按回车搜索2....',
    textErr: '未搜索到相关内容',
    layer: futaKensaku,
    initial: false, 
    zoom: 4, 
    delayType:40, 
    collapsed:false, 
    marker: false})
//map.addControl(futaKensakuCtrl);
futaKensakuCtrl.on('search:locationfound', function(e) {    
	e.layer.openPopup();
    sideSwiper();
});     

//gen搜索控件
var genKensakuCtrl = new L.Control.Search({
    position:'topleft',		
    container:'kensaku',
    textPlaceholder: '请输入物品名称后按回车搜索3....',
    textErr: '未搜索到相关内容',
    layer: genKensaku,
    initial: false, 
    zoom: 4, 
    delayType:40, 
    collapsed:false, 
    marker: false})
//map.addControl(genKensakuCtrl);
genKensakuCtrl.on('search:locationfound', function(e) {    
	e.layer.openPopup();
    sideSwiper();
});   



for (u = 0; u < sh.length; u++){map.addLayer(sh[u])}


   
  //===============================================       
            function mapShow(x){
                let s=document.querySelector("#groupShio"),
                    f=document.querySelector("#groupFu"),
                    g=document.querySelector("#groupGen"),
                    sx=document.getElementsByName('shiokaze'),
                    fx=document.getElementsByName('futago'),
                    gx=document.getElementsByName('gen'),
                    sy=document.getElementsByName('shiokazeSQ'),
                    fy=document.getElementsByName('futagoSQ'),
                    gy=document.getElementsByName('genSQ');

                    switch(x){
                     case "1":
                        shiokaze.addTo(map);
                        futago.removeFrom(map);
                        gengetsu.removeFrom(map);
                        map.addLayer(she);   map.addLayer(shc);   map.addLayer(shf); map.addLayer(shn);   map.addLayer(sho);
                        fue.removeFrom(map); fuc.removeFrom(map); fuf.removeFrom(map);fuo.removeFrom(map); fun.removeFrom(map);
                        gee.removeFrom(map); gec.removeFrom(map); gef.removeFrom(map);gen.removeFrom(map); geo.removeFrom(map);
                        
                        s.setAttribute('style', 'display:block'); f.setAttribute('style', 'display:none');g.setAttribute('style', 'display:none');
                        for (u = 0; u < sx.length; u++){sx[u].setAttribute("value", "show") ;sx[u].classList.remove('transprt');sy[u].classList.remove('displayNone')};
                        map.removeControl(shioKensakuCtrl);map.removeControl(futaKensakuCtrl);map.removeControl(genKensakuCtrl);map.addControl(shioKensakuCtrl)

                         break;

                     case "2":
                         futago.addTo(map);
                         shiokaze.removeFrom(map);
                         gengetsu.removeFrom(map);
                         map.addLayer(fue);   map.addLayer(fuc);   map.addLayer(fuf);map.addLayer(fun);   map.addLayer(fuo);
                         gee.removeFrom(map); gec.removeFrom(map); gef.removeFrom(map);gen.removeFrom(map); geo.removeFrom(map);
                         she.removeFrom(map); shc.removeFrom(map); shf.removeFrom(map);shn.removeFrom(map); sho.removeFrom(map);


                         s.setAttribute('style', 'display:none'); f.setAttribute('style', 'display:block');g.setAttribute('style', 'display:none');
                         for (u = 0; u < fx.length; u++){fx[u].setAttribute("value", "show") ;fx[u].classList.remove('transprt');fy[u].classList.remove('displayNone')};

                         map.removeControl(shioKensakuCtrl);map.removeControl(futaKensakuCtrl);map.removeControl(genKensakuCtrl);map.addControl(futaKensakuCtrl);



                         break;

                     case "3":
                         shiokaze.removeFrom(map);
                         futago.removeFrom(map);
                         gengetsu.addTo(map);
                         map.addLayer(gee);   map.addLayer(gec);   map.addLayer(gef);map.addLayer(gen);   map.addLayer(geo);
                         she.removeFrom(map); shc.removeFrom(map); shf.removeFrom(map);shn.removeFrom(map); sho.removeFrom(map);
                         fue.removeFrom(map); fuc.removeFrom(map); fuf.removeFrom(map);fuo.removeFrom(map); fun.removeFrom(map);

                         
                         s.setAttribute('style', 'display:none'); f.setAttribute('style', 'display:none');g.setAttribute('style', 'display:block');
                         for (u = 0; u < gx.length; u++){gx[u].setAttribute("value", "show") ;gx[u].classList.remove('transprt');gy[u].classList.remove('displayNone')};
                         map.removeControl(shioKensakuCtrl);map.removeControl(futaKensakuCtrl);map.removeControl(genKensakuCtrl);map.addControl(genKensakuCtrl);
                         break;
             }}
            
    //mapShow(1);


//切换marker显示

function henkanki(z) {

   let      xa=document.getElementById(z);
            xb=document.getElementById(z+'SQ');
            x=xa.getAttribute("value");
            y= eval(z);
   
    switch(x){
    case "hidden": 
    y.addTo(map);
    xa.setAttribute("value", "show") ;
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





//================移动端搜索


var searcherM = new L.Control.Search({
    position:'topleft',		
    container:'kensakuM',
    textPlaceholder: '',
    textErr: '未搜索到相关内容',
    layer: markerSearch,
    initial: false, 
    zoom: 4, 
    delayType:40, 
    collapsed:false, //控制搜索框默认是否折叠
    marker: false})
map.addControl(searcherM);



searcherM.on('search:locationfound', function(e) {    
	e.layer.openPopup();
    let jx=document.getElementById("kensakuM");

    jx.style.height="0"; 
        document.querySelector("#searchtext10").setAttribute('style', 'height: 0px; border: 0px solid #FFAB00');
        document.querySelector("#kensakuM > div > a.search-button").setAttribute('style', 'height: 0px; border: 0px solid #FFAB00');
        jx.setAttribute("value", "hidden") ;
        document.querySelector("#kensakuM > div > ul").setAttribute('style', 'display:none');
        document.querySelector("#kensakuM > div > a.search-cancel").setAttribute('style', 'display:none');
       
        let jy=document.getElementById("menuM");
        jz=jy.getAttribute("value");
    //console.log(jz);
        if(jz=="show"){
        jy.style.height="0"; 
        jy.setAttribute("value", "hidden") ;
}
});  


if (window.screen.width<330){
    alert('屏幕分辨率宽度过低，会影响部分显示效果')
};





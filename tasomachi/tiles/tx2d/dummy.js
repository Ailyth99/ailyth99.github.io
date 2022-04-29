//function itemSW(x) {  
//    document.getElementById(x+'SQ').classList.toggle("displayNone");
//    document.getElementById(x).classList.toggle("transprt");
//}

function kskM() {
    let jx=document.getElementById("kensakuM");
        jz=jx.getAttribute("value");
    //console.log(jz);
    
    switch(jz){
        case 'hidden':
        jx.style.height="3.1rem"; 
        document.querySelector("#searchtext10").setAttribute('style', 'height: 42px; border: 1px solid #FFAB00');
        document.querySelector("#kensakuM > div > a.search-button").setAttribute('style', 'height: 42px; border: 1px solid #FFAB00');
        document.querySelector("#kensakuM > div > ul").setAttribute('style', 'display:block ');
        document.querySelector("#kensakuM > div > a.search-cancel").setAttribute('style', 'display:block');
        jx.setAttribute("value", "show") ;
        break;

      case 'show':
        jx.style.height="0"; 
        document.querySelector("#searchtext10").setAttribute('style', 'height: 0px; border: 0px solid #FFAB00');
        document.querySelector("#kensakuM > div > a.search-button").setAttribute('style', 'height: 0px; border: 0px solid #FFAB00');
        jx.setAttribute("value", "hidden") ;
        document.querySelector("#kensakuM > div > ul").setAttribute('style', 'display:none');
        document.querySelector("#kensakuM > div > a.search-cancel").setAttribute('style', 'display:none');
        break;}
}

function menuM() {
    let jx=document.getElementById("menuM");
        jz=jx.getAttribute("value");
    //console.log(jz);
    
    switch(jz){
        case 'hidden':
        jx.style.height="80vh"; 
        jx.setAttribute("value", "show") ;
        break;

      case 'show':
        jx.style.height="0"; 
        jx.setAttribute("value", "hidden") ;
        break;}
    }

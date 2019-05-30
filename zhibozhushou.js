
let zhibo_plugin = Plugin.getPluginByName("直播助手");
let zhibo_config = JSON.parse(fs.readFileSync(zhibo_plugin.path + "plugin.json"))
// 直播助手
function createFollow(){
    swal.fire({
        title: '请填写主播的个人空间地址，目前支持B站&斗鱼',
        input: 'text',
        inputAttributes: {
          autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: '拾取信息',
        cancelButtonText: '取消',
        showLoaderOnConfirm: true,
        preConfirm: (login) => {
            if(login !=undefined && login.indexOf("space.bilibili.com")>0){
                let platform = "B站"
                
                let uid = login.replace("https://space.bilibili.com/","").replace("/","")
                if(getZhiBoById(uid) >= 0){
                    return  { err: "error", title: " 已经关注此主播！" };
                }
                return fetch(`https://api.bilibili.com/x/space/acc/info?mid=${uid}`).then(response =>response.json())
                .then(data => {
                    userinfo = data.data;
                    return {
                        name:userinfo.name,
                        avatar:userinfo.face,
                        platform:platform,
                        uid:uid
                    }
                })
                
            }else if(login !=undefined && login.indexOf("yuba.douyu.com/group")>0){
                let platform = "斗鱼"
                let uid = login.replace("https://yuba.douyu.com/group/","").replace("/","")
                return fetch(`https://yuba.douyu.com/wbapi/web/group/head?group_id=${uid}`)
                .then(response =>response.json())
                .then(data => {
                    userinfo = data.data;
                    if(getZhiBoById(userinfo.safe_anchor_id) >= 0){
                        return { err: "error", title: " 已经关注此主播！" };
                    }
                    return {
                        name:userinfo.group_name,
                        avatar:userinfo.avatar,
                        platform:platform,
                        uid:userinfo.safe_anchor_id
                    }
                })
            }else{
                return {err:"error",title:"输入有误，没有查到相关主播信息！不是直播间地址而是主播个人空间地址哟！"};
            }
            
        },
        allowOutsideClick: () => !Swal.isLoading()
      }).then((result) => {
        if (result.value) {
            let data = result.value
            if(data.err != undefined){
                Toast({ type: data.err , title:data.title });
                return;
            }
            swal.fire({
                title: `${result.value.name}-${result.value.platform}-${result.value.uid}`,
                imageUrl: result.value.avatar,
                confirmButtonText: '确定',
            }).then((result)=>{
                
                if(result.value){
                    if(zhibo_config.zhibo != undefined && zhibo_config.zhibo instanceof Array){
                        zhibo_config.zhibo.push(data)
                    }else{
                        zhibo_config.zhibo = []
                        zhibo_config.zhibo.push(data)
                    }
                    
                    if(data.platform == "B站"){
                        biliLiveStart(data.uid).then(()=>{
                            fs.writeFileSync(zhibo_plugin.path + "plugin.json", JSON.stringify(zhibo_config, null, 4));
                            reloadFollowZhiBo();
                        })
                    }else if(data.platform == "斗鱼"){
                        
                        douyuLiveStart(data.uid).then(()=>{
                            fs.writeFileSync(zhibo_plugin.path + "plugin.json", JSON.stringify(zhibo_config, null, 4));
                            reloadFollowZhiBo();
                        })
                    }
                }
            })
        }
      })
}
let template_tab = `
<div class="tab">
<h2>直播助手</h2>
<div class="list" style="text-align: right;"><button onclick="createFollow();">添加关注</button></div>
<div class="list" id="zhibozhushou_list">
   {list}
</div>
</div>
<script>Controller.reInit()</script>
`;
let template_z = `
<div class="item"  id="zhibo-item-{uid}">
    <div class="image">
        <img  id="zhibo-item-{uid}-img" src="{avatar}" alt="">
    </div>
    <div class="info">
        <div><h4 class="item-title">{name}</h4></div>
        <div><p class="item-desc">所属平台-{platform}&nbsp;直播标题-{title}</p></div>
    </div>
    <div class="tags" style="width:80px;">
        <div><span><span id="flag_{uid}" class="tag {green}">{zhiboyufou}</span></span></div>
    </div>
    <div class="date">
        <div><span>{platform}</span></div>
    </div>
    <div class="handler" style="width:350px;">
        <button id="zhibo-item-{uid}-end-btn" onclick="shell.openExternal('{url}')">浏览器打开</button>
        <button id="zhibo-item-{uid}-start-btn" onclick="setZhoBoDesktop('{url}')">开启桌面直播</button>
        <button id="zhibo-item-{uid}-end-btn" onclick="removeZhiBoById(\'{uid}\');">移除关注</button>
    </div>
</div>
`;

function loadFollowZhiBo(){
    if(zhibo_config.zhibo == undefined || !zhibo_config.zhibo instanceof Array){
        zhibo_config.zhibo = []
        fs.writeFileSync(zhibo_plugin.path + "plugin.json", JSON.stringify(zhibo_config, null, 4));
    }
    let html = ""
    for(let i=0;i<zhibo_config.zhibo.length;i++){
        html += template_z.replace(/\{uid\}/g, zhibo_config.zhibo[i].uid)
        .replace(/\{avatar\}/g, zhibo_config.zhibo[i].avatar)
        .replace(/\{name\}/g, zhibo_config.zhibo[i].name)
        .replace(/\{platform\}/g, zhibo_config.zhibo[i].platform)
        .replace(/\{url\}/g, zhibo_config.zhibo[i].url)
        .replace(/\{title\}/g, zhibo_config.zhibo[i].title)
        .replace(/\{green\}/g, zhibo_config.zhibo[i].liveStatus > 0 ? "green":"")
        .replace(/\{zhiboyufou\}/g, zhibo_config.zhibo[i].liveStatus > 0 ? "正在直播":"未直播")
    }
    // 添加菜单
    $(".menu").append('<li><a href="javascript:void(0)"><img src="./images/zhibo.png"><span>直播助手</span></a></li>');
    // 添加列表
    $(".content").append(template_tab.replace("{list}",html));
}

function reloadFollowZhiBo(){
    if(zhibo_config.zhibo == undefined || !zhibo_config.zhibo instanceof Array){
        zhibo_config.zhibo = []
        fs.writeFileSync(zhibo_plugin.path + "plugin.json", JSON.stringify(zhibo_config, null, 4));
    }
    let html = ""
    for(let i=0;i<zhibo_config.zhibo.length;i++){
        html += template_z.replace(/\{uid\}/g, zhibo_config.zhibo[i].uid)
        .replace(/\{avatar\}/g, zhibo_config.zhibo[i].avatar)
        .replace(/\{name\}/g, zhibo_config.zhibo[i].name)
        .replace(/\{platform\}/g, zhibo_config.zhibo[i].platform)
        .replace(/\{url\}/g, zhibo_config.zhibo[i].url)
        .replace(/\{title\}/g, zhibo_config.zhibo[i].title)
        .replace(/\{green\}/g, zhibo_config.zhibo[i].liveStatus > 0 ? "green":"")
        .replace(/\{zhiboyufou\}/g, zhibo_config.zhibo[i].liveStatus > 0 ? "正在直播":"未直播")
    }
    $("#zhibozhushou_list").html(html);
}

function biliLiveStart(uid){
    return fetch("https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld?mid=" + uid)
    .then(response => response.json())
    .then(data => {
        let index = getZhiBoById(uid)
        zhibo_config.zhibo[index].liveStatus = data.data.liveStatus
        if(zhibo_config.zhibo[index].url != data.data.url){
            zhibo_config.zhibo[index].url = data.data.url
            zhibo_config.zhibo[index].title = data.data.title
        }
    }).then(()=>{changeStatus(uid)});
}
function douyuLiveStart(uid){
    return fetch("https://yuba.douyu.com/wbapi/web/group/getLiveInfo?uid=" + uid)
    .then(response => response.json())
    .then(data => {
        let index = getZhiBoById(uid)
        zhibo_config.zhibo[index].liveStatus = data.data.show_status
        zhibo_config.zhibo[index].url = "https://www.douyu.com/" + data.data.room_id
        zhibo_config.zhibo[index].title = data.data.room_name
    }).then(()=>{changeStatus(uid)});
}
function changeStatus(uid){
    if(zhibo_config.zhibo[getZhiBoById(uid)].liveStatus != 0){
        $("#flag_" + uid).addClass("green")
        $("#flag_" + uid).html("正在直播")
    }else{
        $("#flag_" + uid).removeClass("green")
        $("#flag_" + uid).html("未直播")
    }
}

function getZhiBoById(uid){
    for(let i=0;i<zhibo_config.zhibo.length;i++){
        if(zhibo_config.zhibo[i].uid == uid){
            return i;
        }
    }
}
function setZhoBoDesktop(url){
    let displays = electron.screen.getAllDisplays();
    let selector = [];
    for (let i = 0; i < displays.length; i++) {
        selector[i] = "显示器-" + (i + 1)
    }
    swal.fire({
        title: '请选择显示器',
        input: 'select',
        inputOptions: selector,
        inputPlaceholder: '请选择显示器',
        showCancelButton: true,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
    }).then(function (dis) {
        if (dis.value) {
            Controller.changeDesktop(parseInt(dis.value), 'web', url);
        }
    })
}
function removeZhiBoById(uid){
    for(let i=0;i<zhibo_config.zhibo.length;i++){
        if(zhibo_config.zhibo[i].uid == uid){
            zhibo_config.zhibo.splice(i, 1);
        }
    }
    fs.writeFileSync(zhibo_plugin.path + "plugin.json", JSON.stringify(zhibo_config, null, 4));
    $("#zhibo-item-" + uid).remove();
}

$(function(){
    loadFollowZhiBo();
    setInterval(function(){
        for(let i=0;i<zhibo_config.zhibo.length;i++){
            if(zhibo_config.zhibo[i].platform == "B站"){
                biliLiveStart(zhibo_config.zhibo[i].uid)
            }else if(zhibo_config.zhibo[i].platform == "斗鱼"){
                douyuLiveStart(zhibo_config.zhibo[i].uid)
            }
            
        }
    },2*60*1000);
});
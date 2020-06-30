	'use strict';

	// Import the Dialogflow module from the Actions on Google client library.
	const {
	  dialogflow,
	  Permission,
	  Suggestions,
	  SimpleResponse,
	  Button,
	  Image,
	  BasicCard,Carousel,
	  LinkOutSuggestion,
	  BrowseCarousel,BrowseCarouselItem,items,Table
	} = require('actions-on-google');

const functions = require('firebase-functions');
var getJSON = require('get-json')
const replaceString = require('replace-string');
let Parser = require('rss-parser');

const app = dialogflow({debug: true});

let parser = new Parser({
  customFields: {
    item:[['description', 'desc'],['enclosure url','pic']]
  }
});

var return_data=[];
var Carouselarray=[];
var text_output="";
var color="";
var i=0;
var verb="";

var max_intensity="";

var weekdays = "星期日,星期一,星期二,星期三,星期四,星期五,星期六".split(",");

function selectDay(datestring) {
    var today = new Date(datestring);
    var nowTime = today.getTime()+8*3600*1000;
	var oYear=today.getFullYear().toString();
    var oMoth = (today.getMonth() + 1).toString();
    var oDay = today.getDate().toString();
	var oWeek=weekdays[today.getDay()];	
    return oYear+'年'+oMoth+'月'+oDay+'日  '+oWeek;
}

app.intent('回傳最新資訊', (conv) => {

 return_data=[];
 text_output="";

   return new Promise(
  
   function(resolve,reject){

	parser.parseURL('https://www.twreporter.org/a/rss2.xml', function(err, feed) {
	 
	if(!err){
		feed.items.forEach(function(item) {
		   return_data.push([item.title,item.desc,item.link,item.pubDate])
	     });
	 resolve(return_data);
	}
	else{reject(err)}
})

  }).then(function (final_data) {
  const hasWebBrowser = conv.surface.capabilities.has('actions.capability.WEB_BROWSER');

	 Carouselarray=[];
	 text_output="";
	
	if(final_data.length>9){max_intensity=9;}
	else{max_intensity=final_data.length}
	
	
	for(i=0;i<max_intensity;i++){	  
	  	  
	    Carouselarray.push(
			 new BrowseCarouselItem({
				title: final_data[i][0],
				description: final_data[i][1],
				url: final_data[i][2],
				footer:'發布於'+selectDay(final_data[i][3]),
			})
		  );
		  
		if(i<3){text_output=text_output+' • '+final_data[i][0]+'  \n';}
	}
	
	//額外再插入一頁面導向《報導者》首頁
	    Carouselarray.push(
			 new BrowseCarouselItem({
				title: "前往《報導者》首頁",
				description: "2015年12月《報導者》正式上線，稟持深度、開放、非營利的精神，致力於公共領域調查報導，為讀者持續追蹤各項重要議題，共同打造多元的社會與媒體環境。",
				url:"https://www.twreporter.org/",
				})
		  );	
	
 if(conv.screen){
	
    var title1=replaceString(final_data[0][0], '】', '<break time="0.5s"/>');
    var title2=replaceString(final_data[1][0], '】', '<break time="0.5s"/>');
    var title3=replaceString(final_data[2][0], '】', '<break time="0.5s"/>');
	
   conv.ask(new SimpleResponse({ speech: `<speak><p><s>以下是《報導者》最近的三則專題報導<break time="1s"/>第一則<break time="0.5s"/>${title1}<break time="0.5s"/>${final_data[0][1]}<break time="1s"/>第二則<break time="0.5s"/>${title2}<break time="0.5s"/>${final_data[1][1]}<break time="1s"/>第三則<break time="0.5s"/>${title3}<break time="0.5s"/>${final_data[2][1]}</s></p></speak>`,text: "以下是最近的幾則報導\n點擊可閱讀詳細內容",}));

   if (hasWebBrowser) {
  conv.close(new BrowseCarousel({
    items: Carouselarray,
    }));
   }
   else{
  
  conv.close(new BasicCard({
    title: '關鍵報導列表',
    subtitle: '以下是最新的三則報導',
    text:text_output , 
    display: 'CROPPED',
  }));   

     }
   }
	else{
   conv.close(`<speak><p><s>以下是目前的最新三則專題報導，第一則<break time="0.5s"/>${final_data[0][0]}<break time="0.5s"/>${final_data[0][1]}<break time="1s"/>第二則<break time="0.5s"/>${final_data[1][0]}<break time="0.5s"/>${final_data[1][1]}<break time="1s"/>第三則<break time="0.5s"/>${final_data[2][0]}<break time="0.5s"/>${final_data[2][1]}</s></p></speak>`);
	}
	}).catch(function (error) {
    conv.ask(new SimpleResponse({ 
			 speech: `<speak><p><s>發生錯誤，無法獲取最新報導</s></p></speak>`,
			   text: "獲取資料過程似乎發生錯誤",}));
	console.log(error)
	conv.close(new BasicCard({  
		image: new Image({url:'https://dummyimage.com/1037x539/f1f1f1/a67a44.png&text=錯誤',alt:'Pictures',}),
		title:"獲取資料發生錯誤",display: 'CROPPED',}));	
});
});




// Set the DialogflowApp object to handle the HTTPS POST request.
exports.tw_reporter_index = functions.https.onRequest(app);
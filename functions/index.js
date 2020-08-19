// Import the Dialogflow module from the Actions on Google client library.
const {
  dialogflow,
  Permission,
  Suggestions,
  SimpleResponse,
  Button,MediaObject,
  Image,
  BasicCard,
  LinkOutSuggestion,Carousel,
  items,Table,List
} = require('actions-on-google');

// Instantiate the Dialogflow client.
const app = dialogflow({debug: true});

const functions = require('firebase-functions');

var admin = require("firebase-admin");

var serviceAccount = require("./config/hank199599-firebase-adminsdk-fc9jb-a23a39b67c.json");
var numbers=require("./numbers.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://hank199599.firebaseio.com"
});
const database = admin.database();
let Parser = require('rss-parser');
let parser = new Parser();
const file = './file.json';
var option_output={};
var i=0;
var j=0;
var flag=false;
var key_array=[];
var suggest_array=["香港","國安法","報導者","新聞","調查報導", "立場新聞","何桂藍","反送中","笑氣","陳潔","楊智強","青少年","暑假","毒品","李雪莉","運毒","死囚"];

const SelectContexts = {parameter: 'option',}

function selectDay(datestring) {
	var weekdays = ["日","一","二","三","四","五","六"];
	
    var today = new Date(datestring);
    var nowTime = today.getTime()+8*3600*1000;
	var oYear=today.getFullYear().toString();
    var oMoth = (today.getMonth() + 1).toString();
    var oDay = today.getDate().toString();
	var oWeek=weekdays[today.getDay()];	
    return oYear+'年'+oMoth+'月'+oDay+'日  ('+oWeek+')';
}


function fetch() {
	
	return new Promise(

	   function(resolve,reject){
		parser.parseURL('https://feeds.soundon.fm/podcasts/c1f1f3c9-8d28-42ad-9f1c-908018b8d9fc.xml', function(err, feed) {

			  var output={};
			  var array="";
			  var tags=[];
			  
				if(!err){
	
					for(i=0;i<feed.items.length;i++)
					{
					  var item=feed.items[i];
					  var temp=item.itunes.keywords;
						if(array.length!==0){array=array+','}
						array=array+temp;

					if(temp!==undefined){temp=temp.split(',');}
					else {temp=[];}

					output[i]={
						title:item.title,
						url:item.enclosure.url,
						keywords:temp,
						pubDate:selectDay(item.pubDate),
						tags:item.itunes.summary.split(' ')[0]
					}
					
					if(item.itunes.summary.split(' ')[0].indexOf('＃')!==-1){tags.push(item.itunes.summary.split(' ')[0])}
				}
				array=array.split(',');
				array=Array.from(new Set(array));
				tags=Array.from(new Set(tags));
				
				resolve([output,array,tags])
			  }
				else{reject(err)}
		})

	}).then(function (final_data) {
		
		console.log(final_data)
		database.ref('/reporter_podcast').update(final_data[0]);
		database.ref('/reporter_podcast').update({keys:final_data[1]});
		database.ref('/reporter_podcast').update({tags:final_data[2]});

	}).catch(function (error) {
		
		console.log(error)
		
	});	

}

	app.intent('預設歡迎語句', (conv) => {
		
	   return new Promise(
		   function(resolve){database.ref('/reporter_podcast').on('value',e=>{resolve(e.val().keys)});
		}).then(function (final_data) {
		
		suggest_array=final_data;
		
		conv.ask(new SimpleResponse({
					speech: `<speak><p><s>歡迎，我提供報導者與SoundOn共同製播的Podcast收聽服務</s><s>詢問我任何的議題，我會抓取內容相符的集數</s></p></speak>`,
					text:"詢問我任何的議題，我會抓取內容相符的集數供你選擇!"
				}));
				
		if(conv.screen){		
		conv.ask(new BasicCard({ 
				title:"【SoundOn 原創】",
				subtitle:"由台灣獨立媒體《報導者》所製播。以調查報導為主的記者們，把走進的現場、發現的故事、採訪的幕後、遇見的人物，透過訪談、對話、第一人稱敘事帶給你。希望以聲音的形式，陪伴你關心世界、走入在地、聽見多元社會脈動。\n節目包括三個單元：\n＃去現場\n＃記者給你當\n＃你為什麼要",
				text:"歡迎緊追《報導者》臉書粉絲團、Instagram、電子報，許願節目來賓、參與提問，告訴我們你想聽什麼。",
				buttons: new Button({ title: '贊助力挺', url: "https://support.twreporter.org/?utm_source=podcast&utm_medium=podcast&utm_campaign=intro", display: 'CROPPED', }),
		}));
		
		conv.ask(new Suggestions('播放最新的集數' ));
		conv.ask(new Suggestions(suggest_array[parseInt(Math.random() * (suggest_array.length))], suggest_array[parseInt(Math.random() * (suggest_array.length))], suggest_array[parseInt(Math.random() * (suggest_array.length))]));
		conv.ask(new Suggestions('👋 掰掰' ));
		}
		else{
			
		conv.ask(`<speak><p><s>例如，你可以搜尋</s><s>${suggest_array[parseInt(Math.random() * (suggest_array.length))]}</s></p></speak>`);
		conv.noInputs = ["抱歉，我沒聽輕楚。請試著問我"+suggest_array[parseInt(Math.random() * (suggest_array.length))], "請試著問我要查詢的關鍵字，例如、" + suggest_array[parseInt(Math.random() * (suggest_array.length))], "很抱歉，我幫不上忙"];

		}
		
		fetch()
		
		}).catch(function (error) {
				
			console.log(error)
			
			conv.close(new SimpleResponse({               
				speech: `<speak><p><s>發生一點小狀況</s></p></speak>`,
				text: "發生一點小狀況"}));
		});	

	});

	app.intent('對話查看集數', (conv, {any}) => {
		
	   return new Promise(
		   function(resolve){database.ref('/reporter_podcast').on('value',e=>{resolve(e.val())});
		}).then(function (final_data) {
			
		console.log(final_data)	
		option_output={};
		suggest_array=final_data.keys;
		
		for(i=0;i<Object.keys(final_data).length-2;i++)
		{	
			flag=false;
			var temp=final_data[i].keywords;
			console.log(temp)
			
				if(temp!==undefined){
				
					for(j=0;j<temp.length;j++)
						{	
							if(temp[j].length!==0){
								if(any.indexOf(temp[j])!==-1){flag=true;break;}
							}
						}
						
					if(flag===true){
						
						key_array=final_data[i].keywords;
						key_array.push(numbers[i])
						
						option_output[i]={
							"title": final_data[i].title,
							"description": final_data[i].pubDate,
							"synonyms":key_array,
						}
					if(!conv.screen){conv.expectUserResponse = false;break;}

					if(Object.keys(option_output).length===5){break;}
				
				}
			}
		}

		console.log(Object.keys(option_output).length)
		console.log(option_output)
		
		if(Object.keys(option_output).length>=2){
			conv.contexts.set(SelectContexts.parameter, 1);
			conv.ask(new SimpleResponse({
						speech: `<speak><p><s>下面是我找到的對應集數</s><s>請點擊來收聽吧!</s></p></speak>`,
						text:"下面是我找到的對應集數"
					}));
			conv.ask(new List({
				title: '提及「'+any+'」的集數',
				items: option_output,
				}));	
			conv.ask(new Suggestions('播放最新的集數' ));
				
		}
		else if (Object.keys(option_output).length===1){
			var num=Object.keys(option_output)
			
			if(conv.screen){
			conv.ask(new SimpleResponse({
						speech: `<speak><p><s>我只有找到一個對應的集數，標題是<break time="0.5s"/>${final_data[num].title.replace(/[＃]+\W+[ ]/gm,"")}</s><break time="0.5s"/></p></speak>`,
						text:"只找到一個對應的集數，開始收聽吧"}));
			}
			else{
			conv.expectUserResponse = false;	
			conv.ask(`<speak><p><s>接下來是我找到的最新集數，標題是${final_data[num].title.replace(/[＃]+\W+[ ]/gm,"")}</s><break time="0.5s"/></p></speak>`);
			}
			 conv.ask(new MediaObject({
				name: final_data[num].tags,
				url: final_data[num].url.replace('?aid=rss_feed',''),
				description: final_data[num].title,
				image: new Image({
					   url: 'https://storage.googleapis.com/gold-bruin-237907.appspot.com/1596622734919-f99336b6-4806-465c-bd21-874b1e502f6b.jpeg',
					   alt: 'Album cover of an ocean view',
				}),
			 }));
			conv.ask(new Suggestions('暫停','下一首'));

			if(num!==0){conv.ask(new Suggestions('播放最新的集數' ));}
		}
		else{
		conv.ask(new SimpleResponse({
					speech: `<speak><p><s>不好意思</s><s>我找不到有提到該內容的集數</s></p></speak>`,
					text:"抱歉，我找不到類似的集數"
				}));
		conv.ask(new BasicCard({ 
				title:"404 NOT FOUND",
				subtitle:"找不到提及「"+any+"」的內容",
				text:"我會為你尋找議題相似的Podcast供你聆聽，\n或是點選建議卡片來嘗試看看"
			}));
		conv.ask(new Suggestions('播放最新的集數' ));
		}
		
	conv.ask(new Suggestions(suggest_array[parseInt(Math.random() * (suggest_array.length))], suggest_array[parseInt(Math.random() * (suggest_array.length))], suggest_array[parseInt(Math.random() * (suggest_array.length))]));
	conv.ask(new Suggestions('👋 掰掰' ));

	}).catch(function (error) {
				
			console.log(error)
			
			conv.close(new SimpleResponse({               
				speech: `<speak><p><s>發生一點小狀況</s></p></speak>`,
				text: "發生一點小狀況"}));
		});	
	});
	
	app.intent('選擇集數', (conv, input, option) => {
	   return new Promise(
		   function(resolve){database.ref('/reporter_podcast').on('value',e=>{resolve(e.val())});
			}).then(function (final_data) {

			console.log(final_data)
			suggest_array=final_data.keys;
			final_data=final_data[option];
			
			conv.ask(new SimpleResponse({
						speech: `<speak><p><s>好的</s><s>準備收聽<break time="0.5s"/>${final_data.title.replace(/[＃]+\W+[ ]/gm,"")}</s></p></speak>`,
						text:"好的，開始收聽吧"
					}));
			 conv.ask(new MediaObject({
				name: final_data.title,
				url: final_data.url.replace('?aid=rss_feed',''),
				description: final_data.tags,
				image: new Image({
				   url: 'https://storage.googleapis.com/gold-bruin-237907.appspot.com/1596622734919-f99336b6-4806-465c-bd21-874b1e502f6b.jpeg',
				   alt: 'Album cover of an ocean view',
				}),
			 }));
			
			conv.ask(new Suggestions('暫停','下一首'));
			if(option!==0){conv.ask(new Suggestions('播放最新的集數' ));}
			conv.ask(new Suggestions(suggest_array[parseInt(Math.random() * (suggest_array.length))], suggest_array[parseInt(Math.random() * (suggest_array.length))], suggest_array[parseInt(Math.random() * (suggest_array.length))]));
			conv.ask(new Suggestions('👋 掰掰' ));
					
	  
			}).catch(function (error) {
				
			console.log(error)
			
			conv.close(new SimpleResponse({               
				speech: `<speak><p><s>發生一點小狀況</s></p></speak>`,
				text: "發生一點小狀況"}));
		});
	});

app.intent('媒體狀態', (conv) => {
		   return new Promise(
			   function(resolve){database.ref('/reporter_podcast').on('value',e=>{resolve(e.val())});
			}).then(function (final_data) {

		  const mediaStatus = conv.arguments.get('MEDIA_STATUS');
		  let response = '糟糕，我不清楚你的播放狀態';
		  if (mediaStatus && mediaStatus.status === 'FINISHED') {
			response = '希望你享受這段Podcast!';
		  }
		  
		option_output={};
	  
		for(i=0;i<Object.keys(final_data).length-2;i++)
			{	
				key_array=final_data[i].keywords;
				key_array.push(numbers[i])
		
				option_output[i]={
						"title": final_data[i].title,
						"description": final_data[i].pubDate,
						"synonyms":key_array,
				}	
				
				if(Object.keys(option_output).length===5){break;}

			}  
			
			conv.contexts.set(SelectContexts.parameter, 1);
			conv.ask(response);
			conv.ask('接下來，想要聽甚麼內容呢?');
			conv.ask(new List({
				title: '這是最新的五則集數',
				items: option_output,
				}));	
				
			conv.ask(new Suggestions('播放最新的集數' ));
			conv.ask(new Suggestions(suggest_array[parseInt(Math.random() * (suggest_array.length))], suggest_array[parseInt(Math.random() * (suggest_array.length))], suggest_array[parseInt(Math.random() * (suggest_array.length))]));
			conv.ask(new Suggestions('👋 掰掰' ));
			
		}).catch(function (error) {
			
		console.log(error)
		
		conv.close(new SimpleResponse({               
			speech: `<speak><p><s>發生一點小狀況</s></p></speak>`,
			text: "發生一點小狀況"}));
	});
});


app.intent('最新一集', (conv) => {
		   return new Promise(
			   function(resolve){database.ref('/reporter_podcast').on('value',e=>{resolve(e.val())});
			}).then(function (final_data) {

			console.log(final_data)
			suggest_array=final_data.keys;
			final_data=final_data[0];
			
			conv.ask(new SimpleResponse({
						speech: `<speak><p><s>沒問題，這是目前最新的集數</s><s>準備收聽${final_data.title.replace(/[＃]+\W+[ ]/gm,"")}</s></p></speak>`,
						text:"好的，這是我找到的最新集數"
					}));
			 conv.ask(new MediaObject({
				name: final_data.title,
				url: final_data.url.replace('?aid=rss_feed',''),
				description: final_data.tags,
				image: new Image({
				   url: 'https://storage.googleapis.com/gold-bruin-237907.appspot.com/1596622734919-f99336b6-4806-465c-bd21-874b1e502f6b.jpeg',
				   alt: 'Album cover of an ocean view',
				}),
			 }));
			 
			if(!conv.screen){conv.expectUserResponse = false;} //如果裝置沒有螢幕，則直接關閉Action但繼續撥放 
	
			conv.ask(new Suggestions('暫停','下一首'));
			conv.ask(new Suggestions(suggest_array[parseInt(Math.random() * (suggest_array.length))], suggest_array[parseInt(Math.random() * (suggest_array.length))], suggest_array[parseInt(Math.random() * (suggest_array.length))]));
			conv.ask(new Suggestions('👋 掰掰' ));
					
			}).catch(function (error) {
			
		console.log(error)
		
		conv.close(new SimpleResponse({               
			speech: `<speak><p><s>發生一點小狀況</s></p></speak>`,
			text: "發生一點小狀況"}));
	});
});


app.intent('結束對話', (conv) => {
	
		conv.ask('感謝你的使用，下次見');
		conv.close(new BasicCard({   
			title: '感謝您的使用!', 
			text:'如果有任何需要改進的地方，  \n歡迎到簡介頁面評分或給予反饋，謝謝!', 
			buttons: new Button({title: '開啟本程式的商店頁面',url: 'https://assistant.google.com/services/a/uid/0000008d40eaa68f',}),})); 
		
		conv.user.storage = {}; //離開同時清除暫存資料

});
	
	
// Set the DialogflowApp object to handle the HTTPS POST request.
exports.tw_reporter_index = functions.https.onRequest(app);
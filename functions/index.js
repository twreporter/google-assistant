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

var suggest_array=["香港","國安法","報導者","新聞","調查報導","立場新聞","何桂藍","反送中","笑氣","調查報導","新聞","報導者","陳潔","楊智強","青少年","暑假","毒品","調查報導","新聞","報導者","李雪莉","楊智強","運毒","死囚"];

const SelectContexts = {
	parameter: 'option',
}


function fetch() {
	
	return new Promise(

	   function(resolve,reject){
		parser.parseURL('https://feeds.soundon.fm/podcasts/c1f1f3c9-8d28-42ad-9f1c-908018b8d9fc.xml', function(err, feed) {

			  var output={};
			  var array="";
			  
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
						description:item.itunes.summary,
						url:item.enclosure.url,
						keywords:temp,
					}
				}
				array=array.split(',');
				array=Array.from(new Set(array));
				
				resolve([output,array])
			  }
				else{reject(err)}
		})

	}).then(function (final_data) {
		
		console.log(final_data)
		database.ref('/reporter_podcast').update(final_data[0]);
		database.ref('/reporter_podcast').update({keys:final_data[1]});

	}).catch(function (error) {
		
		console.log(error)
		
	});	

}

	app.intent('預設歡迎語句', (conv) => {
	   return new Promise(
		   function(resolve){database.ref('/reporter_podcast').on('value',e=>{resolve(e.val().keys)});
		}).then(function (final_data) {
		
		var suggest_array=final_data;
		
		conv.ask(new SimpleResponse({
					speech: `<speak><p><s>歡迎，我提供報導者與SoundOn共同製播的Podcast收聽服務</s><s>詢問我任何的議題，我會抓取內容相符的集數</s></p></speak>`,
					text:"歡迎，請選擇要收聽的Podcast。"
				}));
		conv.ask(new BasicCard({ 
				title:"歡迎使用",
				subtitle:"請詢問我任意議題",
				text:"我會為你尋找議題相似的Podcast供你聆聽，\n或是點選建議卡片來嘗試看看"
		}));
		
		conv.ask(new Suggestions(suggest_array[parseInt(Math.random() * (suggest_array.length))], suggest_array[parseInt(Math.random() * (suggest_array.length))], suggest_array[parseInt(Math.random() * (suggest_array.length))]));
		conv.ask(new Suggestions('👋 掰掰' ));
	
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
		
		for(i=0;i<Object.keys(final_data).length-1;i++)
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
						option_output[i]={
							"title": final_data[i].title,
							"description": ""
						}
				}
			}
		}

		console.log(Object.keys(option_output).length)
		console.log(option_output)
		
		if(Object.keys(option_output).length>=2){
			conv.contexts.set(SelectContexts.parameter, 1);
			conv.ask(new SimpleResponse({
						speech: `<speak><p><s>下面是我找到的對應集數</s><s>請點擊來收聽吧</s></p></speak>`,
						text:"下面是我找到的對應集數"
					}));
			conv.ask(new List({
				title: '請查看下列內容',
				items: option_output,
				}));		
		}
		else if (Object.keys(option_output).length===1){
			var num=Object.keys(option_output)
			
			conv.ask(new SimpleResponse({
						speech: `<speak><p><s>我只有找到一個對應的集數，標題是${final_data[num].title}</s><s>我們來聽看看吧</s></p></speak>`,
						text:"只找到一個對應的集數，開始收聽吧"
					}));
					
			 conv.ask(new MediaObject({
				name: final_data[num].title,
				url: final_data[num].url.replace('?aid=rss_feed',''),
				description: final_data[num].description,
				image: new Image({
					   url: 'https://storage.googleapis.com/gold-bruin-237907.appspot.com/1596622734919-f99336b6-4806-465c-bd21-874b1e502f6b.jpeg',
					   alt: 'Album cover of an ocean view',
				}),
			 }));
			conv.ask(new Suggestions('暫停','下一首'));
	 
		}
		else{
		conv.ask(new SimpleResponse({
					speech: `<speak><p><s>不好意思</s><s>我找不到有提到該內容的集數</s></p></speak>`,
					text:"抱歉，我找不到類似的集數"
				}));
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
		   function(resolve){database.ref('/reporter_podcast').on('value',e=>{resolve(e.val()[option])});
			}).then(function (final_data) {

			console.log(final_data)
			
			conv.ask(new SimpleResponse({
						speech: `<speak><p><s>好的</s><s>準備收聽${final_data.title}</s></p></speak>`,
						text:"好的，開始收聽吧"
					}));
			 conv.ask(new MediaObject({
				name: final_data.title,
				url: final_data.url.replace('?aid=rss_feed',''),
				description: final_data.description,
				image: new Image({
				   url: 'https://storage.googleapis.com/gold-bruin-237907.appspot.com/1596622734919-f99336b6-4806-465c-bd21-874b1e502f6b.jpeg',
				   alt: 'Album cover of an ocean view',
				}),
			 }));
			
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

app.intent('媒體狀態', (conv) => {
	  const mediaStatus = conv.arguments.get('MEDIA_STATUS');
	  let response = '糟糕，我不清楚你的播放狀態';
	  if (mediaStatus && mediaStatus.status === 'FINISHED') {
		response = '希望你享受這段Podcast!';
	  }
	conv.ask(response);
	conv.ask('接下來，想要聽甚麼內容呢?');
	conv.ask(new Suggestions(suggest_array[parseInt(Math.random() * (suggest_array.length))], suggest_array[parseInt(Math.random() * (suggest_array.length))], suggest_array[parseInt(Math.random() * (suggest_array.length))]));
	conv.ask(new Suggestions('👋 掰掰' ));
  
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
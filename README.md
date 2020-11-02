# jQuery Utilities
よく使う機能をまとめています。関数名やオブジェクト名はjQueryが提供する関数やオブジェクトを利用するので jQueryの名前空間に押し込めています。

## jQuery.Utilities.js

### $.getJSONのPOSTメソッド版
syncPostJSONは同期バージョン、fetchJSONはクロスドメイン(JSONP)

* $.postJSON(url,params,callback)
* $.syncPostJSON(url,params,callback)
* $.fetchJSON = function(url,queries,callback)

### URL引数(QUERY_STRING)の展開・作成
* $.getQueryString(q,delimiter,override)
* $.createQueryString(o,delimiter)

### テキスト操作／判定
* $.isString(str)
* $.isEmpty(str)
* $.formatString(fmt)
* $.format()
* $.version(a,op,b)
* $.isHiragana(str)
* $.toHankaku(str)

### ローカル記憶域へのアクセス 【引数： 名前,保持期間(秒数)】
* $.Storage(key,expire)
* $.StorageEx(key,expire)
* $.Session(key)
* $.SessionEx(key)

StorageEx/SessionExはオブジェクトの保存対応版

```javascript
let stg = $.Storage('キー');
stg.set('値');
let v = stg.get();

let stg = $.StorageEx('キー');
stg.set({a:1,b:2});
let v = stg.get();
```

### タイマー／インターバル 
* $.Timer(timeout)
* $.Interval(callback,interval)

```javascript
$.Timer(ミリ秒).done(function() {
  console.log('タイムアウト');
});
```
$.Interval(function() {
  console.log('interval!');
},ミリ秒);

### カウンター
* $.Counter(to,callback)
* $.ShowCounter(s)

```javascript
let counter = $.Counter(最大値,function() {
  console.log('最大値に達しました')
});

let counter = $.ShowCounter(カウンタを表示させるセレクタ)
counter.increment();
counter.decrement();
```

### クッキー
* $.getCookie(n)
* $.setCookie(n,v,expires,path,domain)

### 非同期ブロックUI
* $.Blocking(promise,cb,handlers)
* $.Blockings(promises,overlay)

### その他
* $.Overlay(handlers,classes)
* $.Dialog(size,classes,callbacks)
* $.ProgressBar(to,classname,wrapper)

### jQueryプラグイン
* $.fn.popupWindow(w,h,options)
* $.fn.cond(condition,func)
* $.fn.enterNext(options)
* $.fn.validity(message)

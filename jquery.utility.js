/*---------------------------------------------------------------------------

  各種ユーティリティ関数をjQuery名前空間に登録

  ALL WRITTEN BY K.NAKAGAWA (nakagawa@mars.dti.ne.jp)

---------------------------------------------------------------------------*/

(function($,undefined)
 {
   let CONFIG = new Map([
     ['waitUntilBlocking',500],
     ['defaultExpire',259200],
     ['defaultDuration',200],
     ['blockingTimeout',15*1000],
     ['enterNext',{ selector : [
       'input[type="text"]',
       'input[type="tel"]',
       'input[type="password"]',
       'input[type="email"]',
       'input[type="number"]',
       'select',
       'textarea']}
     ],
     ['validity', { message : 'この項目は入力必須です。'}]
   ]);
   var TEXT = new Map([
     ['failedCreateMessage','オブジェクト作成に失敗しました。'],
     ['blockingFailMessage','タイムアウトもしくはブラウザのポップアップブロック等によって処理が続行できませんでした。']
   ]);

   $.Utility = {
     set : function(name,value)
     {
       var oldValue = CONFIG.get(name);
       CONFIG.set(name,value);
       return oldValue;
     }
   };

   /*****************************************************************************

     $.getJSON関数のPOST版ラッパー

   *****************************************************************************/
   $.postJSON = function(url,params,callback)
   {
     return $.post(url,params,callback,'json');
   };

   // postJSON with blocking access
   $.syncPostJSON = function(url,params,callback)
   {
     var defs = {
       'async'   : false,
       'type'    : 'POST',
       'data'    : params,
       'dataType': 'json'
     };
     if(callback)
       defs.success = callback;

     return $.ajax(url,defs);
   };

   /*****************************************************************************

     クロスドメインでURLのデータをフェッチ
     (サーバー側では、callback名で関数をコールするスクリプトを返す必要がある。)

     ex.)
     リクエスト：
     http://your/request/uri/

     レスポンス：
     content-type:application/javascript
     abcdefg('server-process and result-data here');

     引数： URL,パラメーター,ロード時のコールバック
     戻値：コールバック名を返す。

     (注)コールバックは、グローバル変数(windowオブジェクト)に登録されコールされる。
         必要ならコールバック終了後に除去する。

   *****************************************************************************/
   $.fetchJSON = function(url,queries,callback)
     {
       var params = {
         'url'      : url,
         'type'     : 'GET',
         'dataType' : 'jsonp' };

       if(queries)
         params['data'] = queries;

       if($.isString(callback))
         params['jsonp'] = callback;
       else if($.isFunction(callback))
         params['success'] = callback;
       else if($.isPlainObject(callback))
         params = $.extend({},params,callback);
       else
         params['url'] += '?callback=?';

       return $.ajax(params);
     };

   /*****************************************************************************

     URL引数(QUERY_STRING)の展開・作成

   ****************************************************************************/
   $.getQueryString = function(q,delimiter,override)
     {
       override = override || true;
       var rv = {};
       if(delimiter === undefined)
         delimiter = '&';

       if(!q)
         q = window.location.search.substring(1);

       $.each(q.split(delimiter),function(i,v) {
         try{
           v = decodeURIComponent($.trim(v));
           var pair = v.split('=');

           var m = pair[0].match(/(\w+)\[\]$/);
           if(m)
           {
             pair[0] = m[1];
             if(pair[0] in rv)
               rv[pair[0]].push(pair.length == 1 ? '' : pair[1]);
             else
               rv[pair[0]] = [pair.length == 1 ? '' : pair[1]];

             return;
           }

           if(pair[0] in rv && override === false)
           {
             if($.isArray(rv[pair[0]]))
               rv[pair[0]].push(pair.length == 1 ? '' : pair[1]);
             else
               rv[pair[0]] = [rv[pair[0]],pair.length == 1 ? '' : pair[1]];
           }
           else
           {
             rv[pair[0]] = pair.length == 1 ? pair[0] : pair[1];
           }
         }
         catch(e) {
           console.error(e);
         }
       });

       return rv;
     };

   $.createQueryString = function(o,delimiter)
     {
       var rv = '';
       if(delimiter === undefined)
         delimiter = '&';

       if($.isPlainObject(o))
         {
           var ar = [];
           $.each(o,
                  function(k,v)
                  {
                    var encoded_k = encodeURIComponent(k);
                    var encoded_v = '';
                    if($.isArray(v))
                    {
                      encoded_k = encodeURIComponent(k + '[]');
                      $.each(v,function(ii,vv) {
                        encoded_v = encodeURIComponent(vv.toString());
                        ar.push([encoded_k,encoded_v].join('='));
                      });
                    }
                    else if($.isPlainObject(v))
                    {
                      $.each(v,function(kk,vv) {
                        encoded_k = encodeURIComponent(k + '[' + kk + ']');
                        encoded_v = encodeURIComponent(vv.toString());
                        ar.push([encoded_k,encoded_v].join('='));
                      });
                    }
                    else
                    {
                      encoded_v = encodeURIComponent(v.toString());
                      ar.push([encoded_k,encoded_v].join('='));
                    }
                  });

           rv = ar.join(delimiter);
         }

       return rv;
     };

   /*****************************************************************************

   // 文字列か否か

   *****************************************************************************/
   $.isString = function(str)
     {
       return $.type(str) == 'string';
     };

   /*****************************************************************************

     ローカル記憶域へのアクセス 【引数： 名前,保持期間(秒数)】

     var stg = $.Storage('キー');
     stg.set('値');
     var v = stg.get();

   *****************************************************************************/
   $.Storage = function(key,expire)
     {
       if(!(this instanceof $.Storage))
         return new $.Storage(key,expire);

       this.key = key;
       this.initialize('localStorage');
       this.expire = 1000 * ((expire === undefined || !$.isNumeric(expire)) ?  CONFIG.get('defaultExpire') : expire);
     };

   $.Storage.prototype = {
     initialize: function(storage)
     {
       this.isStorage = storage in window;
       if(this.isStorage)
       {
         this.storage = window[storage];
         this.storageType = storage;
       }
       else
       {
         this.storageType = 'cookie';
       }
     },

     //コールバックの登録
     regist: function(type,cb)
     {
       if(type !== 'set' && type !== 'get')
         return false;

       //コールバックの作成
       if(this.callbacks === undefined)
         this.callbacks = [];

       if(this.callbacks[type] === undefined)
         this.callbacks[type] = $.Callbacks('unique');

       if(!$.isFunction(cb))
         return false;

       this.callbacks[type].add(cb);
     },

     //セッター
     set: function(value)
     {
       if(this.isStorage)
       {
         this.storage[this.key] = value;
       }
       else
       {
         var cookie = [];
         cookie.push(this.key + '=' + encodeURIComponent(value));

         if(this.expire > 0)
         {
           var expire = new Date();
           expire.setTime(expire.getTime() + this.expire);

           cookie.push('expires=' + expire.toString());
         }

         document.cookie =  cookie.join(';');
       }

       if(this.callbacks !== undefined && this.callbacks['set'] !== undefined)
         this.callbacks['set'].fire(this.key,value);

       return this;
     },

     //ゲッター
     get: function()
     {
       var rv = '';
       if(this.isStorage)
       {
         if(this.storage[this.key] !== undefined)
           rv = this.storage[this.key];
       }
       else
       {
         var cookies = $.getQueryString(document.cookie,';');
         if($.isPlainObject(cookies) && cookies[this.key] !== undefined)
           rv = cookies[this.key];
       }

       if(this.callbacks !== undefined && this.callbacks['get'] !== undefined)
         this.callbacks['get'].fire(this.key,rv);

       return rv;
     },

     clear: function()
     {
       if(this.isStorage)
       {
         this.storage.removeItem(this.key);
       }
       else
       {
         var cookie = [];
         cookie.push(this.key + '=');
         if(this.expire > 0)
         {
           var expire = new Date();
           expire.setTime(expire.getTime() - this.expire);

           cookie.push('expires=' + expire.toString());
         }

         document.cookie =  cookie.join(';');
       }

       if(this.callbacks !== undefined && this.callbacks['set'] !== undefined)
         this.callbacks['set'].fire(this.key,value);

       return this;
     },

     // 比較します。
     eq : function(x)
     {
       return x === this.get();
     },

     ne : function(x)
     {
       return x !== this.get();
     },

     not : function()
     {
       var v = this.get();
       return (v === undefined || v == false || v === '' || v === 0 || v === null);
     },

     //正規表現マッチを行います。
     re : function(re)
     {
       var rv = false;

       if(typeof this.get() == 'string' && this.ne(''))
         rv = this.storage[this.key].match(re);

       return rv;
     }
   };

   /*****************************************************************************

     オブジェクトの保存に対応したストレージへのアクセス

   *****************************************************************************/
   $.StorageEx = function(key,expire)
   {
     if(!(this instanceof $.StorageEx))
       return new $.StorageEx(key,expire);

     this.key = key;
     this.initialize('localStorage');
     this.expire = 1000 * ((expire === undefined || !$.isNumeric(expire)) ?  CONFIG.get('defaultExpire') : expire);
   };
   $.StorageEx.prototype = $.extend({},$.Storage.prototype);
   $.StorageEx.prototype.parent_set = $.StorageEx.prototype.set;
   $.StorageEx.prototype.parent_get = $.StorageEx.prototype.get;
   $.StorageEx.prototype.set = function(value)
   {
     if($.isPlainObject(value) || $.isArray(value))
       value = JSON.stringify(value);

     return this.parent_set(value);
   };
   $.StorageEx.prototype.get = function()
   {
     var rv;
     var value = this.parent_get();
     try {
       rv = JSON.parse(value);
     } catch (e) {
       rv = value;
     }

     return rv;
   };

   /*****************************************************************************

     セッションストレージへのアクセス

   *****************************************************************************/
   $.Session = function(key)
     {
       if(!(this instanceof $.Session))
         return new $.Session(key);

       this.key = key;
       this.initialize('sessionStorage');
       this.expires = 0;
     };
   $.Session.prototype = $.extend({},$.Storage.prototype);

   /*****************************************************************************

     オブジェクトの保存に対応したセッションストレージへのアクセス

   *****************************************************************************/
   $.SessionEx = function(key)
     {
       if(!(this instanceof $.SessionEx))
         return new $.SessionEx(key);

       this.key = key;
       this.initialize('sessionStorage');
       this.expires = 0;
     };
   $.SessionEx.prototype = $.extend({},$.StorageEx.prototype);

   /*****************************************************************************

     window.setTimeout()関数へのラッパークラス

   *****************************************************************************/
   $.Timer = function(timeout)
   {
     if(!(this instanceof $.Timer))
       return new $.Timer(timeout);

     this.deferred = $.Deferred();

     if(typeof timeout === 'number')
       this.set(timeout);
   };

   $.Timer.prototype = {
     promise : function()
     {
       return this.deferred.promise();
     },

     done : function(fn)
     {
       return this.promise().done(fn);
     },

     set : function(timeout)
     {
       if(this.id === undefined && typeof timeout === 'number')
       {
         if(timeout > 0)
         {
           this.id = window.setTimeout((function(_this)
             {
               return function()
               {
                 _this.deferred.resolveWith(_this);
               };
             })(this),timeout);
         }
         else
         {
           this.deferred.resolveWith(this);
         }
       }

       return this;
     },

     clear : function()
     {
       window.clearTimeout(this.id);
       return this;
     }
   };

   /*****************************************************************************
   
     window.setInterval()関数へのラッパークラス

    *****************************************************************************/
   $.Interval = function(callback,interval)
   {
     if(!(this instanceof $.Interval))
       return new $.Interval(callback,interval);

     if(typeof callback !== 'function')
       throw new Error(TEXT.get('failedCreateMessage'));

     this.callback = callback;
     this.count = 0;

     if(typeof interval === 'number')
       this.set(interval);
   };

   $.Interval.prototype = {
     set : function(interval)
     {
       if(this.id === undefined && typeof interval === 'number')
       {
         this.id = window.setInterval((function(_this,_arguments)
           {
             return function()
             {
               _this.count++;
               _this.callback.apply(_this,_arguments);
             };
           })(this,arguments),interval);
       }

       return this;
     },

     clear : function()
     {
       window.clearInterval(this.id);
       delete this.id;
       return this;
     }
   };

   /*****************************************************************************
   
     カウンター

    *****************************************************************************/
   $.Counter = function(to,callback)
   {
     if(!(this instanceof $.Counter))
       return new $.Counter(to,callback);

     this.err = false;
     this.to = parseInt(to);

     if(typeof callback === 'function')
       this.callback = callback;

     this.count = 0;
   };

   $.Counter.prototype = {
     increment: function(dt)
     {
       if(dt === undefined || !$.isNumeric(dt))
         dt = 1;

       this.count += dt;

       if(this.count == this.to && this.callback !== undefined)
         this.callback.call(this,this.count);

       return this;
     },

     decrement: function(dt)
     {
       if(dt === undefined || !$.isNumeric(dt))
         dt = 1;

       return this.increment(-1 * dt);
     },

     toString: function()
     {
       return this.count;
     },

     percent: function(unit)
     {
       var rv = Math.floor((this.count/this.to) * 100);
       if(unit !== undefined && $.isString(unit))
         rv += unit;

       return rv;
     },

     abort: function()
     {
       this.err = true;
       if(this.count == this.to && this.callback !== undefined)
         this.callback.call(this,this.count);

       this.count = 0;
     }
   };

   /*****************************************************************************
   
     カウンター表示

   *****************************************************************************/
   $.ShowCounter = function(s)
   {
     if(!(this instanceof $.ShowCounter))
       return new $.ShowCounter(s);

     this.count = 0;
     this.$ = $(s);
     this.update();
   };

   $.ShowCounter.prototype = {
     update: function()
     {
       this.$.text(this.count);
     },
     increment : function()
     {
       this.count++;
       this.update();
     },
     decrement : function()
     {
       this.count--;
       this.update();
     },
     clear: function()
     {
       this.count = 0;
       this.update();
     }
   };

   /*****************************************************************************
   
     文字列でない、もしくは、ヌルもしくは空文字、もしくは未定義かを判別する。

   *****************************************************************************/
   $.isEmpty = function(str)
   {
     return str === undefined || str === null || ($.isString(str) && str.length == 0);
   };

   /*****************************************************************************

     簡易オーバーレイ

   *****************************************************************************/
   var overlayCount = 1;
   $.Overlay = function(handlers,classes)
   {
     if(!(this instanceof $.Overlay))
       return new $.Overlay(handlers,classes);

     this.duration = CONFIG.get('defaultDuration');

     var padding = Math.floor($(document).height() / 2) - 18;
     if(!classes)
       classes = 'overlay';

     var def =
       {
         position: 'fixed',
         top:0,
         left:0,
         bottom:0,
         right:0,
         zIndex: 65534,
         display: 'none'
       };

     if($.userAgent.firefox)
       def.MozUserSelect = 'none';

     $('html').css('position','relative');

     this.paddingTop = 100;

     this.$ = $(document.createElement('div')).attr('id','overlay-' + overlayCount++);
     switch($.type(classes))
     {
       case 'string':
         this.$.addClass(classes);
         break;
       case 'array':
         this.$.addClass(classes.join(' '));
         break;
       case 'object':
         this.$.addClass('overlay');
         if('paddingTop' in classes)
         {
           this.paddingTop = classes.paddingTop;
           delete classes.paddingTop;
         }
         def = $.extend({},def,classes);
         break;
     }

     this.position = {top: def.top,left:def.left,bottom:def.bottom,right:def.right};

     this.$.css(def);

     if($.isPlainObject(handlers))
       this.$.on(handlers);
   };

   $.Overlay.prototype = {
     show: function(duration)
     {
       return this.$.appendTo(document.body)
         .css('padding-top',$(document).scrollTop() + this.paddingTop)
         .fadeIn(duration || this.duration);
     },
     hide: function(duration,childRemove)
     {
       if(childRemove === undefined)
         childRemove = true;

       var _this = this;
       this.$.fadeOut(duration || this.duration)
         .promise()
         .done(function() {
           $(window).off('.overlay');
           if(childRemove === true)
             _this.$.empty().remove();
         });

       return this.$.css('padding-top',0);
     },
     get: function(requireJqo)
     {
       return requireJqo === true ? this.$ : this.$.get(0);
     },

     append: function(obj)
     {
       this.$.append(obj);
       return this;
     },

     prepend: function(obj)
     {
       this.$.prepend(obj);
       return this;
     }

   };

   /*****************************************************************************

    メソッドチェーンのための条件分岐プラグイン

   *****************************************************************************/
   $.fn.cond = function(condition,func)
   {
     if($.type(condition) == 'boolean' && condition == true)
     {
       this.each(function()
         {
           func.call(this);
         });
     }

     return this;
   };

   /*****************************************************************************

    window.alert()の代替

   *****************************************************************************/
   $.MessageBox = function(str)
   {
     window.alert(str);
   };

   $.Message = function(options)
   {
     if(!(this instanceof $.Message))
       return new $.Message(options);
   };

   $.Message.prototype = {


   };


   /*****************************************************************************

    モーダル・ダイアログ

   *****************************************************************************/
   $.Dialog = function(size,classes,callbacks)
     {
       if(!(this instanceof $.Dialog))
         return new $.Dialog(size,classes,callbacks);

       this.duration = CONFIG.get('defaultDuration');

       if(!$.isPlainObject(size))
         throw new Error('正しく初期化できません');

       var def =
         {
           position: 'absolute',
           top: '-10000',
           left: '-10000',
           zIndex: 65535,
           marginLeft: 0,
           marginTop : 0
         };

       this.styles =
         {
           width: size.width,
           height: size.height,
           marginLeft: -1 * parseInt(size.width / 2),
           marginTop : -1 * parseInt(size.height / 2)
         };

       this.$ = $('<div />').appendTo(document.body).hide();
       this.content$ = $('<div />').css({padding : '1em'}).appendTo(this.$);

       this.callbacks = { open: $.Callbacks(),close: $.Callbacks() };

       var classes_str = null;

        switch($.type(classes))
         {
         case 'object':
           $.extend(def,classes);
           break;

         case 'array':
           this.$.addClass(classes.join(' '));
           break;

         case 'string':
           this.$.addClass(classes);
           break;
         }

       this.$.css(def);

       if($.isPlainObject(callbacks))
         this.$.on(callbacks);
     };

   $.Dialog.prototype = {
     on : function(name,cb)
     {
       if(!this.callbacks[name])
         this.callbacks[name] = $.Callbacks();

       this.callbacks[name].add(cb);

       return this;
     },

     off : function(name,cb)
     {
       if(this.callbacks[name])
         this.callbacks[name].remove(cb);

       return this;
     },

     open : function(duration)
     {
       if(!duration)
         duration = this.duration;

       this.callbacks.open.fireWith(this);

       var ww = $(window).width();
       var wh = $(window).height();

       this.$.css({top    : parseInt(wh / 2)+$(this).scrollTop(),
         left   : parseInt(ww / 2)+$(this).scrollLeft(),
         width  : 1,
         height : 1}).appendTo(document.body).show();
       this.$.stop()
         .animate({width: this.styles.width, height: this.styles.height,marginLeft: this.styles.marginLeft,marginTop: this.styles.marginTop},duration)
         .promise()
         .done((function(dlg)
           {
             return function()
             {
               $(window).on('resize.dialog scroll.dialog',
                 function()
                 {
                   var ww = $(this).width();
                   var wh = $(this).height();
                   dlg.$.css({top : parseInt(wh / 2)+$(this).scrollTop(),
                     left: parseInt(ww / 2)+$(this).scrollLeft()});
                 })
                 .trigger('resize');
             };
           })(this));

       return this;
     },

     close : function(duration)
     {
       if(!duration)
         duration = this.duration;

       var _this = this;

       this.$.stop().animate({width: 1,height: 1,marginLeft: 0,marginTop: 0},duration)
         .promise()
         .done((function(dlg)
           {
             $(window).off('.dialog');
             dlg.$.hide().detach();
             _this.callbacks.close.fireWith(_this);
           })(this));

       return this;
     },

     load : function(arg)
     {
       var rv = this;

       if($.isPlainObject(arg))
       {
         rv = $.postJSON(arg.url,arg.params);
       }
       else if($.type(arg) === 'string')
       {
         this.content$.html(arg);
       }

       return this;
     },

     attach : function(eventname,selector,callback)
     {
       if(this.content$.html)
         this.content$.find(selector).on(eventname,callback);

       return this;
     }
   };

   /*****************************************************************************

     文字列フォーマット合成 $.formatString(fmt,...);

   *****************************************************************************/
   $.formatString = function(fmt)
   {
     var num = arguments.length;
     var params = null;

     var re = /%(\s*|[0-9]+|[^0-9!-\/\:-@\[-\^\`\{-\~]+[a-zA-Z_0-9]*)%/ig;
     var replacement = function(m,src)
     {
       return (src.match(/^\s*$/) || (params[src] === undefined)) ? m : params[src];
     };

     if(num == 0)
       return false;

     if($.isArray(arguments[1]) || $.isPlainObject(arguments[1]))
     {
       params = arguments[1];
     }
     else
     {
       params = [null].concat([].slice.call(arguments,1));
     }

     return fmt.replace(re,replacement);
   };

   /*****************************************************************************
   
     クッキー処理

   *****************************************************************************/
   $.getCookie = function(n)
   {
     var cookies = $.getQueryString(document.cookie,';');

     if(n !== undefined && $.type(n) === 'string' && n.length > 0)
     {
       return cookies[n];
     }

     return cookies;
   };

   $.setCookie = function(n,v,expires,path,domain)
     {
       if(n === undefined || n.length == 0 || v === undefined)
         return false;

       var cookie_name  = encodeURIComponent(n);
       var cookie_value = encodeURIComponent(v);

       if(expires === undefined)
         expires = 0;

       if(path === undefined)
         path = location.pathname.replace(/\/[^\/]+$/,'');

       if(domain === undefined)
         domain = '';
       else
         domain = 'domain=' + domain;

       document.cookie = $.formatString('%1%=%2%;expires=%3%;path=%4%;%5%',cookie_name,cookie_value,expires,path,domain);

       return true;
     };

   /*******************************************************************************

     ドット付きバージョン番号の比較

      a,b : バージョン番号文字列(数値及びピリオドのみ)

   *******************************************************************************/
   $.version = function(a,op,b)
   {
     a = a.split('.');
     b = b.split('.');

     var ia,ib;
     var limit = Math.max(a.length,b.length);
     while(limit--)
     {
       ia = parseInt(a.shift() || 0);
       ib = parseInt(b.shift() || 0);

       if(false == eval([ia,'==',ib].join(' ')))
         break;
     }

     return eval([ia,op,ib].join(' '));
   };

   /*******************************************************************************

     テキスト・フォーマット

     書式指定({0},{1},{2}等)を含んだ文字列を、続くパラメータで変換します。

     $.format($fmt,param1,param2,.....)

   *******************************************************************************/
   $.format = function()
   {
     var format = arguments[0];
     var params = Array.prototype.slice.call(arguments, 1);
     var b = "\x91",e = "\x92";
     var dest = '';

     if($.type(format).match(/string/i) && params.length > 0)
     {
       //前処理
       dest = format.replace('{{',b);
       dest = dest.replace(new RegExp('}}([^}]|\Z|\z)','g'),e + RegExp.$1);

       for(var i=0;i<params.length;i++)
       {
         var re = new RegExp('\\{'+i+'\\}','g');
         dest = dest.replace(re,params[i]);
       }

       //後処理
       dest = dest.replace(b,'{');
       dest = dest.replace(e,'}');
     }

       return dest;
     };


   var reHiragana = /[^\u3040-\u309Fー－～―]/;
   var reNumericZenkaku = /[０-９]/g;
   var zn2hn = { '０':0, '１':1, '２':2, '３':3, '４':4, '５':5, '６':6, '７':7, '８':8, '９':9 };
   var za2ha = { 'Ａ':'A','Ｂ':'B','Ｃ':'C','Ｄ':'D','Ｅ':'E','Ｆ':'F','Ｇ':'G','Ｈ':'H','Ｉ':'I','Ｊ':'J','Ｋ':'K','Ｌ':'L','Ｍ':'M','Ｎ':'N','Ｏ':'O','Ｐ':'P','Ｑ':'Q','Ｒ':'R','Ｓ':'S','Ｔ':'T','Ｕ':'U','Ｖ':'V','Ｗ':'W','Ｘ':'X','Ｙ':'Y','Ｚ':'Z','ａ':'a','ｂ':'b','ｃ':'c','ｄ':'d','ｅ':'e','ｆ':'f','ｇ':'g','ｈ':'h','ｉ':'i','ｊ':'j','ｋ':'k','ｌ':'l','ｍ':'m','ｎ':'n','ｏ':'o','ｐ':'p','ｑ':'q','ｒ':'r','ｓ':'s','ｔ':'t','ｕ':'u','ｖ':'v','ｗ':'w','ｘ':'x','ｙ':'y','ｚ':'z' };
   /*******************************************************************************

     全角文字関連処理

       - ひらがな判別
       - 全角数字を半角に変換
       - 全角英字を半角に変換

   *******************************************************************************/
   $.isHiragana = function(str)
   {
     return str.match(reHiragana);
   };

   $.toHankaku = function(str)
   {
     return str.replace(reNumericZenkaku,function(p1){ return zn2hn[p1]; });
   };

   /*******************************************************************************

     ポップアップウィンドウで開く(jQuery プラグイン)

     $(selector).popupWindow(width INT,height INT,featurs plainObject)

     ウィンドウ名を指定する場合は、features に キーwindowname として格納する。
     ウィンドウ名が無ければ、'popupwindow%d' が使用される。%d は インクリメントされる。

   *******************************************************************************/
   $.popupWindow = {
     features : {
       width: 640,
       height: 440,
       menubar:'no',
       toolbar:'no',
       resizable:'no',
       scrollbars:'yes',
       status:'no',
       chrome:'yes'
     },

     current : {}
   };

   $.fn.popupWindow = function(w,h,options)
   {
     var count = 1;

     var onclick = function(ev)
     {
       ev.preventDefault();
       ev.stopPropagation();

       $.popupWindow.current[windowname] = window.open($(this).attr('href'),windowname,features.join(','));
     };

     //this -> jQuery object
     var settings = $.extend(true,{},$.popupWindow.features,options);
     if(w)
       settings['width'] = w;
     if(h)
       settings['height'] = h;

     var windowname = 'popupwindow' + count++;
     if('windowname' in settings)
     {
       windowname = settings.windowname;
       delete settings.windowname;
     }

     var features = [];
     $.each(settings, function(k,v) {features.push(k + '=' + v);});

     return this.filter('a').click(onclick);
   };//endo of .fn

   /*******************************************************************************

     プログレスバー

     var pb = $.ProgressBar(appendto,classname,wrapper);
       or
     var pb = new $.ProgressBar(appendto,classname,wrapper);

     pb.update(pos); 0 <= pos <= 100

   *******************************************************************************/
   $.ProgressBar = function(to,classname,wrapper)
   {
     if(!(this instanceof $.ProgressBar))
       return new $.ProgressBar(to,classname,wrapper);

     if(!to)
       to = document.body;

     var classnames = ['progress-bar'];
     if(classname)
     {
       switch($.type(classname))
       {
         case 'string':
           classnames.push(classname);
           break;
         case 'array':
           $.merge(classnames,classname);
           break;
       }
     }

     this.$ = $('<div />')
       .addClass('progress-wrap')
       .appendTo(to);

     $('<div />')
       .addClass(classnames.join(' '))
       .append($('<span />').addClass('bar').append($('<span />').text('0%')))
       .appendTo(this.$);

     if(wrapper)
     {
       if($.type(wrapper) === 'string')
         wrapper = $(wrapper);

       wrapper.appendTo(to).append(this.$)
     }
   };

   $.ProgressBar.prototype = {
     update: function(percent)
     {
       if(percent <= 100 && percent >= 0)
       {
         this.count = percent;
         percent += '%';
         this.$.find('.bar')
           .css('width',percent)
           .find('> span')
           .text(percent);
       }

       return this;
     },

     count: function()
     {
       return this.count;
     },

     reset: function()
     {
       return this.update(0);
     },

     remove: function()
     {
       this.$.empty().remove();
       delete this;
     }
   };

   /*******************************************************************************

     Block UI for waiting async 
       promise: $.deferred object or promise object
       cb: initializing function
       handlers: handler for overlay pass to $.Overlay constructor

   *******************************************************************************/
   $.Blocking = function(promise,cb,handlers)
   {
     if(!(this instanceof $.Blocking))
       return new $.Blocking(promise,cb,handlers);

     this.overlay = $.Overlay(handlers);

     // default callback
     if(!cb || !$.isFunction(cb))
       cb = function() {
         var $spinner = $('<div>').addClass('d-flex justify-content-center');
         $('<div>').addClass('spinner-border text-warning').css({width: 64,height: 64}).attr({role:'status'}).appendTo($spinner);
         this.append($spinner);
       };

     cb.call(this.overlay);

     var _this = this;
     var waitUntil = CONFIG.get('waitUntilBlocking');
     if(waitUntil > 0)
       this.timeoutID = window.setTimeout(function() {
         _this.block();
       },waitUntil);
     else
       this.block();

     this.attach(promise);
   };

   $.Blocking.prototype = {
     block: function() {
       this.overlay.show();

       //非同期ブロックのタイムアウト秒を設定
       let blockingTimeout = CONFIG.get('blockingTimeout');
       if(blockingTimeout > 0)
       {
         this.blockingTimoutID = window.setTimeout((function(blocking) {
           return function() {
             blocking.release();
           };
         })(this),blockingTimeout);
       }

       return this;
     },

     release: function() {
       if(this.timeoutID)
       {
         window.clearTimeout(this.timeoutID);
         this.timeoutID = null;
       }
       if(this.blockingTimoutID)
       {
         window.clearTimeout(this.blockingTimoutID);
         this.blockingTimoutID = null;
       }

       this.overlay.hide();
       return this;
     },

     attach: function(promise) {
       promise.then(
         (function(blocking)
           { 
             return function() {
               blocking.release();
             }; 
           }
         )(this),
         (function(blocking)
           {
             return function() {
               alert(TEXT.get('blockingFailMessage'));
               blocking.release();
             };
           }
         )(this)
       );

       return promise;
     }
   };

   /*******************************************************************************

     Block UI for waiting async 
       promises: array of $.deferred object or promise object
       callback: invoke when all promises done

   *******************************************************************************/
   $.Blockings = function(promises,overlay)
   {
     if(!overlay)
     {
       overlay = $.Overlay();
       var $spinner = $('<div>').addClass('d-flex justify-content-center');
       $('<div>').addClass('spinner-border text-warning').css({width: 84,height: 84}).attr({role:'status'}).appendTo($spinner);
       overlay.append($spinner);
     }

     var timeoutID = null;
     var waitUntil = CONFIG.get('waitUntilBlocking');
     if(waitUntil > 0)
       timeoutID = window.setTimeout(function() {
         overlay.show();
         timeoutID = null;
       },waitUntil);

     return $.when.apply(null,promises).done(function() {
       if(timeoutID)
       {
         window.clearTimeout(timeoutID);
         timeoutID = null;
       }
       overlay.hide();
     });
   };

   /*******************************************************************************

     Attach HTML element to jQuery.on method
     ( data-trigger-event,data-event-handler,data-parameter )

   *******************************************************************************/
   $.attach = function(ns) {

     $(function() {
       $('[data-trigger-event]').each(function() {
         var $el = $(this);
         var event_name = $el.data('trigger-event');
         var event_handler = $el.data('event-handler')
         var event_selector = $el.data('event-selector');

         var parameter = $el.data('parameter'); 
         var param = null;
         if(parameter.length > 0)
           eval('param = ' + parameter);

         if(event_handler in ns)
         {
           if(event_selector)
           {
             if(param)
               $el.on(event_name,event_selector,param,ns[event_handler]);
             else
               $el.on(event_name,event_selector,ns[event_handler]);
           }
           else
           {
             if(param)
               $el.on(event_name,param,ns[event_handler]);
             else
               $el.on(event_name,ns[event_handler]);
           }
         }
       });
     });
   };

   let enterNextInternal = function(setting)
   {
     let selectors = setting.selectors.join(',');
     let $controls = $(selectors,this);
     let lastIndex = $controls.length - 1;
     let onKeyDown =  function(ev) 
     {
       if(this.tagName.match(/(?:input|select)/i) && ev.keyCode == 13)
       {
         let currentIndex = $controls.index(this);
         let nextIndex = currentIndex + 1;
         if(currentIndex == lastIndex)
           nextIndex = 0;

         let nextObject = $controls.get(nextIndex);
         nextObject.focus();
         if('select' in nextObject && $.isFunction(nextObject.select))
           nextObject.select();
       }
     };

     $(this).off('.enterNext').on('keydown.enterNext',selectors,onKeyDown);
   };
   
   $.fn.enterNext = function(options)
   {
     return this.each(function() {
       enterNextInternal.call(this,$.extend(true,{},CONFIG.get('enterNext'),options)); 
     });
   };

   let validity = function(message)
   {
     if(message.length == 0)
       message = CONFING.get('validity').message;

     $(this)
       .on('invalid',function(ev) {
         if(this.validity.valueMissing || this.validity.patternMismatch || this.validity.typeMismatch)
         {
           this.setCustomValidity(message);
         }
         else
         {
           this.setCustomValidity('');
           ev.preventDefault();
         }
       })
      .on('input',function(ev) {
        this.setCustomValidity('');
      });
   };
   
   //plugin body
   $.fn.validity = function(message)
   {
     return this.each(function () {
       validity.call(this, message);
     });
   };

 })(jQuery);

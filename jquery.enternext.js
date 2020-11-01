/******************************************************************
 Title : move focus with enter key
 All Written by K.Nakagawa (nakagawa@mars.dti.ne.jp)

*******************************************************************/
;
(function($,undefined)
 {
   $.enterNext =
     {
       config:
         {
           selectors: [
             'input[type="text"]',
             'input[type="tel"]',
             'input[type="password"]',
             'input[type="email"]',
             'input[type="number"]',
             'select',
             'textarea'
           ]
         }
     };

   var enterNextInternal = function(setting)
   {
     var selectors = setting.selectors.join(',');
     var $controls = $(selectors,this);
     var lastIndex = $controls.length - 1;
     var onKeyDown =  function(ev) 
     {
       if(this.tagName.match(/(?:input|select)/i) && ev.keyCode == 13)
       {
         var currentIndex = $controls.index(this);
         var nextIndex = currentIndex + 1;
         if(currentIndex == lastIndex)
           nextIndex = 0;

         var nextObject = $controls.get(nextIndex);
         nextObject.focus();
         if('select' in nextObject && $.isFunction(nextObject.select))
           nextObject.select();
       }
     };
     $(this).off('.enterNext').on('keydown.enterNext',selectors,onKeyDown);
   };
   
   $.fn.enterNext = function(options)
   {
     return this.each( function() { enterNextInternal.call(this,$.extend(true,{},$.enterNext.config,options)); });
   };
   
 })(jQuery);
 

/******************************************************************
  入力必須の際のエラーメッセージをカスタマイズします。
*******************************************************************/
;
(function($,undefined)
 {
   $.validityMessage = 'この項目は入力必須です。';

   var validity = function(message)
   {
     if(message.length == 0)
       message = $.validityMessage;

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
       return this.each(function()
                        {
                          validity.call(this,message);
                        });
     };
   
 })(jQuery);
 

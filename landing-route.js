/* Keep previously shared profile and navigation links working. */
(function(){
 const url=new URL(window.location.href);
 if(url.searchParams.has('employee')||['#directory','#Departments','#Groups','#About','#Contact'].includes(url.hash)){
  window.location.replace('directory.html'+url.search+url.hash);
 }
})();

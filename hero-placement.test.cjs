const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
test('home contains only the full-page search hero and Directory retains its own searches',()=>{
 const h=new JSDOM(fs.readFileSync('index.html','utf8')).window.document;
 const d=new JSDOM(fs.readFileSync('directory.html','utf8')).window.document;
 assert.equal(h.querySelector('header,footer,.statistics-section,#employee-list'),null);
 assert.equal(h.querySelectorAll('body>section').length,1);
 assert.equal(h.querySelector('.people-hero').hidden,false);
 assert.equal(h.querySelector('.people-hero-action').getAttribute('href'),'directory.html#directory');
 assert.equal(d.querySelector('.people-hero'),null);
 assert.ok(d.getElementById('header-search-input'));assert.ok(d.getElementById('header-directory-search'));assert.ok(d.getElementById('search'));
 assert.equal(new JSDOM(fs.readFileSync('admin.html','utf8')).window.document.querySelector('.people-hero'),null);
});

test('legacy profile links keep their target while the root remains the hero',()=>{
 const vm=require('node:vm'),source=fs.readFileSync('landing-route.js','utf8');
 for(const [url,expected]of [['https://example.com/index.html',''],['https://example.com/index.html?employee=abc#directory','directory.html?employee=abc#directory'],['https://example.com/#Departments','directory.html#Departments']]){
  let target='';vm.runInNewContext(source,{URL,window:{location:{href:url,replace:value=>target=value}}});assert.equal(target,expected);
 }
});

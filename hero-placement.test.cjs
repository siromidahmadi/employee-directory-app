const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
test('the public hero is the first Directory section and admin no longer has a duplicate',()=>{
 const d=new JSDOM(fs.readFileSync('index.html','utf8')).window.document;
 const a=new JSDOM(fs.readFileSync('admin.html','utf8')).window.document;
 assert.equal(d.querySelector('[data-page="directory"]:is(section)').id,'directory');
 assert.equal(d.querySelector('.people-hero').hidden,false);
 assert.equal(d.querySelectorAll('input[type="search"]').length,2); // One people search and the separate team filter.
 assert.equal(d.querySelector('#spotlight-search').closest('.people-hero').id,'directory');
 assert.equal(a.querySelector('.people-hero'),null);
 assert.ok(a.querySelector('#login-form'));assert.ok(a.querySelector('#employee-form'));
 assert.equal(a.querySelector('script[src^="hero-visibility.js"]'),null);
});

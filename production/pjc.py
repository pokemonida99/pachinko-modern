import sys,json,re
name=sys.argv[1]
B='/Users/hermes/Public/0720/pachinko-modern/production/'
txt=open(B+f'prompts/{name}.txt',encoding='utf-8').read()
i=txt.index('detailed_description:\n')+len('detailed_description:\n'); j=txt.index('[Shot 1]')
pre=txt[i:j]
if len(sys.argv)>=3 and sys.argv[2]=='set':
    open(B+'.pre','w',encoding='utf-8').write(pre)
    print("localStorage.setItem('PRE',"+json.dumps(pre,ensure_ascii=False)+");localStorage.PRE.length"); sys.exit()
std=open(B+'.pre',encoding='utf-8').read()
tail=lambda s:json.dumps(s,ensure_ascii=False)
if pre==std:
    head=txt[:i]; rest=txt[j:]
    js="const PRE=localStorage.PRE;const ta=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(ta,"+tail(head)+"+PRE+"+tail(rest)+");"
else:
    js="const ta=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(ta,"+tail(txt)+");"
js+="ta.dispatchEvent(new Event('input',{bubbles:true}));[ta.value.length,"+str(len(txt))+",[...document.querySelectorAll('[role=switch]')].map(b=>b.getAttribute('aria-checked')).join(','),[...document.querySelectorAll('input[type=number]')].map(i=>i.value).join(','),(document.body.innerText.match(/\\d+:\\d+ \\((Widescreen|Portrait Widescreen|Square)\\)/)||[])[0]]"
print(js)
